const STORAGE_KEY = "runwithme_music_partner";

export type ListenPartner = "Solo" | "Levi" | "Erwin" | "Both";

export function loadListenPartner(): ListenPartner {
  if (typeof window === "undefined") return "Solo";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (
    saved === "Levi" ||
    saved === "Erwin" ||
    saved === "Both" ||
    saved === "Solo"
  ) {
    return saved;
  }
  return "Solo";
}

export function saveListenPartner(p: ListenPartner): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, p);
  /* ★ 派发事件，通知全局 Provider 更新 */
  try {
    window.dispatchEvent(
      new Event("runwithme:listen-partner-change")
    );
  } catch {}
}