import type { MusicItem } from "@/data/music";
const MUSIC_STORAGE_KEY = "runwithme_music";
export function loadMusic(
  defaultMusic: MusicItem[]
): MusicItem[] {
  if (typeof window === "undefined") {
    return defaultMusic;
  }
  const savedMusic =
    window.localStorage.getItem(
      MUSIC_STORAGE_KEY
    );
  if (!savedMusic) {
    window.localStorage.setItem(
      MUSIC_STORAGE_KEY,
      JSON.stringify(defaultMusic)
    );
    return defaultMusic;
  }
  try {
    const parsed = JSON.parse(savedMusic);
    if (!Array.isArray(parsed)) {
      return defaultMusic;
    }
    return parsed;
  } catch {
    return defaultMusic;
  }
}
export function saveMusic(
  music: MusicItem[]
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    MUSIC_STORAGE_KEY,
    JSON.stringify(music)
  );
}
export function clearSavedMusic(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(
    MUSIC_STORAGE_KEY
  );
}