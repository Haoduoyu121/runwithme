import type { StickerItem } from "@/data/stickers";

const STICKERS_STORAGE_KEY = "runwithme_stickers";

export function loadStickers(): StickerItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved =
    window.localStorage.getItem(STICKERS_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function saveStickers(
  stickers: StickerItem[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STICKERS_STORAGE_KEY,
    JSON.stringify(stickers)
  );
}

export function clearSavedStickers(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    STICKERS_STORAGE_KEY
  );
}
