import type { AppId } from "@/lib/systemStorage";

export type HomeItemSize =
  | "1x1"
  | "2x2"
  | "4x2"
  | "2x4"
  | "4x4";

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
  backgroundImageId?: string;
  leftAvatarId?: string;
  centerAvatarId?: string;
  rightAvatarId?: string;
};

export type LetterWidget = {
  id: string;
  type: "letter";
};

export type StudyWidget = {
  id: string;
  type: "study";
  avatarId?: string;
  bubbleText?: string;
};

export type DailyQuoteWidget = {
  id: string;
  type: "daily-quote";
};

export type MusicWidget = {
  id: string;
  type: "music";
};

export type Widget =
  | PolaroidWidget
  | CountdownWidget
  | LetterWidget
  | StudyWidget
  | DailyQuoteWidget
  | MusicWidget;

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

/* -------------------------------------------------------
   倒数日计算（防御性 —— 应对历史脏数据）
   ------------------------------------------------------- */

export function daysUntilDate(
  targetDate: string | undefined | null
): number {
  if (!targetDate || typeof targetDate !== "string") {
    return 0;
  }

  const parts = targetDate.split("-");
  if (parts.length !== 3) return 0;

  const [y, m, d] = parts.map(Number);

  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d)
  ) {
    return 0;
  }

  const target = new Date(y, m - 1, d);
  if (Number.isNaN(target.getTime())) return 0;

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

export function formatCountdown(
  targetDate: string | undefined | null
): {
  days: number;
  label: string;
} {
  if (!targetDate) {
    return { days: 0, label: "—" };
  }

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

export function buildDefaultLayout(
  appIds: AppId[]
): HomeItem[] {
  return appIds.map((appId) => ({
    id: createHomeItemId(),
    size: "1x1",
    content: { kind: "app", appId },
  }));
}

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

  if (saved.length === 0) {
    return [missing.length > 0 ? missing : defaultItems];
  }

  if (missing.length === 0) return saved;

  const [first, ...rest] = saved;
  return [[...first, ...missing], ...rest];
}