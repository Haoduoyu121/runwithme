const PENDING_KEY = "runwithme_read_pending_invite_v1";
const LAST_KEY = "runwithme_read_last_sys_invite_v1";

export type PendingReadInvite = {
  id: string;
  from: ("levi" | "erwin")[];
  createdAt: number;
};

export function loadPendingReadInvite(): PendingReadInvite | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      !Array.isArray(parsed.from) ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }
    return parsed as PendingReadInvite;
  } catch {
    return null;
  }
}

export function savePendingReadInvite(
  inv: PendingReadInvite | null
): void {
  if (typeof window === "undefined") return;
  try {
    if (inv) {
      window.localStorage.setItem(
        PENDING_KEY,
        JSON.stringify(inv)
      );
    } else {
      window.localStorage.removeItem(PENDING_KEY);
    }
  } catch {}
}

export function clearPendingReadInvite(): void {
  savePendingReadInvite(null);
}

export function loadLastSysInviteAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveLastSysInviteAt(t: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_KEY, String(t));
  } catch {}
}