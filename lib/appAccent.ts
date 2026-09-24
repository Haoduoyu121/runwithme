import type { AppId } from "./systemStorage";

/** 每个 App 的主题色（作为打开动画展开色 + 未来统一强调色） */
export const APP_ACCENT: Record<AppId, string> = {
  chat: "#ec4899",
  music: "#d4a574",
  photos: "#4a90d9",
  icity: "#8b6b3d",
  notes: "#eab308",
  questionnaire: "#4a90d9",
  checkin: "#ec4899",
  letter: "#d4a574",
  collection: "#ec4899",
  study: "#4a90d9",
  watch: "#4a90d9",
  memory: "#8b6b3d",
  random: "#8b5cf6",
  search: "#d4a574",
  read: "#8b6b3d",
  fridge: "#7dd3fc",
  cards: "#a78bfa",
  calendar: "#a78bfa",
  ai: "#a78bfa",
  tarot: "#a78bfa",
  games: "#a3a380",
};

export function getAppAccent(id: AppId): string {
  return APP_ACCENT[id] || "#7c7c7c";
}

/** 把 hex 转成 rgba（用于覆盖层透明度） */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}