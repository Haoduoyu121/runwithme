/**
 * OPDS 1.0 解析器
 *
 * OPDS 是 Atom 的扩展，结构：
 *   feed > entry
 *
 * entry 分两类：
 *   - nav  （link rel="subsection"）→ 还有下一层
 *   - book （link rel="http://opds-spec.org/acquisition*"）→ 可下载
 *
 * 输出统一结构，UI 只认 kind。
 */

export type OpdsEntry = {
  id: string;
  title: string;
  author: string;
  summary: string;
  coverUrl: string;
  kind: "nav" | "book";
  /** kind === "nav" 时，下一层的 URL */
  navUrl?: string;
  /** kind === "book" 时，下载 URL */
  downloadUrl?: string;
  /** 下载 MIME（application/epub+zip / text/plain / …） */
  downloadMime?: string;
  updated: number;
};

export type ParsedOpdsFeed = {
  title: string;
  entries: OpdsEntry[];
};

/* ---------- 工具 ---------- */

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
    return (doc.body?.textContent ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return raw.replace(/<[^>]+>/g, "").trim();
  }
}

function resolveHref(
  href: string | null,
  base: string
): string {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/* ---------- entry 解析 ---------- */

function parseEntry(
  el: Element,
  feedBaseUrl: string
): OpdsEntry | null {
  const title = textOf(findFirst(el, "title"));
  if (!title) return null;

  const idText = textOf(findFirst(el, "id"));
  const authorName = textOf(findFirst(el, "name"));
  const summary = stripHtml(
    textOf(findFirst(el, "summary")) ||
      textOf(findFirst(el, "content"))
  );
  const updated = parseDate(
    textOf(findFirst(el, "updated"))
  );

  let navUrl = "";
  let downloadUrl = "";
  let downloadMime = "";
  let coverUrl = "";

const links = el.getElementsByTagNameNS("*", "link");
for (let i = 0; i < links.length; i++) {
  const l = links[i];
  const rel = l.getAttribute("rel") || "";
  const href = resolveHref(
    l.getAttribute("href"),
    feedBaseUrl
  );
  const type = l.getAttribute("type") || "";

  // ★ 兼容 ManyBooks：没有 rel 属性但 type 是 atom+xml 的导航链接
  if (
    !rel &&
    (type.includes("application/atom+xml") ||
      type.includes("application/opds+json"))
  ) {
    if (!navUrl) navUrl = href;
    continue;
  }

  if (
    rel === "subsection" ||
    rel === "http://opds-spec.org/sort/new" ||
    rel === "http://opds-spec.org/sort/popular" ||
    rel === "http://opds-spec.org/sort/random" ||
    rel === "http://opds-spec.org/crawlable"
  ) {
    if (!navUrl) navUrl = href;
  } else if (
      rel.startsWith(
        "http://opds-spec.org/acquisition"
      )
    ) {
      /* 优先 epub，其次 txt */
      const isEpub = type.includes("epub");
      const isTxt =
        type.includes("text/plain") ||
        type.includes("text/html");

      if (
        !downloadUrl ||
        isEpub ||
        (isTxt && !downloadUrl)
      ) {
        if (isEpub || isTxt || !downloadUrl) {
          downloadUrl = href;
          downloadMime = type;
        }
      }
    } else if (
      rel === "http://opds-spec.org/image" ||
      rel === "http://opds-spec.org/image/thumbnail"
    ) {
      if (!coverUrl) coverUrl = href;
    } else if (
      rel === "alternate" &&
      !navUrl &&
      !downloadUrl &&
      (type.includes("atom") || type.includes("xml"))
    ) {
      /* 有些 OPDS 用 alternate 指向下一层 */
      navUrl = href;
    }
  }

  let kind: "nav" | "book" = "nav";
  if (downloadUrl) {
    kind = "book";
  } else if (!navUrl) {
    /* 两个都没有：无法处理，丢弃 */
    return null;
  }

  return {
    id: idText || title,
    title,
    author: authorName,
    summary,
    coverUrl,
    kind,
    navUrl: navUrl || undefined,
    downloadUrl: downloadUrl || undefined,
    downloadMime: downloadMime || undefined,
    updated,
  };
}

/* ---------- 主入口 ---------- */

export function parseOpds(
  xml: string,
  feedBaseUrl: string
): ParsedOpdsFeed {
  if (typeof window === "undefined") {
    throw new Error("OPDS 解析需要浏览器环境");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    xml,
    "application/xml"
  );

  if (doc.querySelector("parsererror")) {
    throw new Error("XML 解析失败");
  }

  const feedEl = doc.querySelector("feed");
  if (!feedEl) {
    throw new Error("不是有效的 OPDS（缺少 feed）");
  }

  const feedTitle = textOf(findFirst(feedEl, "title"));

  const entryEls = feedEl.getElementsByTagNameNS(
    "*",
    "entry"
  );
  const entries: OpdsEntry[] = [];
  for (let i = 0; i < entryEls.length; i++) {
    const entry = parseEntry(entryEls[i], feedBaseUrl);
    if (entry) entries.push(entry);
  }

  return {
    title: feedTitle || "OPDS",
    entries,
  };
}