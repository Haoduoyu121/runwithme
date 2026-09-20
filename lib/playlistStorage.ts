export type Playlist = {
  id: string;
  name: string;
  musicIds: string[];
  createdAt: number;
  coverId?: string;
};

const KEY = "runwithme_playlists";

export function loadPlaylists(): Playlist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p) =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          Array.isArray(p.musicIds)
      )
      .map(
        (p): Playlist => ({
          id: p.id,
          name: p.name,
          musicIds: p.musicIds.filter(
            (x: unknown): x is string =>
              typeof x === "string"
          ),
          createdAt:
            typeof p.createdAt === "number"
              ? p.createdAt
              : Date.now(),
          coverId:
            typeof p.coverId === "string"
              ? p.coverId
              : undefined,
        })
      );
  } catch {
    return [];
  }
}

export function savePlaylists(list: Playlist[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(list)
    );
  } catch {
    /* ignore */
  }
}

export function createPlaylistId(): string {
  return `pl-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}