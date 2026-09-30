export type MusicSource = "url" | "file" | "netease";

/* ★ 歌词来源 */
export type LyricSource = "netease" | "manual";

/* ★ 歌词结构 */
export type MusicLyrics = {
  /** 原始 LRC 文本（含 [mm:ss.xx]） */
  raw: string;
  /** true = 有时间标签可滚动；false = 纯文本 */
  synced: boolean;
  source: LyricSource;
  /** 拉取 / 保存时间 */
  fetchedAt: number;
  /** 拉取时用的 neteaseId（源歌变了要重拉） */
  neteaseId?: number;
};

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
  /* ★ 歌词 */
  lyrics?: MusicLyrics;
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