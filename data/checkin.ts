export type CheckinCharacter = "Yui" | "Levi" | "Erwin";

export type Task = {
  id: string;
  name: string;
  createdAt: number;
};

export type TaskComment = {
  id: string;
  author: CheckinCharacter;
  text: string;
  createdAt: number;
};

export type DayTaskRecord = {
  completed: boolean;
  completedAt?: number;
  pomodoroCount: number;
  comments: TaskComment[];
};

export type TaskCard = {
  id: string;
  text: string;
  enabled: boolean;
};

export type CommentCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

export type PomodoroSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
};

export const DEFAULT_POMODORO: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
};

/* ---------- ids ---------- */

export function createTaskId(): string {
  return `task-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createTaskCommentId(): string {
  return `tc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createTaskCardId(): string {
  return `tcard-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createCommentCardId(
  character: "Levi" | "Erwin"
): string {
  return `${character}-cc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- 日期 ---------- */

export function dateStrFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function todayStr(): string {
  return dateStrFromDate(new Date());
}

export function recordKey(
  dateStr: string,
  taskId: string
): string {
  return `${dateStr}:${taskId}`;
}

/* ---------- 随机 ---------- */

export function pickRandomEnabled<
  T extends { enabled: boolean },
>(list: T[]): T | null {
  const pool = list.filter((x) => x.enabled);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- 显示 ---------- */

export function getCheckinAuthorDisplay(
  author: CheckinCharacter
): {
  name: string;
  initial: string;
  colorClass: string;
} {
  if (author === "Yui") {
    return {
      name: "Yui",
      initial: "Y",
      colorClass: "checkin-avatar-you",
    };
  }
  if (author === "Levi") {
    return {
      name: "Levi",
      initial: "L",
      colorClass: "checkin-avatar-levi",
    };
  }
  return {
    name: "Erwin",
    initial: "E",
    colorClass: "checkin-avatar-erwin",
  };
}

export function formatMinSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
    }
  );
}

export function formatWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    "en-US",
    { weekday: "long" }
  );
}

/* 连续打卡天数 */
export function computeStreak(
  records: Record<string, DayTaskRecord>,
  tasks: Task[]
): number {
  if (tasks.length === 0) return 0;

  const taskIds = new Set(tasks.map((t) => t.id));

  function hasAnyCompleted(dateStr: string): boolean {
    for (const t of taskIds) {
      const r = records[recordKey(dateStr, t)];
      if (r?.completed) return true;
    }
    return false;
  }

  let streak = 0;
  const cursor = new Date();

  /* 今天没完成就允许从昨天开始 */
  if (!hasAnyCompleted(dateStrFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (hasAnyCompleted(dateStrFromDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}