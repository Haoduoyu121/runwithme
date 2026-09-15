import type { VoiceCard } from "@/data/voices";

const VOICES_STORAGE_KEY = "runwithme_voice_cards";

export function loadVoices(): VoiceCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(
    VOICES_STORAGE_KEY
  );

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function saveVoices(
  voices: VoiceCard[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    VOICES_STORAGE_KEY,
    JSON.stringify(voices)
  );
}

export function clearSavedVoices(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    VOICES_STORAGE_KEY
  );
}