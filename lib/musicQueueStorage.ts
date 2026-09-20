export type PlayQueue = {
  id: string;        // "all" 或 playlistId
  name: string;      // "全部" 或歌单名
  musicIds: string[];
};

const KEY = "runwithme_music_queue_v1";

export function loadMusicQueue(): PlayQueue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      !Array.isArray(parsed.musicIds)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      musicIds: parsed.musicIds.filter(
        (x: unknown): x is string => typeof x === "string"
      ),
    };
  } catch {
    return null;
  }
}

export function saveMusicQueue(
  queue: PlayQueue | null
): void {
  if (typeof window === "undefined") return;
  try {
    if (queue === null) {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(
        KEY,
        JSON.stringify(queue)
      );
    }
  } catch {
    /* ignore */
  }
}