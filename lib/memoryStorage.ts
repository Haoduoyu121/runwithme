// lib/memoryStorage.ts

/**
 * Memory 数据层
 *
 * 跨 App 时间线。只记录引用（sourceApp / sourceId）和展示所需的
 * 摘要信息（title / preview / meta），不复制原始数据。
 *
 * 存储：localStorage（runwithme_memory_v1）
 * 排序：timestamp 降序（最新在前）
 * 去重：同 (sourceApp, sourceId) 视为同一条，后写覆盖前写、保留旧 id
 */

export type MemorySourceApp =
  | "music"
  | "chat"
  | "letter"
  | "photos"
  | "icity"
  | "notes"
  | "collection"
  | "calendar"
  | "study"
  | "watch"
  | "read"
  | "random"
  | "checkin"
  | "questionnaire"
  | "wishlist";

export type MemoryType =
  | "text"
  | "image"
  | "audio"
  | "session"
  | "milestone";

export type MemoryEntry = {
  id: string;
  sourceApp: MemorySourceApp;
  sourceId: string;
  timestamp: number;
  type: MemoryType;
  /** 一行摘要标题，时间线主行 */
  title: string;
  /** 可选副行预览 */
  preview?: string;
  /** 各 App 自定义负载（比如一起听的 partner / durationMs） */
  meta?: Record<string, unknown>;
};

export type MemoryDraft = Omit<MemoryEntry, "id">;

const STORAGE_KEY = "runwithme_memory_v1";

/** 硬上限，超过砍最旧，防止 localStorage 爆炸 */
const MAX_ENTRIES = 5000;

/** 粗略估算：UTF-16 每字符 2 字节 */
const SIZE_WARN_BYTES = 3 * 1024 * 1024;

export function createMemoryId(): string {
  return `mem-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function loadMemory(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch (e) {
    console.error("[memoryStorage] 加载失败:", e);
    return [];
  }
}

export function saveMemory(entries: MemoryEntry[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    const trimmed =
      entries.length > MAX_ENTRIES
        ? entries.slice(0, MAX_ENTRIES)
        : entries;
    const str = JSON.stringify(trimmed);

    const approxBytes = str.length * 2;
    if (approxBytes > SIZE_WARN_BYTES) {
      console.warn(
        "[memoryStorage] Memory 数据偏大:",
        (approxBytes / 1024 / 1024).toFixed(2),
        "MB"
      );
    }

    window.localStorage.setItem(STORAGE_KEY, str);
    return true;
  } catch (e) {
    console.error("[memoryStorage] 保存失败:", e);

    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      window.alert(
        "Memory 保存失败：本地存储空间已满。\n\n" +
          "建议：\n" +
          "1. 到 Settings → 备份 → 导出全部数据\n" +
          "2. 到 Memory 里删掉一些旧记录\n" +
          "3. 或清理一些不用的图片 / 音乐 / 卡片"
      );
    }

    return false;
  }
}

/**
 * 写入一条 Memory。
 * 同 (sourceApp, sourceId) 的旧记录会被替换（保留旧 id）。
 * 成功返回 entry，失败返回 null。
 */
export function pushMemory(
  draft: MemoryDraft
): MemoryEntry | null {
  const list = loadMemory();

  const existingIdx = list.findIndex(
    (e) =>
      e.sourceApp === draft.sourceApp &&
      e.sourceId === draft.sourceId
  );

  const id =
    existingIdx >= 0 ? list[existingIdx].id : createMemoryId();
  const entry: MemoryEntry = { ...draft, id };

  const next =
    existingIdx >= 0
      ? list.map((e, i) => (i === existingIdx ? entry : e))
      : [...list, entry];

  next.sort((a, b) => b.timestamp - a.timestamp);

  const ok = saveMemory(next);
  return ok ? entry : null;
}

export function deleteMemoryEntry(id: string): boolean {
  const list = loadMemory();
  const next = list.filter((e) => e.id !== id);
  if (next.length === list.length) return false;
  return saveMemory(next);
}

export function clearMemory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** 按 App 过滤 */
export function getMemoryByApp(
  app: MemorySourceApp
): MemoryEntry[] {
  return loadMemory().filter((e) => e.sourceApp === app);
}

/** 按时间范围过滤（含边界，毫秒） */
export function getMemoryByRange(
  from: number,
  to: number
): MemoryEntry[] {
  return loadMemory().filter(
    (e) => e.timestamp >= from && e.timestamp <= to
  );
}

function isValidEntry(raw: unknown): raw is MemoryEntry {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.sourceApp === "string" &&
    typeof o.sourceId === "string" &&
    typeof o.timestamp === "number" &&
    typeof o.type === "string" &&
    typeof o.title === "string"
  );
}