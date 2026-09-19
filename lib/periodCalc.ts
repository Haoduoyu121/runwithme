import {
  addDays,
  dateFromStr,
  dateStrFromDate,
  diffDays,
  todayStr,
  type PeriodRecord,
  type PeriodSettings,
} from "@/data/period";

/* =========================================================================
   下一次预测
   ========================================================================= */

export type PredictedPeriod = {
  /** 预测的开始日期 */
  startDate: string;
  /** 本次预测是第几个周期（1 = 下一次） */
  index: number;
  /** 是否就是当前周期（今天所在） */
  isCurrent: boolean;
};

/**
 * 根据最新一条 actual 记录的 startDate + cycleLength，
 * 往后推 count 个预测周期。
 *
 * 用户实际开始经期后 → 加一条新的 actual → 这里的预测自动重算。
 */
export function getPredictedPeriods(
  records: PeriodRecord[],
  settings: PeriodSettings,
  count = 6
): PredictedPeriod[] {
  if (records.length === 0) return [];

  /* 最新一条记录（按 startDate 降序排列） */
  const sorted = [...records].sort((a, b) =>
    a.startDate < b.startDate ? 1 : -1
  );
  const latest = sorted[0];
  if (!latest) return [];

  const today = todayStr();
  const result: PredictedPeriod[] = [];

  for (let i = 1; i <= count; i++) {
    const startDate = addDays(
      latest.startDate,
      settings.cycleLength * i
    );
    result.push({
      startDate,
      index: i,
      isCurrent: startDate === today,
    });
  }

  return result;
}

/**
 * 判断某个日期是不是「用户实际经期日」
 * 返回记录 + day 序号（Day 1 = 1）
 */
export function getActualDay(
  dateStr: string,
  records: PeriodRecord[]
): { record: PeriodRecord; cycleDay: number } | null {
  for (const r of records) {
    /* 未结束 */
    if (r.endDate === null) {
      if (dateStr >= r.startDate) {
        return {
          record: r,
          cycleDay:
            diffDays(r.startDate, dateStr) + 1,
        };
      }
      continue;
    }

    /* 已结束 */
    if (
      dateStr >= r.startDate &&
      dateStr <= r.endDate
    ) {
      return {
        record: r,
        cycleDay:
          diffDays(r.startDate, dateStr) + 1,
      };
    }
  }
  return null;
}

/**
 * 判断某个日期是不是「预测经期日」
 * 只判断预测的开始日当天
 */
export function isPredictedDay(
  dateStr: string,
  records: PeriodRecord[],
  settings: PeriodSettings
): boolean {
  const predicted = getPredictedPeriods(
    records,
    settings,
    6
  );
  return predicted.some((p) => p.startDate === dateStr);
}

/* =========================================================================
   历史周期统计
   ========================================================================= */

export type CycleHistoryEntry = {
  fromStart: string;
  toStart: string;
  /** 天数 */
  length: number;
};

/**
 * 相邻两次 actual 记录的周期长度。
 * 只保留合理的（15~60 天）。
 */
export function getCycleHistory(
  records: PeriodRecord[]
): CycleHistoryEntry[] {
  const sorted = [...records].sort((a, b) =>
    a.startDate < b.startDate ? -1 : 1
  );

  const list: CycleHistoryEntry[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];

    const len = diffDays(
      prev.startDate,
      cur.startDate
    );

    if (len >= 15 && len <= 60) {
      list.push({
        fromStart: prev.startDate,
        toStart: cur.startDate,
        length: len,
      });
    }
  }

  return list;
}

/**
 * 历史平均周期（天数）。没有合理历史时返回 null。
 */
export function getAverageCycle(
  records: PeriodRecord[]
): number | null {
  const history = getCycleHistory(records);
  if (history.length === 0) return null;

  const sum = history.reduce((acc, h) => acc + h.length, 0);
  return Math.round(sum / history.length);
}

/* =========================================================================
   状态查询
   ========================================================================= */

/** 当前是否有正在进行的经期（endDate === null） */
export function getActivePeriod(
  records: PeriodRecord[]
): PeriodRecord | null {
  return (
    records.find((r) => r.endDate === null) ?? null
  );
}

/** 下一次预测的开始日期 */
export function getNextPredictedDate(
  records: PeriodRecord[],
  settings: PeriodSettings
): string | null {
  const list = getPredictedPeriods(records, settings, 1);
  return list[0]?.startDate ?? null;
}

/** 距离下一次预测开始还有多少天（负数表示已过期） */
export function daysUntilNext(
  records: PeriodRecord[],
  settings: PeriodSettings
): number | null {
  const next = getNextPredictedDate(records, settings);
  if (!next) return null;
  return diffDays(todayStr(), next);
}

/* =========================================================================
   随机备注
   ========================================================================= */

/**
 * 从卡池里随机抽一条。不做医疗建议。
 */
export function pickRandomNoteCard(
  cards: {
    id: string;
    character: "Levi" | "Erwin";
    text: string;
    enabled: boolean;
  }[]
): { id: string; character: "Levi" | "Erwin"; text: string } | null {
  const enabled = cards.filter((c) => c.enabled);
  if (enabled.length === 0) return null;

  const card =
    enabled[Math.floor(Math.random() * enabled.length)];

  return {
    id: card.id,
    character: card.character,
    text: card.text,
  };
}