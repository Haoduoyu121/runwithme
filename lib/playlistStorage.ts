const KEY = "runwithme_music_playlists";

export type Playlist = {
  id: string;
  name: string;
  musicIds: string[];
  createdAt: number;
};

export function loadPlaylists(): Playlist[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        Array.isArray(p.musicIds)
    );
  } catch {
    return [];
  }
}

export function savePlaylists(list: Playlist[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function createPlaylistId(): string {
  return `pl-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}