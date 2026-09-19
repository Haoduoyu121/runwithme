import type { ReadChapter } from "@/data/read";
import { parseChapters } from "./readChapterParser";

const KEY_PREFIX = "runwithme_read_chapters_v1:";

type CacheEntry = {
  chapters: ReadChapter[];
  textLength: number;
};

function cacheKey(bookId: string): string {
  return KEY_PREFIX + bookId;
}

export function getChapters(
  bookId: string,
  text: string
): ReadChapter[] {
  if (typeof window === "undefined") {
    return parseChapters(text);
  }

  const key = cacheKey(bookId);
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry;
      if (
        parsed &&
        parsed.textLength === text.length &&
        Array.isArray(parsed.chapters) &&
        parsed.chapters.length > 0
      ) {
        return parsed.chapters;
      }
    }
  } catch {}

  const chapters = parseChapters(text);
  try {
    const entry: CacheEntry = {
      chapters,
      textLength: text.length,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {}
  return chapters;
}

export function clearChaptersCache(bookId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKey(bookId));
  } catch {}
}