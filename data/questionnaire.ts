export type QCharacter = "Levi" | "Erwin";
export type QAuthor = "Yui" | QCharacter;

export type QPostMode = "user-asked" | "character-asked" | "daily";

export type QAnswer = {
  id: string;
  author: QAuthor;
  text: string;
  createdAt: number;
};

export type QPendingAnswer = {
  character: QCharacter;
  scheduledAt: number;
};

export type QPost = {
  id: string;
  mode: QPostMode;
  question: string;
  askedBy?: QCharacter;
  createdAt: number;
  answers: QAnswer[];
  pending: QPendingAnswer[];
  yuiAnswered?: boolean;
};

/* 卡池类型 */
export type CharacterQuestionCard = {
  id: string;
  character: QCharacter;
  text: string;
  enabled: boolean;
};

export type AnswerCard = {
  id: string;
  character: QCharacter;
  text: string;
  enabled: boolean;
};

export type SystemQuestionCard = {
  id: string;
  text: string;
  enabled: boolean;
};

export type DailyRecord = {
  dateStr: string;
  postId: string;
};

/* ids */
export function createQPostId(): string {
  return `qpost-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createQAnswerId(): string {
  return `qans-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createQCardId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* 时间显示 */
export function formatQTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour)
    return `${Math.floor(diff / minute)} min`;
  if (diff < day)
    return `${Math.floor(diff / hour)} h`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day)
    return `${Math.floor(diff / day)} d`;

  return new Date(ts).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export function formatQFullTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* 1 min ~ 3 h */
export function pickAnswerDelay(): number {
  const min = 60 * 1000;
  const max = 3 * 60 * 60 * 1000;
  return Math.floor(Math.random() * (max - min)) + min;
}

export function pickRandomEnabled<
  T extends { enabled: boolean },
>(list: T[]): T | null {
  const pool = list.filter((x) => x.enabled);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function getQAuthorDisplay(author: QAuthor): {
  name: string;
  initial: string;
  colorClass: string;
} {
  if (author === "Yui") {
    return {
      name: "Yui",
      initial: "Y",
      colorClass: "q-avatar-you",
    };
  }
  if (author === "Levi") {
    return {
      name: "Levi",
      initial: "L",
      colorClass: "q-avatar-levi",
    };
  }
  return {
    name: "Erwin",
    initial: "E",
    colorClass: "q-avatar-erwin",
  };
}

export function getModeLabel(mode: QPostMode): string {
  if (mode === "user-asked") return "From You";
  if (mode === "character-asked") return "From Them";
  return "Daily";
}