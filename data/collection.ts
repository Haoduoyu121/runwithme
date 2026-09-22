/* =========================================================
   RunWithme · Collection
   数据模型 & 常量
   ========================================================= */

export type CollectionOwner = "user" | "levi" | "erwin";

export type CollectionSource =
  | "chat"
  | "icity"
  | "qa"
  | "letter"
  | "photos"
  | "notes"
  | "anniversary"
  | "schedule"
  | "music"
  | "daily-sentence"
  | "read";

export type CollectionSender = string;

export type CollectionItem = {
  id: string;

  /* 谁收藏的 */
  owner: CollectionOwner;

  /* 从哪个 App 来 */
  source: CollectionSource;

  /* 原内容的 id（可空，用于跳回原处；不存也无妨） */
  sourceId: string | null;

  /* 收藏的正文（文本快照；音乐是名字，照片是描述…） */
  content: string;

  /* 备注：用户手写 or 系统从 Card Studio 抽的 */
  note: string;

  /* 分类标签（App 里可加可删） */
  tags: string[];

  /* 收藏时间 */
  createdAt: number;

  /* 原内容的发布时间（如果有） */
  originalAt: number | null;

  /* 原内容是谁发的 */
  sender: CollectionSender | null;

  /* 其它可选字段：路径、原始 App 的 metadata */
  meta: Record<string, unknown>;
};

/* ---------- 展示用 label ---------- */

export const SOURCE_LABELS: Record<CollectionSource, string> = {
  chat: "Chat",
  icity: "iCity",
  qa: "Q&A",
  letter: "Letter",
  photos: "Photos",
  notes: "Notes",
  anniversary: "纪念日",
  schedule: "行程",
  music: "Music",
  "daily-sentence": "每日一句",
  "read": "Read",
};

export const SOURCE_ICONS: Record<CollectionSource, string> = {
  chat: "♡",
  icity: "✦",
  qa: "?",
  letter: "✉",
  photos: "▧",
  notes: "✎",
  anniversary: "❀",
  schedule: "▤",
  music: "♪",
  "daily-sentence": "❝",
  "read": "▤",
};

export const OWNER_LABELS: Record<CollectionOwner, string> = {
  user: "我的收藏",
  levi: "Levi",
  erwin: "Erwin",
};

/* ---------- 系统自动收藏的概率 ---------- */

/* 每次 user 发一句话 / 发动态 / 写信 / 回答问题时，
   系统判定是否收藏的概率区间。最终概率 = 随机落在 [MIN, MAX) */
export const AUTO_COLLECT_MIN = 0.01; /* 1% */
export const AUTO_COLLECT_MAX = 0.05; /* 5% */

/* 系统决定收藏后，要不要再写一条备注的概率（Step 4 用） */
export const AUTO_NOTE_CHANCE = 0.55;

/* ---------- 默认标签 ---------- */

export const DEFAULT_COLLECTION_TAGS: string[] = [
  "重要",
  "可爱",
  "想留下",
  "日常",
  "特别",
];