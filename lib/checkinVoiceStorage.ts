import type { VoiceCard } from "@/data/checkinVoiceCards";

const KEY = "runwithme_checkin_voice_cards";

export function loadVoiceCards(): VoiceCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

export function saveVoiceCards(list: VoiceCard[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error(
      "[VoiceCards] localStorage 写入失败（可能已满）:",
      e
    );
    throw e;
  }
}

function isValid(v: unknown): v is VoiceCard {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.text === "string" &&
    typeof x.enabled === "boolean" &&
    (x.character === "Levi" || x.character === "Erwin")
  );
}