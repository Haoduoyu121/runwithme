/**
 * RSS 2.0 / Atom 1.0 解析器
 *
 * - 用原生 DOMParser 解析 XML
 * - 忽略 namespace，用 localName 匹配
 * - 统一输出 FeedItem[]
 */

export type FeedItem = {
  /** 去重用的稳定 id（guid > link > title） */
  id: string;
  title: string;
  link: string;
  /** 毫秒时间戳，无法解析时为 0 */
  pubDate: number;
  /** 纯文本正文（HTML 已剥离） */
  content: string;
};

export type ParsedFeed = {
  type: "rss" | "atom";
  title: string;
  link: string;
  description: string;
  items: FeedItem[];
};

/* ---------- 工具 ---------- */

function stripHtml(raw: string): string {
  if (!raw) return "";
  if (typeof window === "undefined") {
    return raw.replace(/<[^>]+>/g, "").trim();
  }
  try {
    const doc = new DOMParser().parseFromString(
      `<div>${raw}</div>`,
      "text/html"
    );
    const text = doc.body?.textContent ?? "";
    return text
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return raw.replace(/<[^>]+>/g, "").trim();
  }
}

function textOf(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

function findFirst(
  parent: Element,
  localName: string
): Element | null {
  const list = parent.getElementsByTagNameNS(
    "*",
    localName
  );
  return list.length > 0 ? list[0] : null;
}

function parseDate(raw: string): number {
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/* ---------- RSS 2.0 ---------- */

function parseRss(doc: Document): ParsedFeed {
  const channel = doc.querySelector("channel");
  const items: FeedItem[] = [];

  if (!channel) {
    return {
      type: "rss",
      title: "",
      link: "",
      description: "",
      items: [],
    };
  }

  const feedTitle = textOf(findFirst(channel, "title"));
  const feedLink = textOf(findFirst(channel, "link"));
  const feedDesc = stripHtml(
    textOf(findFirst(channel, "description"))
  );

  const itemEls = channel.getElementsByTagNameNS(
    "*",
    "item"
  );

  for (let i = 0; i < itemEls.length; i++) {
    const el = itemEls[i];
    const title = textOf(findFirst(el, "title")) || "（无标题）";
    const link = textOf(findFirst(el, "link"));
    const guid = textOf(findFirst(el, "guid"));
    const id = guid || link || `${title}-${i}`;

    const pubRaw =
      textOf(findFirst(el, "pubDate")) ||
      textOf(findFirst(el, "date"));
    const pubDate = parseDate(pubRaw);

    /* content:encoded 优先，其次 description */
    const encoded = findFirst(el, "encoded");
    const desc = findFirst(el, "description");
    const rawContent =
      encoded?.textContent ??
      desc?.textContent ??
      "";
    const content = stripHtml(rawContent);

    items.push({
      id,
      title,
      link,
      pubDate,
      content,
    });
  }

  return {
    type: "rss",
    title: feedTitle || "未命名订阅",
    link: feedLink,
    description: feedDesc,
    items,
  };
}

/* ---------- Atom ---------- */

function parseAtom(doc: Document): ParsedFeed {
  const feedEl = doc.querySelector("feed");
  const items: FeedItem[] = [];

  if (!feedEl) {
    return {
      type: "atom",
      title: "",
      link: "",
      description: "",
      items: [],
    };
  }

  const feedTitle = textOf(findFirst(feedEl, "title"));
  const feedSubtitle = textOf(
    findFirst(feedEl, "subtitle")
  );

  /* feed link：优先 rel="alternate" */
  let feedLink = "";
  const feedLinks = feedEl.getElementsByTagNameNS(
    "*",
    "link"
  );
  for (let i = 0; i < feedLinks.length; i++) {
    const l = feedLinks[i];
    const rel = l.getAttribute("rel") || "alternate";
    if (rel === "alternate") {
      feedLink = l.getAttribute("href") || "";
      break;
    }
  }
  if (!feedLink && feedLinks.length > 0) {
    feedLink = feedLinks[0].getAttribute("href") || "";
  }

  const entryEls = feedEl.getElementsByTagNameNS(
    "*",
    "entry"
  );

  for (let i = 0; i < entryEls.length; i++) {
    const el = entryEls[i];
    const title = textOf(findFirst(el, "title")) || "（无标题）";

    /* entry link */
    let link = "";
    const links = el.getElementsByTagNameNS("*", "link");
    for (let j = 0; j < links.length; j++) {
      const l = links[j];
      const rel = l.getAttribute("rel") || "alternate";
      if (rel === "alternate") {
        link = l.getAttribute("href") || "";
        break;
      }
    }
    if (!link && links.length > 0) {
      link = links[0].getAttribute("href") || "";
    }

    const idText = textOf(findFirst(el, "id"));
    const id = idText || link || `${title}-${i}`;

    const pubRaw =
      textOf(findFirst(el, "published")) ||
      textOf(findFirst(el, "updated"));
    const pubDate = parseDate(pubRaw);

    /* content 优先，其次 summary */
    const contentEl = findFirst(el, "content");
    const summaryEl = findFirst(el, "summary");
    const rawContent =
      contentEl?.textContent ??
      summaryEl?.textContent ??
      "";
    const content = stripHtml(rawContent);

    items.push({
      id,
      title,
      link,
      pubDate,
      content,
    });
  }

  return {
    type: "atom",
    title: feedTitle || "未命名订阅",
    link: feedLink,
    description: feedSubtitle,
    items,
  };
}

/* ---------- 主入口 ---------- */

export function parseFeed(xml: string): ParsedFeed {
  if (typeof window === "undefined") {
    throw new Error("RSS 解析需要浏览器环境");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    xml,
    "application/xml"
  );

  if (doc.querySelector("parsererror")) {
    throw new Error("XML 解析失败，不是有效的 feed");
  }

  if (doc.querySelector("feed")) {
    return parseAtom(doc);
  }
  if (doc.querySelector("rss") || doc.querySelector("channel")) {
    return parseRss(doc);
  }

  /* 有些站返回 RDF，也当 RSS 处理 */
  if (doc.querySelector("RDF")) {
    return parseRss(doc);
  }

  throw new Error("无法识别的 feed 格式");
}