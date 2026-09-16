import type { ICityNotification } from "@/data/icity";

const NOTIF_KEY = "runwithme_icity_notifications";
const SEEN_KEY = "runwithme_icity_seen_events";

export function loadNotifications(): ICityNotification[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(NOTIF_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveNotifications(
  list: ICityNotification[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOTIF_KEY,
    JSON.stringify(list)
  );
}

export function loadSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const saved = window.localStorage.getItem(SEEN_KEY);
  if (!saved) return new Set();
  try {
    const arr = JSON.parse(saved);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr as string[]);
  } catch {
    return new Set();
  }
}

export function saveSeenIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SEEN_KEY,
    JSON.stringify([...ids])
  );
}