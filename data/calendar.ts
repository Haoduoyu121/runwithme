export type AnniversaryRepeat = "yearly" | "monthly";

export type Anniversary = {
  id: string;
  title: string;
  year: number | null;      /* null = 每年都提醒 */
  month: number;            /* 1-12；monthly 模式忽略 */
  day: number;              /* 1-31 */
  repeat: AnniversaryRepeat;
  createdAt: number;
};

export type PeriodFlow = "light" | "medium" | "heavy" | "";

export type PeriodRecord = {
  id: string;
  startDate: string;        /* YYYY-MM-DD */
  endDate: string;          /* YYYY-MM-DD */
  flow: PeriodFlow;
  symptoms: string;
  note: string;
  createdAt: number;
};

export type CalendarCell = {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

/* ---------- id ---------- */

export function createAnniversaryId(): string {
  return `ann-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createPeriodId(): string {
  return `period-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* ---------- 日期工具 ---------- */

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateStr(
  year: number,
  month: number,
  day: number
): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function dateStrFromDate(d: Date): string {
  return toDateStr(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
}

/* ---------- 纪念日判定 ---------- */

export function isAnniversaryOnDate(
  a: Anniversary,
  year: number,
  month: number,
  day: number
): boolean {
  if (a.repeat === "yearly") {
    if (a.month !== month || a.day !== day) return false;
    if (a.year === null) return true;
    return a.year === year;
  }
  /* monthly */
  return a.day === day;
}

export function hasAnniversary(
  list: Anniversary[],
  year: number,
  month: number,
  day: number
): boolean {
  return list.some((a) =>
    isAnniversaryOnDate(a, year, month, day)
  );
}

/* ---------- 经期判定 ---------- */

export function isPeriodDay(
  period: PeriodRecord,
  dateStr: string
): boolean {
  return (
    dateStr >= period.startDate &&
    dateStr <= period.endDate
  );
}

export function periodDayIndex(
  period: PeriodRecord,
  dateStr: string
): number {
  if (!isPeriodDay(period, dateStr)) return 0;

  const start = new Date(period.startDate + "T00:00:00");
  const cur = new Date(dateStr + "T00:00:00");
  return (
    Math.round(
      (cur.getTime() - start.getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1
  );
}

export function periodTotalDays(
  period: PeriodRecord
): number {
  const start = new Date(period.startDate + "T00:00:00");
  const end = new Date(period.endDate + "T00:00:00");
  return (
    Math.round(
      (end.getTime() - start.getTime()) /
        (24 * 60 * 60 * 1000)
    ) + 1
  );
}

/* ---------- 月历网格 ---------- */

export function buildMonthGrid(
  year: number,
  month: number
): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();

  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonthDate = new Date(year, month - 1, 0);
  const daysInPrevMonth = prevMonthDate.getDate();

  const prevM = month === 1 ? 12 : month - 1;
  const prevY = month === 1 ? year - 1 : year;

  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;

  const todayDate = new Date();
  const tY = todayDate.getFullYear();
  const tM = todayDate.getMonth() + 1;
  const tD = todayDate.getDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      year: prevY,
      month: prevM,
      day: d,
      dateStr: toDateStr(prevY, prevM, d),
      isCurrentMonth: false,
      isToday: prevY === tY && prevM === tM && d === tD,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      year,
      month,
      day: d,
      dateStr: toDateStr(year, month, d),
      isCurrentMonth: true,
      isToday: year === tY && month === tM && d === tD,
    });
  }

  let next = 1;
  while (cells.length < 42) {
    cells.push({
      year: nextY,
      month: nextM,
      day: next,
      dateStr: toDateStr(nextY, nextM, next),
      isCurrentMonth: false,
      isToday:
        nextY === tY && nextM === tM && next === tD,
    });
    next++;
  }

  return cells;
}

/* ---------- 名称 ---------- */

export function getWeekdayNames(): string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function getMonthShort(month: number): string {
  return MONTH_SHORT[month - 1] ?? "";
}

export function formatDate(
  year: number,
  month: number,
  day: number,
  withYear = false
): string {
  const m = getMonthName(month);
  return withYear ? `${m} ${day}, ${year}` : `${m} ${day}`;
}

export function formatDateShort(
  month: number,
  day: number
): string {
  return `${getMonthShort(month)} ${day}`;
}

/* ---------- 下一次触发 ---------- */

export function nextOccurrence(
  a: Anniversary,
  fromDate: Date = new Date()
): Date {
  const y = fromDate.getFullYear();
  const m = fromDate.getMonth() + 1;
  const d = fromDate.getDate();
  const today = new Date(y, m - 1, d);

  if (a.repeat === "yearly") {
    if (a.year !== null) {
      return new Date(a.year, a.month - 1, a.day);
    }
    let candidate = new Date(y, a.month - 1, a.day);
    if (candidate < today) {
      candidate = new Date(y + 1, a.month - 1, a.day);
    }
    return candidate;
  }

  let yy = y;
  let mm = m;
  let candidate = new Date(yy, mm - 1, a.day);
  if (candidate < today) {
    mm += 1;
    if (mm > 12) {
      mm = 1;
      yy += 1;
    }
    candidate = new Date(yy, mm - 1, a.day);
  }
  return candidate;
}

export function daysUntil(
  date: Date,
  from: Date = new Date()
): number {
  const a = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const b = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  );
  return Math.round(
    (a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)
  );
}

/* ---------- 展示辅助 ---------- */

export function formatAnniversaryDate(
  a: Anniversary
): string {
  if (a.repeat === "monthly") {
    return `每月 ${a.day} 号`;
  }
  if (a.year === null) {
    return `${getMonthShort(a.month)} ${a.day} · 每年`;
  }
  return `${getMonthShort(a.month)} ${a.day}, ${a.year}`;
}

export const FLOW_LABELS: Record<
  Exclude<PeriodFlow, "">,
  string
> = {
  light: "少",
  medium: "中",
  heavy: "多",
};
/* ---------- 周视图 ---------- */

export function buildWeekGrid(
  year: number,
  month: number,
  day: number
): CalendarCell[] {
  const base = new Date(year, month - 1, day);
  const weekday = base.getDay(); /* 0 = Sunday */

  const sunday = new Date(base);
  sunday.setDate(base.getDate() - weekday);

  const today = new Date();
  const tY = today.getFullYear();
  const tM = today.getMonth() + 1;
  const tD = today.getDate();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);

    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();

    cells.push({
      year: y,
      month: m,
      day: dd,
      dateStr: toDateStr(y, m, dd),
      isCurrentMonth: m === month && y === year,
      isToday: y === tY && m === tM && dd === tD,
    });
  }

  return cells;
}

export function getWeekdayShort(day: number): string {
  return ["S", "M", "T", "W", "T", "F", "S"][day] ?? "";
}

export function getWeekdayShortNames(): string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}