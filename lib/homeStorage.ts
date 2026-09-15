import type { HomeItem } from "@/data/home";

const LAYOUT_KEY = "runwithme_home_layout";

export function loadHomeLayout(
  defaultItems: HomeItem[]
): HomeItem[] {
  if (typeof window === "undefined") {
    return defaultItems;
  }

  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultItems;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultItems;

    const cleaned = parsed.filter(
      (it) =>
        it &&
        typeof it.id === "string" &&
        (it.size === "1x1" || it.size === "2x2") &&
        it.content &&
        (it.content.kind === "app" ||
          it.content.kind === "widget")
    );

    return cleaned.length > 0 ? cleaned : defaultItems;
  } catch {
    return defaultItems;
  }
}

export function saveHomeLayout(items: HomeItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LAYOUT_KEY,
    JSON.stringify(items)
  );
}

export function clearHomeLayout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAYOUT_KEY);
}