import {
  DEFAULT_PERIOD_SETTINGS,
  MAX_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  createDailyRecord,
  DEFAULT_PERIOD_NOTE_CARDS,
  type DailyPeriodRecord,
  type PeriodNoteCard,
  type PeriodRecord,
  type PeriodSettings,
} from "@/data/period";

/* ---------- Storage Keys ---------- */

/** 新系统：实际记录列表 */
const RECORDS_KEY = "runwithme_period_records_v1";

/** 新系统：用户设置 */
const SETTINGS_KEY = "runwithme_period_settings_v1";

/** 新系统：随机备注卡池 */
const NOTE_CARDS_KEY = "runwithme_period_note_cards_v1";

/** 迁移标记 */
const MIGRATION_FLAG = "runwithme_period_migrated_v1";

/** 旧系统的 key（Calendar 里现有的） */
const LEGACY_PERIOD_KEY = "runwithme_calendar_periods";

/* =========================================================================
   记录
   ========================================================================= */

export function loadPeriodRecords(): PeriodRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidRecord)
      .sort(
        (a, b) =>
          dateValue(b.startDate) -
          dateValue(a.startDate)
      );
  } catch (e) {
    console.error("[periodStorage] 加载失败:", e);
    return [];
  }
}

export function savePeriodRecords(
  records: PeriodRecord[]
): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(
      RECORDS_KEY,
      JSON.stringify(records)
    );
    return true;
  } catch (e) {
    console.error("[periodStorage] 保存失败:", e);

    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "经期数据保存失败：本地存储空间已满。\n\n建议先到 Settings → 备份 → 导出全部数据。"
      );
    }

    return false;
  }
}

function dateValue(s: string): number {
  return new Date(s + "T00:00:00").getTime();
}

function isValidRecord(r: unknown): r is PeriodRecord {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;

  if (typeof o.id !== "string") return false;
  if (typeof o.startDate !== "string") return false;
  if (
    o.endDate !== null &&
    typeof o.endDate !== "string"
  ) {
    return false;
  }
  if (!Array.isArray(o.dailyRecords)) return false;

  return true;
}

/* =========================================================================
   设置
   ========================================================================= */

export function loadPeriodSettings(): PeriodSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PERIOD_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PERIOD_SETTINGS;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_PERIOD_SETTINGS;
    }

    const n = Number(parsed.cycleLength);
    if (!Number.isFinite(n)) {
      return DEFAULT_PERIOD_SETTINGS;
    }

    return {
      cycleLength: clampCycle(n),
    };
  } catch {
    return DEFAULT_PERIOD_SETTINGS;
  }
}

export function savePeriodSettings(
  s: PeriodSettings
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        cycleLength: clampCycle(s.cycleLength),
      })
    );
  } catch (e) {
    console.error("[periodStorage] 保存设置失败:", e);
  }
}

export function clampCycle(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PERIOD_SETTINGS.cycleLength;
  return Math.round(
    Math.min(MAX_CYCLE_LENGTH, Math.max(MIN_CYCLE_LENGTH, n))
  );
}

/* =========================================================================
   随机备注卡池
   ========================================================================= */

export function loadPeriodNoteCards(): PeriodNoteCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_PERIOD_NOTE_CARDS;
  }

  try {
    const raw = window.localStorage.getItem(NOTE_CARDS_KEY);
    if (!raw) return DEFAULT_PERIOD_NOTE_CARDS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_PERIOD_NOTE_CARDS;
    }

    const valid = parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        (c.character === "Levi" ||
          c.character === "Erwin") &&
        typeof c.text === "string" &&
        typeof c.enabled === "boolean"
    );

    return valid.length > 0
      ? valid
      : DEFAULT_PERIOD_NOTE_CARDS;
  } catch {
    return DEFAULT_PERIOD_NOTE_CARDS;
  }
}

export function savePeriodNoteCards(
  cards: PeriodNoteCard[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NOTE_CARDS_KEY,
      JSON.stringify(cards)
    );
  } catch (e) {
    console.error("[periodStorage] 保存备注卡失败:", e);
  }
}

