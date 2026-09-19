/**
 * Read · 高亮 / 笔记 存储 + 渲染工具
 *
 * 存 localStorage: runwithme_read_highlights_v1
 * 结构：Record<bookId, Highlight[]>
 *
 * offset 语义：相对「章节纯文本」的字符偏移（与字号 / 行距无关）
 */

export type HighlightKind = "highlight" | "note";

export type HighlightAuthor = "user" | "levi" | "erwin";

export type Highlight = {
  id: string;
  bookId: string;
  chapterIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  note?: string;
  kind: HighlightKind;
  author: HighlightAuthor;
  createdAt: number;
};

const STORAGE_KEY = "runwithme_read_highlights_v1";

type Store = Record<string, Highlight[]>;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Store;
  } catch (e) {
    console.error("[readHighlights] 加载失败:", e);
    return {};
  }
}

function saveStore(s: Store): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(s)
    );
    return true;
  } catch (e) {
    console.error("[readHighlights] 保存失败:", e);
    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "高亮保存失败：本地存储空间已满。\n\n建议清理一些旧的高亮，或导出数据。"
      );
    }
    return false;
  }
}

export function createHighlightId(): string {
  return `hl-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function loadHighlights(
  bookId: string
): Highlight[] {
  const store = loadStore();
  const list = store[bookId] ?? [];
  return list.sort(
    (a, b) => a.createdAt - b.createdAt
  );
}

export function addHighlight(h: Highlight): Highlight[] {
  const store = loadStore();
  const list = store[h.bookId] ?? [];
  const next = [...list, h];
  store[h.bookId] = next;
  saveStore(store);
  return next;
}

export function updateHighlight(
  bookId: string,
  id: string,
  updates: Partial<Highlight>
): Highlight[] {
  const store = loadStore();
  const list = store[bookId] ?? [];
  const next = list.map((h) =>
    h.id === id ? { ...h, ...updates } : h
  );
  store[bookId] = next;
  saveStore(store);
  return next;
}

export function removeHighlight(
  bookId: string,
  id: string
): Highlight[] {
  const store = loadStore();
  const list = store[bookId] ?? [];
  const next = list.filter((h) => h.id !== id);
  store[bookId] = next;
  saveStore(store);
  return next;
}

export function clearBookHighlights(bookId: string): void {
  const store = loadStore();
  delete store[bookId];
  saveStore(store);
}

/* =========================================================
   工具：拿章节内字符 offset
   ========================================================= */

/**
 * 计算 node 在 root 内的纯文本 offset。
 * root 一般是包含章节正文的 div。
 */
export function getTextOffset(
  root: HTMLElement,
  node: Node,
  offsetInNode: number
): number {
  let total = 0;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) {
      return total + offsetInNode;
    }
    total += cur.textContent?.length ?? 0;
    cur = walker.nextNode();
  }
  return -1;
}

/* =========================================================
   工具：把章节文本 + 高亮区间渲染成 React 节点
   ========================================================= */

import type { ReactNode } from "react";

type RenderOptions = {
  text: string;
  highlights: Highlight[];
  onMarkClick?: (id: string) => void;
};

/**
 * 把一个纯文本按高亮区间切成碎片，被覆盖的区间用 <mark>。
 * 区间可以重叠，重叠部分合并显示（最先出现的那个高亮拥有重叠区）。
 */
export function renderHighlightedText(
  opts: RenderOptions,
  React: {
    createElement: (
      tag: string,
      props: Record<string, unknown>,
      ...children: ReactNode[]
    ) => ReactNode;
  }
): ReactNode[] {
  const { text, highlights, onMarkClick } = opts;

  if (highlights.length === 0) {
    return [text];
  }

  /* 排序 + 裁剪，防止重叠错误 */
  const sorted = [...highlights]
    .filter(
      (h) =>
        h.startOffset >= 0 &&
        h.endOffset > h.startOffset &&
        h.startOffset < text.length
    )
    .sort((a, b) => {
      if (a.startOffset !== b.startOffset) {
        return a.startOffset - b.startOffset;
      }
      return a.endOffset - b.endOffset;
    });

  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const h of sorted) {
    const start = Math.max(cursor, h.startOffset);
    const end = Math.min(text.length, h.endOffset);
    if (end <= start) continue;

    if (start > cursor) {
      out.push(text.slice(cursor, start));
    }

    out.push(
      React.createElement(
        "mark",
        {
          key: `hl-${h.id}-${key++}`,
          className:
            h.kind === "note"
              ? "read-hl read-hl-note"
              : "read-hl",
          "data-hl-id": h.id,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onMarkClick?.(h.id);
          },
        },
        text.slice(start, end)
      )
    );

    cursor = end;
  }

  if (cursor < text.length) {
    out.push(text.slice(cursor));
  }

  return out;
}