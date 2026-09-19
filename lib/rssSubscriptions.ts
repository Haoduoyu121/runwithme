import { commitBook } from "@/lib/readCommit";
import { fetchHtml } from "@/lib/proxyFetch";
import { parseFeed, type FeedItem } from "@/lib/rssParser";
import {
  loadLibrary,
  upsertBook,
} from "@/lib/readLibraryStorage";
import {
  getBookText,
  saveBookText,
} from "@/lib/readBookFiles";

const SUBS_KEY = "runwithme_read_rss_subs_v1";

export type RssSubscription = {
  id: string;
  title: string;
  url: string;
  addedAt: number;
  lastFetchedAt: number;
  /** 累积成的本地书的 id（首次拉取后设置） */
  bookId: string | null;
  /** 已累积的 item id 集合，用于去重 */
  seenItemIds: string[];
};

function createId(): string {
  return `rss-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isValid(raw: unknown): raw is RssSubscription {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.url === "string" &&
    typeof o.addedAt === "number"
  );
}

export function loadSubscriptions(): RssSubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid).sort(
      (a, b) =>
        (b.lastFetchedAt || b.addedAt) -
        (a.lastFetchedAt || a.addedAt)
    );
  } catch (e) {
    console.error("[rssSubscriptions] 加载失败:", e);
    return [];
  }
}

function persist(list: RssSubscription[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      SUBS_KEY,
      JSON.stringify(list)
    );
    return true;
  } catch (e) {
    console.error("[rssSubscriptions] 保存失败:", e);
    return false;
  }
}

export function getSubscription(
  id: string
): RssSubscription | null {
  return (
    loadSubscriptions().find((s) => s.id === id) ?? null
  );
}

export function saveSubscription(
  sub: RssSubscription
): void {
  const list = loadSubscriptions();
  const idx = list.findIndex((s) => s.id === sub.id);
  const next =
    idx >= 0
      ? list.map((s, i) => (i === idx ? sub : s))
      : [...list, sub];
  persist(next);
}

export function removeSubscription(id: string): void {
  const next = loadSubscriptions().filter(
    (s) => s.id !== id
  );
  persist(next);
}

/* ---------- 添加订阅：先拉一次验证，再保存 ---------- */

export async function addSubscription(url: string): Promise<{
  sub: RssSubscription;
  initialItemCount: number;
}> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("请填写 RSS 链接");

  const fetched = await fetchHtml(trimmed);
  const feed = parseFeed(fetched.html);

  if (feed.items.length === 0) {
    throw new Error(
      "这个 feed 里没有内容（可能是空源或被拦截）"
    );
  }

  const now = Date.now();
  const sub: RssSubscription = {
    id: createId(),
    title: feed.title || "未命名订阅",
    url: trimmed,
    addedAt: now,
    lastFetchedAt: 0,
    bookId: null,
    seenItemIds: [],
  };

  saveSubscription(sub);

  return {
    sub,
    initialItemCount: feed.items.length,
  };
}

/* ---------- 累积 ---------- */

export type AccumulateResult = {
  added: number;
  bookId: string | null;
  tookMs: number;
};

function buildTextFromItems(items: FeedItem[]): string {
  return items
    .map((it) => {
      const title = it.title || "（无标题）";
      const content = it.content || "（此条目无正文）";
      return `${title}\n\n${content}`;
    })
    .join("\n\n\n");
}

export async function accumulateSubscription(
  subId: string
): Promise<AccumulateResult> {
  const sub = getSubscription(subId);
  if (!sub) throw new Error("订阅不存在");

  const t0 = Date.now();

  const fetched = await fetchHtml(sub.url);
  const feed = parseFeed(fetched.html);

  const seen = new Set(sub.seenItemIds);
  const newItems = feed.items.filter(
    (it) => !seen.has(it.id)
  );

  newItems.sort((a, b) => {
    if (a.pubDate && b.pubDate) {
      return a.pubDate - b.pubDate;
    }
    return 0;
  });

  sub.title = feed.title || sub.title;
  sub.lastFetchedAt = Date.now();

  if (sub.bookId) {
    const exists = loadLibrary().some(
      (b) => b.id === sub.bookId
    );
    if (!exists) {
      sub.bookId = null;
      sub.seenItemIds = [];
    }
  }

  if (newItems.length === 0) {
    saveSubscription(sub);
    return {
      added: 0,
      bookId: sub.bookId,
      tookMs: Date.now() - t0,
    };
  }

  const newText = buildTextFromItems(newItems);

  if (sub.bookId) {
    const oldText = (await getBookText(sub.bookId)) ?? "";
    const fullText = oldText
      ? `${oldText}\n\n\n${newText}`
      : newText;
    await saveBookText(sub.bookId, fullText);

    const book = loadLibrary().find(
      (b) => b.id === sub.bookId
    );
    if (book) {
      upsertBook({
        ...book,
        charCount: fullText.length,
      });
    }
  } else {
    const id = await commitBook(newText, {
      title: sub.title,
      author: "",
      source: "rss",
      sourceUrl: sub.url,
    });
    sub.bookId = id;
  }

  sub.seenItemIds = [
    ...sub.seenItemIds,
    ...newItems.map((it) => it.id),
  ];
  saveSubscription(sub);

  return {
    added: newItems.length,
    bookId: sub.bookId,
    tookMs: Date.now() - t0,
  };
}