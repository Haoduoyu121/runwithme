const SOURCES_KEY = "runwithme_read_sources_v1";

export type ReadSource = {
  id: string;
  name: string;
  url: string;
  addedAt: number;
  lastUsedAt: number;
};

const MAX_SOURCES = 40;

function createId(): string {
  return `src-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isValidSource(raw: unknown): raw is ReadSource {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.url === "string" &&
    typeof o.addedAt === "number"
  );
}

export function loadSources(): ReadSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SOURCES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidSource)
      .sort(
        (a, b) =>
          (b.lastUsedAt ?? b.addedAt) -
          (a.lastUsedAt ?? a.addedAt)
      );
  } catch (e) {
    console.error("[readSources] 加载失败:", e);
    return [];
  }
}

function persist(list: ReadSource[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      SOURCES_KEY,
      JSON.stringify(list)
    );
    return true;
  } catch (e) {
    console.error("[readSources] 保存失败:", e);
    return false;
  }
}

export function addSource(
  name: string,
  url: string
): ReadSource | null {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  if (!trimmedName || !trimmedUrl) return null;

  const list = loadSources();

  /* 同 URL 去重：更新名字和 lastUsedAt */
  const existingIdx = list.findIndex(
    (s) => s.url === trimmedUrl
  );
  if (existingIdx >= 0) {
    const next = list.map((s, i) =>
      i === existingIdx
        ? {
            ...s,
            name: trimmedName,
            lastUsedAt: Date.now(),
          }
        : s
    );
    persist(next);
    return next[existingIdx];
  }

  const entry: ReadSource = {
    id: createId(),
    name: trimmedName,
    url: trimmedUrl,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  let next = [entry, ...list];
  if (next.length > MAX_SOURCES) {
    next = next.slice(0, MAX_SOURCES);
  }
  persist(next);
  return entry;
}

export function removeSource(id: string): ReadSource[] {
  const next = loadSources().filter((s) => s.id !== id);
  persist(next);
  return next;
}

export function touchSource(id: string): void {
  const list = loadSources();
  const next = list.map((s) =>
    s.id === id ? { ...s, lastUsedAt: Date.now() } : s
  );
  persist(next);
}

/** 用 URL 反推一个默认书源名 */
export function guessSourceName(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const last =
      u.pathname.split("/").filter(Boolean).pop() ?? "";
    const base = last.replace(/\.(txt|epub)$/i, "");
    if (base) return `${host} · ${base.slice(0, 20)}`;
    return host;
  } catch {
    return url.slice(0, 30);
  }
}