/* =========================================================================
   从旧系统迁移（一次性）
   ========================================================================= */

/** 把旧 Calendar 的 PeriodRecord 转成新格式 */
function migrateLegacyRecord(
  legacy: Record<string, unknown>
): PeriodRecord | null {
  const id = legacy.id;
  const startDate = legacy.startDate;
  const endDate = legacy.endDate;

  if (
    typeof id !== "string" ||
    typeof startDate !== "string"
  ) {
    return null;
  }

  const finalEnd =
    typeof endDate === "string" ? endDate : null;

  /* 生成 dailyRecords */
  const dailyRecords: DailyPeriodRecord[] = [];

  if (finalEnd) {
    const startD = new Date(startDate + "T00:00:00");
    const endD = new Date(finalEnd + "T00:00:00");

    let cur = new Date(startD);
    let cycleDay = 1;

    while (cur.getTime() <= endD.getTime()) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const ds = `${y}-${m}-${d}`;

      const rec = createDailyRecord(ds, cycleDay);

      /* 从旧记录继承（只有首尾两天有旧数据，中间补默认） */
      if (ds === startDate) {
        if (
          legacy.flow === "light" ||
          legacy.flow === "medium" ||
          legacy.flow === "heavy"
        ) {
          rec.flow = legacy.flow;
        }
        /* 旧的 symptoms 是字符串，塞进 note */
        if (
          typeof legacy.symptoms === "string" &&
          legacy.symptoms.trim()
        ) {
          rec.note = legacy.symptoms.trim();
        }
        if (
          typeof legacy.note === "string" &&
          legacy.note.trim()
        ) {
          rec.note = rec.note
            ? `${rec.note} · ${legacy.note.trim()}`
            : legacy.note.trim();
        }
      }

      dailyRecords.push(rec);

      cur.setDate(cur.getDate() + 1);
      cycleDay++;
    }
  } else {
    /* 没有结束日期，只生成 Day 1 */
    dailyRecords.push(createDailyRecord(startDate, 1));
  }

  return {
    id,
    startDate,
    endDate: finalEnd,
    dailyRecords,
    createdAt:
      typeof legacy.createdAt === "number"
        ? legacy.createdAt
        : Date.now(),
    updatedAt:
      typeof legacy.createdAt === "number"
        ? legacy.createdAt
        : Date.now(),
  };
}

/**
 * 首次调用时，把旧 `runwithme_calendar_periods` 里的数据
 * 转成新格式写入新 key。之后不再执行。
 */
export function migrateLegacyPeriodsIfNeeded(): {
  migrated: number;
  skipped: boolean;
} {
  if (typeof window === "undefined") {
    return { migrated: 0, skipped: true };
  }

  /* 已经迁移过 → 跳过 */
  if (window.localStorage.getItem(MIGRATION_FLAG)) {
    return { migrated: 0, skipped: true };
  }

  /* 新 key 已有数据 → 不覆盖，只标记 */
  if (window.localStorage.getItem(RECORDS_KEY)) {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    return { migrated: 0, skipped: true };
  }

  const legacyRaw =
    window.localStorage.getItem(LEGACY_PERIOD_KEY);

  if (!legacyRaw) {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    return { migrated: 0, skipped: true };
  }

  try {
    const parsed = JSON.parse(legacyRaw);
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(MIGRATION_FLAG, "1");
      return { migrated: 0, skipped: true };
    }

    const migrated: PeriodRecord[] = [];

    for (const item of parsed) {
      const r = migrateLegacyRecord(item);
      if (r) migrated.push(r);
    }

    if (migrated.length > 0) {
      savePeriodRecords(migrated);
    }

    window.localStorage.setItem(MIGRATION_FLAG, "1");

    console.log(
      `[periodStorage] 从旧系统迁移 ${migrated.length} 条经期记录`
    );

    return { migrated: migrated.length, skipped: false };
  } catch (e) {
    console.error("[periodStorage] 迁移失败:", e);
    window.localStorage.setItem(MIGRATION_FLAG, "1");
    return { migrated: 0, skipped: true };
  }
}