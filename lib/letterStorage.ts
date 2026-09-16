import type { Letter, PendingLetter } from "@/data/letter";

const LETTERS_KEY = "runwithme_letters";
const PENDING_KEY = "runwithme_letter_pending";
const LAST_SYS_KEY = "runwithme_letter_last_system";

export function loadLetters(): Letter[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(LETTERS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveLetters(list: Letter[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    LETTERS_KEY,
    JSON.stringify(list)
  );
}

export function loadPendingLetters(): PendingLetter[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(PENDING_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePendingLetters(
  list: PendingLetter[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PENDING_KEY,
    JSON.stringify(list)
  );
}

export function loadLastSystemLetterAt(): number {
  if (typeof window === "undefined") return 0;
  const saved = window.localStorage.getItem(LAST_SYS_KEY);
  if (!saved) return 0;
  const n = Number(saved);
  return Number.isFinite(n) ? n : 0;
}

export function saveLastSystemLetterAt(t: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SYS_KEY, String(t));
}