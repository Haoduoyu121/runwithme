/**
 * 未读系统 · 基础层
 * 记录每个 App 用户"上次打开"的时间戳。
 * 每个 App 根据自己的数据结构判断"未读数"。
 */

const KEY = "runwithme_last_read_v1";

type LastReadMap = Partial<Record<string, number>>;

function load(): LastReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as LastReadMap;
  } catch {
    return {};
  }
}

function save(map: LastReadMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    console.error("[unreadStorage] 保存失败:", e);
  }
}

export function getLastRead(appId: string): number {
  return load()[appId] ?? 0;
}

export function markAppRead(appId: string): void {
  const map = load();
  map[appId] = Date.now();
  save(map);
}

export function resetAllLastRead(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}