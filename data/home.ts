import type { AppId } from "@/lib/systemStorage";

export type HomeItemSize = "1x1" | "2x2";

export type PolaroidWidget = {
  id: string;
  type: "polaroid";
  imageId: string;      /* IndexedDB 中图片的 key */
  caption: string;      /* 手写体标题 */
  dateLabel: string;    /* 例如 "2026.09" */
};

export type CountdownWidget = {
  id: string;
  type: "countdown";
  title: string;
  targetDate: string;   /* YYYY-MM-DD */
};

export type Widget = PolaroidWidget | CountdownWidget;

export type HomeItemContent =
  | { kind: "app"; appId: AppId }
  | { kind: "widget"; widget: Widget };

export type HomeItem = {
  id: string;
  size: HomeItemSize;
  content: HomeItemContent;
};

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

/* 从 app 列表生成默认布局 */
export function buildDefaultLayout(
  appIds: AppId[]
): HomeItem[] {
  return appIds.map((appId) => ({
    id: createHomeItemId(),
    size: "1x1",
    content: { kind: "app", appId },
  }));
}