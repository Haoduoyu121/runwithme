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
  /** 章节标题，仅占第一页顶部空间；传空字符串表示无标题 */
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
    // 测量标题高度（仅第一页扣减）
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

      // 二分查找这一页能装多少字符
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

      // 至少前进一个字符，防止死循环
      if (lo <= cursor) lo = cursor + 1;
      pages.push({ start: cursor, end: lo });
      cursor = lo;
      firstPage = false;

      // 保险：页数上限（避免极端情况卡死）
      if (pages.length > 5000) break;
    }

    if (pages.length === 0) pages.push({ start: 0, end: N });
    return pages;
  } finally {
    document.body.removeChild(host);
  }
}