const LAST_KEY = "runwithme_music_last_system_invite";
const PENDING_KEY = "runwithme_music_pending_system_invite";

export type SystemInvitation = {
  id: string;
  from: "Levi" | "Erwin" | "Both";
  createdAt: number;
  expiresAt: number;
};

export function loadLastInviteTime(): number {
  if (typeof window === "undefined") return 0;
  const saved = window.localStorage.getItem(LAST_KEY);
  if (!saved) return 0;
  const n = Number(saved);
  return Number.isFinite(n) ? n : 0;
}

export function saveLastInviteTime(t: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_KEY, String(t));
}

export function loadPendingInvite(): SystemInvitation | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(PENDING_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    if (
      parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.from === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as SystemInvitation;
    }
  } catch {}
  return null;
}

export function savePendingInvite(
  inv: SystemInvitation | null
): void {
  if (typeof window === "undefined") return;
  if (inv) {
    window.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify(inv)
    );
  } else {
    window.localStorage.removeItem(PENDING_KEY);
  }
}

export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}