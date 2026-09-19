export type ReadBookSource =
  | "import"
  | "url"
  | "gutenberg"
  | "rss"
  | "opds";

export type ReadBook = {
  id: string;
  title: string;
  author: string;
  source: ReadBookSource;
  sourceUrl?: string;
  addedAt: number;
  charCount: number;
  coverColor: string;
  coverImageId?: string;
  progress: {
    chapterIndex: number;
    /** 旧字段：章节内滚动位置（px）—— 横向分页后不再使用，保留兼容 */
    offset: number;
    /** ★ 7B 新增：章节内第几页（0-based） */
    pageIndex?: number;
    updatedAt: number;
  };
};

export type ReadBackgroundId =
  | "paper"
  | "cream"
  | "grey"
  | "night";

export type ReadFontFamily = "serif" | "sans";

export type ReadSettings = {
  background: ReadBackgroundId;
  fontSize: number;
  lineHeight: number;
  fontFamily: ReadFontFamily;
  /* ★ 新增 */
  paddingTop: number;
  paddingBottom: number;
};

export type ReadChapter = {
  index: number;
  title: string;
  start: number;
  end: number;
};

export function createReadBookId(): string {
  return `book-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

const COVER_PALETTE = [
  "linear-gradient(135deg, #fcbec3 0%, #fff2e9 100%)",
  "linear-gradient(135deg, #cfdee3 0%, #fff2e9 100%)",
  "linear-gradient(135deg, #8e656f 0%, #fcbec3 100%)",
  "linear-gradient(135deg, #fff2e9 0%, #cfdee3 100%)",
  "linear-gradient(135deg, #fde4e6 0%, #cfdee3 100%)",
  "linear-gradient(135deg, #e6d9e0 0%, #fcbec3 100%)",
];

export function pickCoverColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return COVER_PALETTE[Math.abs(h) % COVER_PALETTE.length];
}