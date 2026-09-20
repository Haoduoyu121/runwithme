export type MusicSource = "url" | "file" | "netease";

export type MusicItem = {
  id: string;
  title: string;
  artist: string;
  url: string;
  enabled: boolean;
  source: MusicSource;
  fileName?: string;
  /* ★ 本地封面：IndexedDB 中的 id */
  coverId?: string;
  /* ★ 网易云专用字段 */
  neteaseId?: number;
  remoteCover?: string;
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