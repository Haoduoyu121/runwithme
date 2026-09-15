import type {
  Anniversary,
  PeriodRecord,
} from "@/data/calendar";

const ANN_KEY = "runwithme_calendar_anniversaries";
const PERIOD_KEY = "runwithme_calendar_periods";

/* ---------- 纪念日 ---------- */

export function loadAnniversaries(): Anniversary[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ANN_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (a) =>
          a &&
          typeof a.id === "string" &&
          typeof a.title === "string" &&
          typeof a.month === "number" &&
          typeof a.day === "number" &&
          (a.year === null ||
            typeof a.year === "number")
      )
      .map((a): Anniversary => ({
        id: a.id,
        title: a.title,
        year:
          a.year === null || typeof a.year === "number"
            ? a.year
            : null,
        month: a.month,
        day: a.day,
        repeat:
          a.repeat === "monthly" ? "monthly" : "yearly",
        createdAt:
          typeof a.createdAt === "number"
            ? a.createdAt
            : Date.now(),
      }));
  } catch {
    return [];
  }
}

export function saveAnniversaries(
  list: Anniversary[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ANN_KEY,
    JSON.stringify(list)
  );
}

/* ---------- 经期 ---------- */

export function loadPeriods(): PeriodRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PERIOD_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.startDate === "string" &&
        typeof p.endDate === "string"
    );
  } catch {
    return [];
  }
}

export function savePeriods(list: PeriodRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PERIOD_KEY,
    JSON.stringify(list)
  );
}