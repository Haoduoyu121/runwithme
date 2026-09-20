import type {
  DiaryMoodCard,
  DiaryContentCard,
  DiaryContentCategory,
  DiarySchedulerState,
} from "@/data/diaryCards";
import {
  DEFAULT_DIARY_MOODS,
  DEFAULT_DIARY_CONTENTS,
} from "@/data/diaryCards";

const MOOD_KEY = "runwithme_diary_mood_cards";
const CONTENT_KEY = "runwithme_diary_content_cards";
const SCHED_KEY = "runwithme_diary_scheduler";

/* ---------- Mood ---------- */

export function loadMoodCards(): DiaryMoodCard[] {
  if (typeof window === "undefined")
    return DEFAULT_DIARY_MOODS;

  try {
    const raw = window.localStorage.getItem(MOOD_KEY);
    if (!raw) {
      window.localStorage.setItem(
        MOOD_KEY,
        JSON.stringify(DEFAULT_DIARY_MOODS)
      );
      return DEFAULT_DIARY_MOODS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_DIARY_MOODS;

    const seen = new Set<string>();
    const result: DiaryMoodCard[] = [];

    parsed.forEach((c) => {
      if (!c || typeof c.mood !== "string") return;
      const mood = c.mood.trim();
      if (!mood) return;
      if (seen.has(mood)) return;
      seen.add(mood);
      result.push({
        id:
          typeof c.id === "string"
            ? c.id
            : `dm-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 6)}`,
        mood,
        enabled:
          typeof c.enabled === "boolean"
            ? c.enabled
            : true,
      });
    });

    if (result.length === 0) return DEFAULT_DIARY_MOODS;

    window.localStorage.setItem(
      MOOD_KEY,
      JSON.stringify(result)
    );
    return result;
  } catch {
    return DEFAULT_DIARY_MOODS;
  }
}

export function saveMoodCards(
  list: DiaryMoodCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MOOD_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Content ---------- */

const VALID_CATEGORIES: DiaryContentCategory[] = [
  "opening",
  "body",
  "closing",
];

function isCategory(
  v: unknown
): v is DiaryContentCategory {
  return (
    typeof v === "string" &&
    VALID_CATEGORIES.includes(v as DiaryContentCategory)
  );
}

export function loadContentCards(): DiaryContentCard[] {
  if (typeof window === "undefined")
    return DEFAULT_DIARY_CONTENTS;

  try {
    const raw = window.localStorage.getItem(CONTENT_KEY);
    if (!raw) {
      window.localStorage.setItem(
        CONTENT_KEY,
        JSON.stringify(DEFAULT_DIARY_CONTENTS)
      );
      return DEFAULT_DIARY_CONTENTS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return DEFAULT_DIARY_CONTENTS;

    // Q4=A：老数据（没有 category）直接丢弃
    const result: DiaryContentCard[] = [];

    parsed.forEach((c) => {
      if (!c) return;
      if (typeof c.id !== "string") return;
      if (
        c.character !== "Levi" &&
        c.character !== "Erwin"
      )
        return;
      if (!isCategory(c.category)) return;
      if (typeof c.text !== "string") return;

      result.push({
        id: c.id,
        character: c.character,
        category: c.category,
        text: c.text,
        enabled:
          typeof c.enabled === "boolean"
            ? c.enabled
            : true,
      });
    });

    // 全被丢弃 → 用默认池覆盖
    if (result.length === 0) {
      window.localStorage.setItem(
        CONTENT_KEY,
        JSON.stringify(DEFAULT_DIARY_CONTENTS)
      );
      return DEFAULT_DIARY_CONTENTS;
    }

    // 回写一次清掉老结构
    window.localStorage.setItem(
      CONTENT_KEY,
      JSON.stringify(result)
    );
    return result;
  } catch {
    return DEFAULT_DIARY_CONTENTS;
  }
}

export function saveContentCards(
  list: DiaryContentCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CONTENT_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Scheduler ---------- */

export function loadSchedulerState(): DiarySchedulerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCHED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lastCheckedAt !== "number" ||
      typeof parsed.nextCheckAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSchedulerState(
  s: DiarySchedulerState
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SCHED_KEY,
    JSON.stringify(s)
  );
}