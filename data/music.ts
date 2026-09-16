export type MusicSource = "url" | "file";

export type MusicItem = {
  id: string;
  title: string;
  artist: string;
  url: string;
  enabled: boolean;
  source: MusicSource;
  fileName?: string;
  /* ★ 封面在 IndexedDB 中的 id */
  coverId?: string;
};

export const defaultMusic: MusicItem[] = [
  {
    id: "music-001",
    title: "Run With Me",
    artist: "Yui",
    url: "",
    enabled: true,
    source: "url",
  },
];