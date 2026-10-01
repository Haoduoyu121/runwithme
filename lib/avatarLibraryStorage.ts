import type {
  AvatarLibraryItem,
  AvatarLibraryOwner,
  AvatarLibraryScope,
} from "@/data/avatarLibrary";

const KEY = "runwithme_avatar_library_v1";

export function loadAvatarLibrary(): AvatarLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is AvatarLibraryItem =>
        a &&
        typeof a.id === "string" &&
        (a.owner === "Levi" || a.owner === "Erwin") &&
        (a.scope === "chat" || a.scope === "icity") &&
        typeof a.fileName === "string"
    );
  } catch {
    return [];
  }
}

export function saveAvatarLibrary(
  items: AvatarLibraryItem[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(
      new Event("runwithme:avatar-library-updated")
    );
  } catch (e) {
    console.error("保存头像库失败:", e);
  }
}

export function loadAvatarLibraryByOwner(
  owner: AvatarLibraryOwner,
  scope: AvatarLibraryScope
): AvatarLibraryItem[] {
  return loadAvatarLibrary().filter(
    (a) => a.owner === owner && a.scope === scope
  );
}