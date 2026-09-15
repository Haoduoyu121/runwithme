import type {
  Task,
  DayTaskRecord,
  TaskCard,
  CommentCard,
  PomodoroSettings,
} from "@/data/checkin";

import { DEFAULT_POMODORO } from "@/data/checkin";

import {
  DEFAULT_COMMENT_CARDS,
  DEFAULT_TASK_CARDS,
} from "@/data/checkinCards";

const TASKS_KEY = "runwithme_checkin_tasks";
const RECORDS_KEY = "runwithme_checkin_records";
const TASK_CARDS_KEY = "runwithme_checkin_task_cards";
const COMMENT_CARDS_KEY =
  "runwithme_checkin_comment_cards";
const POMODORO_KEY = "runwithme_checkin_pomodoro";

/* ---------- Tasks ---------- */

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.name === "string"
    );
  } catch {
    return [];
  }
}

export function saveTasks(list: Task[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TASKS_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Records ---------- */

export function loadRecords(): Record<
  string,
  DayTaskRecord
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveRecords(
  map: Record<string, DayTaskRecord>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RECORDS_KEY,
    JSON.stringify(map)
  );
}

/* ---------- Task Cards ---------- */

export function loadTaskCards(): TaskCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_TASK_CARDS;
  }
  try {
    const raw = window.localStorage.getItem(
      TASK_CARDS_KEY
    );
    if (!raw) {
      window.localStorage.setItem(
        TASK_CARDS_KEY,
        JSON.stringify(DEFAULT_TASK_CARDS)
      );
      return DEFAULT_TASK_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_TASK_CARDS;
    }
    return parsed;
  } catch {
    return DEFAULT_TASK_CARDS;
  }
}

export function saveTaskCards(list: TaskCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TASK_CARDS_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Comment Cards ---------- */

export function loadCommentCards(): CommentCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_COMMENT_CARDS;
  }
  try {
    const raw = window.localStorage.getItem(
      COMMENT_CARDS_KEY
    );
    if (!raw) {
      window.localStorage.setItem(
        COMMENT_CARDS_KEY,
        JSON.stringify(DEFAULT_COMMENT_CARDS)
      );
      return DEFAULT_COMMENT_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_COMMENT_CARDS;
    }
    return parsed;
  } catch {
    return DEFAULT_COMMENT_CARDS;
  }
}

export function saveCommentCards(
  list: CommentCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    COMMENT_CARDS_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Pomodoro ---------- */

export function loadPomodoro(): PomodoroSettings {
  if (typeof window === "undefined") {
    return DEFAULT_POMODORO;
  }
  try {
    const raw = window.localStorage.getItem(POMODORO_KEY);
    if (!raw) return DEFAULT_POMODORO;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.focusMin === "number" &&
      typeof parsed.shortBreakMin === "number" &&
      typeof parsed.longBreakMin === "number"
    ) {
      return parsed;
    }
    return DEFAULT_POMODORO;
  } catch {
    return DEFAULT_POMODORO;
  }
}

export function savePomodoro(
  s: PomodoroSettings
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    POMODORO_KEY,
    JSON.stringify(s)
  );
}