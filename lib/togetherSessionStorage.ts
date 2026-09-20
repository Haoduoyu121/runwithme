const KEY = "runwithme_together_start_v1";

export function loadTogetherStart(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

export function saveTogetherStart(
  ts: number | null
): void {
  if (typeof window === "undefined") return;
  try {
    if (ts === null) {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, String(ts));
    }
  } catch {
    /* ignore */
  }
}