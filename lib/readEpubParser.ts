import { unzipSync, strFromU8 } from "fflate";

export type ParsedEpub = {
  title: string;
  author: string;
  /** 拼接后的整本文本 */
  text: string;
  /** 原始章节数（spine 长度） */
  chapterCount: number;
};

/* ---------- 工具 ---------- */

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0\u3000]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(html: string): string {
  if (typeof window === "undefined") {
    return normalizeWhitespace(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
    );
  }

  const parser = new DOMParser();

  /* 先按 XHTML 严格模式 */
  let doc = parser.parseFromString(
    html,
    "application/xhtml+xml"
  );

  if (doc.querySelector("parsererror")) {
    /* 回退到 HTML 宽松模式 */
    doc = parser.parseFromString(html, "text/html");
  }

  doc
    .querySelectorAll("script, style")
    .forEach((el) => el.remove());

  return normalizeWhitespace(doc.body?.textContent ?? "");
}

function resolvePath(base: string, relative: string): string {
  if (relative.startsWith("/")) return relative.slice(1);

  const parts = base.split("/");
  parts.pop();

  const relParts = relative.split("/");
  for (const seg of relParts) {
    if (seg === "..") parts.pop();
    else if (seg === "." || seg === "") continue;
    else parts.push(seg);
  }
  return parts.join("/");
}

function extractMetadata(opfXml: string): {
  title: string;
  author: string;
} {
  if (typeof window === "undefined") {
    const tm = opfXml.match(
      /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i
    );
    const cm = opfXml.match(
      /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i
    );
    return {
      title: (tm?.[1] ?? "").trim(),
      author: (cm?.[1] ?? "").trim(),
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      opfXml,
      "application/xml"
    );

    /* 忽略 namespace 前缀：用 localName 匹配 */
    const titleEl = doc.getElementsByTagNameNS(
      "*",
      "title"
    )[0];
    const creatorEl = doc.getElementsByTagNameNS(
      "*",
      "creator"
    )[0];

    return {
      title: titleEl?.textContent?.trim() ?? "",
      author: creatorEl?.textContent?.trim() ?? "",
    };
  } catch {
    return { title: "", author: "" };
  }
}

function extractSpine(
  opfXml: string
): { id: string; href: string }[] {
  if (typeof window === "undefined") return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      opfXml,
      "application/xml"
    );

    /* manifest: id → href（只收 html） */
    const manifest = new Map<string, string>();
    const items = doc.getElementsByTagNameNS("*", "item");
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const id = el.getAttribute("id");
      const href = el.getAttribute("href");
      const mediaType = el.getAttribute("media-type") ?? "";
      if (
        id &&
        href &&
        (mediaType.includes("html") ||
          mediaType.includes("xml"))
      ) {
        manifest.set(id, href);
      }
    }

    const spineEl = doc.getElementsByTagNameNS(
      "*",
      "spine"
    )[0];
    if (!spineEl) return [];

    const result: { id: string; href: string }[] = [];
    const itemrefs = spineEl.getElementsByTagNameNS(
      "*",
      "itemref"
    );
    for (let i = 0; i < itemrefs.length; i++) {
      const idref = itemrefs[i].getAttribute("idref");
      if (!idref) continue;
      const href = manifest.get(idref);
      if (href) result.push({ id: idref, href });
    }
    return result;
  } catch {
    return [];
  }
}

/* ---------- 主入口 ---------- */

export async function parseEpub(
  file: File
): Promise<ParsedEpub> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buffer);
  } catch {
    throw new Error("EPUB 解压失败，文件可能损坏。");
  }

  /* 1. container.xml */
  const containerBytes = files["META-INF/container.xml"];
  if (!containerBytes) {
    throw new Error(
      "不是有效的 EPUB：缺少 container.xml。"
    );
  }
  const containerStr = strFromU8(containerBytes);
  const opfPathMatch = containerStr.match(
    /full-path="([^"]+)"/
  );
  if (!opfPathMatch) {
    throw new Error(
      "不是有效的 EPUB：找不到 OPF 路径。"
    );
  }
  const opfPath = opfPathMatch[1];
  const opfBytes = files[opfPath];
  if (!opfBytes) {
    throw new Error(
      "不是有效的 EPUB：找不到 OPF 文件。"
    );
  }
  const opfXml = strFromU8(opfBytes);

  /* 2. metadata */
  const { title, author } = extractMetadata(opfXml);

  /* 3. spine */
  const spine = extractSpine(opfXml);
  if (spine.length === 0) {
    throw new Error("EPUB 里没有找到章节。");
  }

  /* 4. 逐章抽纯文本 */
  const parts: string[] = [];
  for (const item of spine) {
    const fullPath = resolvePath(opfPath, item.href);
    const bytes = files[fullPath];
    if (!bytes) continue;

    const html = strFromU8(bytes);
    const plain = stripHtml(html);
    if (!plain) continue;

    parts.push(plain);
  }

  if (parts.length === 0) {
    throw new Error("EPUB 解出来是空的。");
  }

  /* 章节之间三换行，给分章正则留空间 */
  const text = parts.join("\n\n\n");

  return {
    title:
      title || file.name.replace(/\.epub$/i, ""),
    author,
    text,
    chapterCount: parts.length,
  };
}