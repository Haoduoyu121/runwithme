export type NoteAuthor = "user" | "Levi" | "Erwin";
export type NoteKind = "note" | "diary";

export type Note = {
  id: string;
  kind: NoteKind;
  author: NoteAuthor;
  title: string;
  body: string;
  tags: string[];
  mood?: string;
  createdAt: number;
  updatedAt: number;
};

export type WishlistSource = "user" | "levi" | "erwin";

export type WishlistCompleter = "user" | "Levi" | "Erwin";

export type WishlistItem = {
  id: string;
  text: string;
  completed: boolean;
  source: WishlistSource;
  character?: "Levi" | "Erwin";
  createdAt: number;

  // A4
  completedBy?: WishlistCompleter[];
  completedAt?: number;
  completionNote?: string;
  inMemory?: boolean;
  pendingUntil?: number;
};

export type WishlistCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

/* ---------- 日记心情预设（A1 固定，A2 再做卡池） ---------- */

export const DIARY_MOODS: readonly string[] = [
  "平静",
  "开心",
  "想念",
  "疲惫",
  "低落",
  "期待",
  "思考",
];

/* ---------- ID ---------- */

export function createNoteId(): string {
  return `note-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createWishlistItemId(): string {
  return `wish-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createWishlistCardId(
  character: "Levi" | "Erwin"
): string {
  return `${character}-wish-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- 时间 ---------- */

export function formatNoteTime(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const diff = now.getTime() - ts;
  const day = 24 * 60 * 60 * 1000;

  if (diff < 60 * 1000) return "刚刚";

  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  }

  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "昨天";
  }

  if (diff < 7 * day) {
    return `${Math.floor(diff / day)} 天前`;
  }

  return d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

/* ---------- 笔记展示 ---------- */

export function getNoteDisplayTitle(note: Note): string {
  const t = note.title.trim();
  if (t) return t;

  const firstLine = note.body
    .split("\n")
    .find((l) => l.trim());

  return firstLine
    ? firstLine.trim().slice(0, 40)
    : "新笔记";
}

export function getNotePreview(note: Note): string {
  const lines = note.body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return "无附加文字";

  const start = note.title.trim() ? 0 : 1;
  const rest = lines.slice(start).join(" ");

  return rest.slice(0, 90) || "无附加文字";
}

/* ---------- 日记展示 ---------- */

export function getDiaryPreview(
  note: Note,
  max = 80
): string {
  const text = note.body.replace(/\s+/g, " ").trim();
  if (!text) return "……";
  return text.slice(0, max);
}

/* ---------- 标签工具 ---------- */

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, "").slice(0, 16);
}

export function collectAllTags(notes: Note[]): string[] {
  const set = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags) {
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN")
  );
}

export function getNoteTagPreview(
  note: Note,
  max = 3
): string[] {
  return note.tags.slice(0, max);
}