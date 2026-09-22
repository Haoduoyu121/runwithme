/**
 * Read 分页器
 * 把一章正文按视口尺寸切成 [{start, end}, ...] 页区间数组。
 * 原理：离屏测量容器 + 二分查找，找到每页能装下的最大字符数。
 */

export type PageRange = {
  start: number;
  end: number;
};

export type PaginateOptions = {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  title: string;
};

export function paginateChapter(
  opts: PaginateOptions
): PageRange[] {
  const {
    text,
    width,
    height,
    fontSize,
    lineHeight,
    fontFamily,
    title,
  } = opts;

  if (!text || width <= 0 || height <= 0) {
    return [{ start: 0, end: text.length }];
  }

  const host = document.createElement("div");
  host.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${width}px;
    visibility: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
    font-size: ${fontSize}px;
    line-height: ${lineHeight};
    font-family: ${fontFamily};
    margin: 0;
    padding: 0;
    border: 0;
  `;
  document.body.appendChild(host);

  try {
    let titleH = 0;
    if (title) {
      host.style.height = "auto";
      host.textContent = title;
      titleH = host.scrollHeight;
    }

    const pages: PageRange[] = [];
    const N = text.length;
    let cursor = 0;
    let firstPage = true;

    while (cursor < N) {
      const availH = firstPage
        ? Math.max(40, height - titleH)
        : height;
      host.style.height = `${availH}px`;

      let lo = cursor;
      let hi = N;
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        host.textContent = text.slice(cursor, mid);
        if (host.scrollHeight <= availH) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }

      if (lo <= cursor) lo = cursor + 1;
      pages.push({ start: cursor, end: lo });
      cursor = lo;
      firstPage = false;

      if (pages.length > 5000) break;
    }

    if (pages.length === 0) pages.push({ start: 0, end: N });
    return pages;
  } finally {
    document.body.removeChild(host);
  }
}