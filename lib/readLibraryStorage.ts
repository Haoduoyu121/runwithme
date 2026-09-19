import type { ReadBook, ReadSettings } from "@/data/read";

const LIBRARY_KEY = "runwithme_read_library_v1";
const SETTINGS_KEY = "runwithme_read_settings_v1";

export const defaultReadSettings: ReadSettings = {
  background: "paper",
  fontSize: 17,
  lineHeight: 1.8,
  fontFamily: "serif",
};

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`[readStorage] 保存 ${key} 失败:`, e);
    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "书房保存失败：本地存储空间已满。\n\n" +
          "建议：\n" +
          "1. 到 Read 里删除一些不读的书\n" +
          "2. 到 Settings → 备份 → 导出全部数据\n" +
          "3. 清理不用的图片 / 音乐"
      );
    }
    return false;
  }
}

function isValidBook(raw: unknown): raw is ReadBook {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.author === "string" &&
    typeof o.addedAt === "number" &&
    typeof o.charCount === "number"
  );
}

export function loadLibrary(): ReadBook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidBook);
  } catch (e) {
    console.error("[readStorage] 加载 library 失败:", e);
    return [];
  }
}

export function saveLibrary(list: ReadBook[]): boolean {
  return safeSetItem(LIBRARY_KEY, JSON.stringify(list));
}

export function upsertBook(book: ReadBook): ReadBook[] {
  const list = loadLibrary();
  const idx = list.findIndex((b) => b.id === book.id);
  const next =
    idx >= 0
      ? list.map((b, i) => (i === idx ? book : b))
      : [...list, book];
  next.sort((a, b) => b.addedAt - a.addedAt);
  saveLibrary(next);
  return next;
}

export function removeBook(id: string): ReadBook[] {
  const list = loadLibrary().filter((b) => b.id !== id);
  saveLibrary(list);
  return list;
}

export function loadReadSettings(): ReadSettings {
  if (typeof window === "undefined") return defaultReadSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultReadSettings;
    const parsed = JSON.parse(raw);
    return {
      ...defaultReadSettings,
      ...(parsed ?? {}),
    };
  } catch {
    return defaultReadSettings;
  }
}

export function saveReadSettings(s: ReadSettings): boolean {
  return safeSetItem(SETTINGS_KEY, JSON.stringify(s));
}