import type {
  SystemCardCategory,
  SystemCardCharacter,
} from "@/data/calendarSystemCards";

import type {
  ScheduleCard,
  ScheduleCardCharacter,
} from "@/data/calendarScheduleCards";

import { DEFAULT_SCHEDULE_CARDS } from "@/data/calendarScheduleCards";

/* ---------- 每日系统备注 ---------- */

export type DailyNote = {
  dateStr: string; /* YYYY-MM-DD */
  character: SystemCardCharacter;
  category: SystemCardCategory;
  text: string;
};

const NOTES_KEY = "runwithme_calendar_system_notes";

export function loadDailyNotes(): Record<
  string,
  DailyNote
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
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

export function saveDailyNotes(
  map: Record<string, DailyNote>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOTES_KEY,
    JSON.stringify(map)
  );
}

/* ---------- 每日 Levi / Erwin 行程 ---------- */

export type DailySchedule = {
  dateStr: string;
  levi: string | null;
  erwin: string | null;
};

const SCHEDULE_KEY = "runwithme_calendar_schedules";

export function loadDailySchedules(): Record<
  string,
  DailySchedule
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY);
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

export function saveDailySchedules(
  map: Record<string, DailySchedule>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SCHEDULE_KEY,
    JSON.stringify(map)
  );
}

/* ---------- 用户自己的行程（手写） ---------- */

const USER_SCHEDULE_KEY = "runwithme_calendar_user_schedules";

export function loadUserSchedules(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(
      USER_SCHEDULE_KEY
    );
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

export function saveUserSchedules(
  map: Record<string, string>
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    USER_SCHEDULE_KEY,
    JSON.stringify(map)
  );
}

/* ---------- 行程卡池（用户可编辑） ---------- */

const SCHEDULE_CARDS_KEY =
  "runwithme_calendar_schedule_cards";

export function loadScheduleCards(): ScheduleCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_SCHEDULE_CARDS;
  }

  try {
    const raw = window.localStorage.getItem(
      SCHEDULE_CARDS_KEY
    );
    if (!raw) {
      window.localStorage.setItem(
        SCHEDULE_CARDS_KEY,
        JSON.stringify(DEFAULT_SCHEDULE_CARDS)
      );
      return DEFAULT_SCHEDULE_CARDS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_SCHEDULE_CARDS;
    }

    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.text === "string" &&
        (c.character === "Levi" ||
          c.character === "Erwin") &&
        typeof c.enabled === "boolean"
    );
  } catch {
    return DEFAULT_SCHEDULE_CARDS;
  }
}

export function saveScheduleCards(
  list: ScheduleCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SCHEDULE_CARDS_KEY,
    JSON.stringify(list)
  );
}

export function createScheduleCardId(
  character: ScheduleCardCharacter
): string {
  return `${character}-schedule-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}