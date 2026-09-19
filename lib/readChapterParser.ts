import type { ReadChapter } from "@/data/read";

const CN_CHAPTER_RE =
  /^[ \t\u3000]*(?:第\s*[一二三四五六七八九十百千零〇0-9]+\s*[章回节篇]|序章|楔子|尾声|后记|番外)[^\n]*$/;

const CN_VOLUME_RE =
  /^[ \t\u3000]*第\s*[一二三四五六七八九十百千零〇0-9]+\s*[卷部][^\n]*$/;

const EN_CHAPTER_RE =
  /^[ \t]*Chapter\s+(?:\d+|[IVXLCDM]+)\b[^\n]*$/i;

/** 无章节标记时的切块大小（字符数） */
const FALLBACK_CHUNK = 3500;

/**
 * 把整本书按章节解析。
 * - 找到 ≥2 个章节标记 → 按标记分
 * - 否则 → 按字数切块
 */
export function parseChapters(text: string): ReadChapter[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const marks: { index: number; title: string }[] = [];

  let offset = 0;
  for (const line of lines) {
    if (line.length > 0 && line.length < 80) {
      if (
        CN_CHAPTER_RE.test(line) ||
        CN_VOLUME_RE.test(line) ||
        EN_CHAPTER_RE.test(line)
      ) {
        marks.push({ index: offset, title: line.trim() });
      }
    }
    offset += line.length + 1; // 换行符也占位
  }

  if (marks.length >= 2) {
    const chapters: ReadChapter[] = [];

    /* 标记之前的内容（目录 / 序言 / 书名页）并入"开篇" */
    if (marks[0].index > 0) {
      chapters.push({
        index: 0,
        title: "开篇",
        start: 0,
        end: marks[0].index,
      });
    }

    for (let i = 0; i < marks.length; i++) {
      const start = marks[i].index;
      const end =
        i < marks.length - 1
          ? marks[i + 1].index
          : text.length;
      chapters.push({
        index: chapters.length,
        title: marks[i].title,
        start,
        end,
      });
    }

    return chapters;
  }

  /* fallback：按字数切 */
  const chapters: ReadChapter[] = [];
  for (let i = 0; i < text.length; i += FALLBACK_CHUNK) {
    chapters.push({
      index: chapters.length,
      title: `第 ${chapters.length + 1} 部分`,
      start: i,
      end: Math.min(text.length, i + FALLBACK_CHUNK),
    });
  }
  return chapters;
}

export function getChapterText(
  text: string,
  chapter: ReadChapter
): string {
  return text.slice(chapter.start, chapter.end).trim();
}