/* =========================================================================
   经期周期系统 · 类型定义
   ========================================================================= */

/** 血量 */
export type PeriodFlow =
  | "none"
  | "light"
  | "medium"
  | "heavy";

/** 不适症状 */
export type PeriodSymptom =
  | "cramps"
  | "backache"
  | "headache"
  | "fatigue"
  | "nausea"
  | "breastTender"
  | "moodSwing"
  | "other"
  | "none";

/** 每天一条记录 */
export type DailyPeriodRecord = {
  /** "2026-09-01" */
  date: string;
  /** 本次经期第几天（Day 1 = 1） */
  cycleDay: number;
  flow: PeriodFlow;
  symptoms: PeriodSymptom[];
  note: string;
};

/** 一次实际经期记录 */
export type PeriodRecord = {
  id: string;
  /** "2026-09-01" */
  startDate: string;
  /** null = 还在进行中 */
  endDate: string | null;
  /** 每天的详细记录 */
  dailyRecords: DailyPeriodRecord[];
  createdAt: number;
  updatedAt: number;
};

/** 用户可配置的周期参数 */
export type PeriodSettings = {
  /** 周期长度（天） */
  cycleLength: number;
};

/* ---------- 默认值 ---------- */

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  cycleLength: 28,
};

export const DEFAULT_CYCLE_LENGTH = 28;
export const MIN_CYCLE_LENGTH = 15;
export const MAX_CYCLE_LENGTH = 60;

/* ---------- 展示标签 ---------- */

export const FLOW_LABELS: Record<PeriodFlow, string> = {
  none: "无",
  light: "少",
  medium: "中",
  heavy: "多",
};

export const SYMPTOM_LABELS: Record<
  PeriodSymptom,
  string
> = {
  cramps: "腹痛",
  backache: "腰酸",
  headache: "头痛",
  fatigue: "乏力",
  nausea: "恶心",
  breastTender: "胀痛",
  moodSwing: "情绪波动",
  other: "其他",
  none: "无不适",
};

export const SYMPTOM_ORDER: PeriodSymptom[] = [
  "cramps",
  "backache",
  "headache",
  "fatigue",
  "nausea",
  "breastTender",
  "moodSwing",
  "other",
  "none",
];

/* ---------- 工具函数 ---------- */

export function createPeriodId(): string {
  return `period-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createDailyRecord(
  date: string,
  cycleDay: number
): DailyPeriodRecord {
  return {
    date,
    cycleDay,
    flow: "medium",
    symptoms: [],
    note: "",
  };
}

/* ---------- 日期工具 ---------- */

export function dateStrFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function dateFromStr(s: string): Date {
  return new Date(s + "T00:00:00");
}

export function addDays(
  dateStr: string,
  days: number
): string {
  const d = dateFromStr(dateStr);
  d.setDate(d.getDate() + days);
  return dateStrFromDate(d);
}

export function diffDays(
  from: string,
  to: string
): number {
  const a = dateFromStr(from);
  const b = dateFromStr(to);
  return Math.round(
    (b.getTime() - a.getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

export function todayStr(): string {
  return dateStrFromDate(new Date());
}

/* ---------- 随机备注卡池（保留原有系统） ---------- */

export type PeriodNoteCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

export const DEFAULT_PERIOD_NOTE_CARDS: PeriodNoteCard[] =
  [
    {
      id: "period-note-default-1",
      character: "Levi",
      text: "别硬撑。今天可以什么都不做。",
      enabled: true,
    },
    {
      id: "period-note-default-2",
      character: "Levi",
      text: "热水袋在柜子第二层。",
      enabled: true,
    },
    {
      id: "period-note-default-3",
      character: "Erwin",
      text: "今天的事我来盯，你休息就好。",
      enabled: true,
    },
    {
      id: "period-note-default-4",
      character: "Erwin",
      text: "不要太勉强自己。",
      enabled: true,
    },
    {
      id: "period-note-default-5",
      character: "Levi",
      text: "别喝凉的。",
      enabled: true,
    },
    {
      id: "period-note-default-6",
      character: "Erwin",
      text: "不舒服就说。",
      enabled: true,
    },
  ];