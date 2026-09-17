import type { AppId } from "@/lib/systemStorage";

export type HomeItemSize = "1x1" | "2x2";

export type PolaroidWidget = {
  id: string;
  type: "polaroid";
  imageId: string;
  caption: string;
  dateLabel: string;
};

export type CountdownWidget = {
  id: string;
  type: "countdown";
  title: string;
  targetDate: string;
};

export type LetterWidget = {
  id: string;
  type: "letter";
};

export type StudyWidget = {
  id: string;
  type: "study";
};

export type DailyQuoteWidget = {
  id: string;
  type: "daily-quote";
};

export type CollectionWidget = {
  id: string;
  type: "collection";
};

export type Widget =
  | PolaroidWidget
  | CountdownWidget
  | LetterWidget
  | StudyWidget
  | DailyQuoteWidget
  | CollectionWidget;

export type HomeItemContent =
  | { kind: "app"; appId: AppId }
  | { kind: "widget"; widget: Widget };

export type HomeItem = {
  id: string;
  size: HomeItemSize;
  content: HomeItemContent;
};

/* ---------- 分页 ---------- */

export type HomePage = HomeItem[];
export type HomePages = HomePage[];

export const GRID_COLS = 4;

export function createHomeItemId(): string {
  return `item-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createWidgetId(): string {
  return `widget-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* 倒计时天数 */
export function daysUntilDate(targetDate: string): number {
  const [y, m, d] = targetDate.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  return Math.round(
    (target.getTime() - today.getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

export function formatCountdown(targetDate: string): {
  days: number;
  label: string;
} {
  const days = daysUntilDate(targetDate);

  if (days === 0) return { days: 0, label: "Today" };
  if (days > 0) return { days, label: "days" };
  return { days: Math.abs(days), label: "days ago" };
}

export function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* 从 app 列表生成默认布局（单页） */
export function buildDefaultLayout(
  appIds: AppId[]
): HomeItem[] {
  return appIds.map((appId) => ({
    id: createHomeItemId(),
    size: "1x1",
    content: { kind: "app", appId },
  }));
}

/* =========================================================
   分页合并
   - 保留用户已有所有页的 item（顺序、位置、小组件都保留）
   - 只把 saved 里缺失的 App 追加到**第一页**
   - Widget 不主动补，由用户手动添加
   ========================================================= */

export function mergeHomePages(
  saved: HomePages,
  defaultItems: HomeItem[]
): HomePages {
  const existingAppIds = new Set<string>();
  for (const page of saved) {
    for (const item of page) {
      if (item.content.kind === "app") {
        existingAppIds.add(item.content.appId);
      }
    }
  }

  const missing: HomeItem[] = [];
  for (const def of defaultItems) {
    if (def.content.kind !== "app") continue;
    if (existingAppIds.has(def.content.appId)) continue;
    missing.push(def);
  }

  /* saved 为空：直接返回一页默认 */
  if (saved.length === 0) {
    return [missing.length > 0 ? missing : defaultItems];
  }

  if (missing.length === 0) return saved;

  /* 追加到第一页 */
  const [first, ...rest] = saved;
  return [[...first, ...missing], ...rest];
}