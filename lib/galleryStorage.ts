import type { GalleryItem, GalleryOwner } from "@/data/gallery";

const KEY = "runwithme_gallery_v1";

export function loadGallery(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is GalleryItem =>
        g &&
        typeof g.id === "string" &&
        (g.owner === "Levi" || g.owner === "Erwin") &&
        typeof g.fileName === "string"
    );
  } catch {
    return [];
  }
}

export function saveGallery(items: GalleryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(
      new Event("runwithme:gallery-updated")
    );
  } catch (e) {
    console.error("保存图库失败:", e);
  }
}

export function loadGalleryByOwner(
  owner: GalleryOwner
): GalleryItem[] {
  return loadGallery().filter((g) => g.owner === owner);
}