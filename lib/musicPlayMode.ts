export type MusicPlayMode =
  | "sequential"
  | "shuffle"
  | "repeat-one";

const KEY = "runwithme_music_play_mode_v1";

export function loadPlayMode(): MusicPlayMode {
  if (typeof window === "undefined") return "sequential";
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "shuffle" || v === "repeat-one") return v;
    return "sequential";
  } catch {
    return "sequential";
  }
}

export function savePlayMode(mode: MusicPlayMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}