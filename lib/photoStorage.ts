export type PhotoItem = {
  id: string;
  fileName: string;
  description: string;
  createdAt: number;
  categoryId: string | null;
};

export type PhotoCategory = {
  id: string;
  name: string;
  createdAt: number;
};

const PHOTOS_KEY = "runwithme_photo_meta";
const CATEGORIES_KEY = "runwithme_photo_categories";

export const UNCATEGORIZED = "__uncategorized__";

export function loadPhotos(): PhotoItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PHOTOS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.createdAt === "number"
      )
      .map((item): PhotoItem => ({
        id: item.id,
        fileName: item.fileName ?? "",
        description: item.description ?? "",
        createdAt: item.createdAt,
        categoryId:
          typeof item.categoryId === "string"
            ? item.categoryId
            : null,
      }));
  } catch {
    return [];
  }
}

export function savePhotos(items: PhotoItem[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    PHOTOS_KEY,
    JSON.stringify(items)
  );
}

export function loadCategories(): PhotoCategory[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string"
    );
  } catch {
    return [];
  }
}

export function saveCategories(items: PhotoCategory[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    CATEGORIES_KEY,
    JSON.stringify(items)
  );
}

export function createPhotoId(): string {
  return `photo-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function createCategoryId(): string {
  return `cat-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}