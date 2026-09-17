import type { HomeItem, HomePages } from "@/data/home";

const LAYOUT_KEY = "runwithme_home_layout";

function isValidItem(it: unknown): it is HomeItem {
  if (!it || typeof it !== "object") return false;
  const obj = it as Record<string, unknown>;
  if (typeof obj.id !== "string") return false;
  if (obj.size !== "1x1" && obj.size !== "2x2") return false;
  if (!obj.content || typeof obj.content !== "object") {
    return false;
  }
  const c = obj.content as Record<string, unknown>;
  if (c.kind !== "app" && c.kind !== "widget") return false;
  return true;
}

function sanitizePage(raw: unknown): HomeItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw.filter(isValidItem);
  return items;
}

export function loadHomePages(
  defaultItems: HomeItem[]
): HomePages {
  if (typeof window === "undefined") return [defaultItems];

  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return [defaultItems];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [defaultItems];
    }

    /* ---------- 旧格式：HomeItem[] ---------- */
    const first = parsed[0];
    const isOldFormat =
      first !== null &&
      typeof first === "object" &&
      !Array.isArray(first);

    if (isOldFormat) {
      const items = (parsed as unknown[]).filter(
        isValidItem
      );
      return items.length > 0 ? [items] : [defaultItems];
    }

    /* ---------- 新格式：HomePages ---------- */
    const pages: HomePages = [];
    for (const rawPage of parsed as unknown[]) {
      const page = sanitizePage(rawPage);
      if (page) pages.push(page);
    }

    return pages.length > 0 ? pages : [defaultItems];
  } catch {
    return [defaultItems];
  }
}

export function saveHomePages(pages: HomePages): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LAYOUT_KEY,
    JSON.stringify(pages)
  );
}

export function clearHomeLayout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAYOUT_KEY);
}