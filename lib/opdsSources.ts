const SOURCES_KEY = "runwithme_read_opds_sources_v1";

export type OpdsSource = {
  id: string;
  name: string;
  url: string;
  /** Calibre-Web 的 OPDS 账号（可选） */
  username?: string;
  /** Calibre-Web 的 OPDS 密码（可选） */
  password?: string;
  addedAt: number;
  lastUsedAt: number;
};

function createId(): string {
  return `opds-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isValid(raw: unknown): raw is OpdsSource {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.url === "string" &&
    typeof o.addedAt === "number"
  );
}

export function loadOpdsSources(): OpdsSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SOURCES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValid)
      .sort(
        (a, b) =>
          (b.lastUsedAt ?? b.addedAt) -
          (a.lastUsedAt ?? a.addedAt)
      );
  } catch (e) {
    console.error("[opdsSources] 加载失败:", e);
    return [];
  }
}

function persist(list: OpdsSource[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      SOURCES_KEY,
      JSON.stringify(list)
    );
    return true;
  } catch (e) {
    console.error("[opdsSources] 保存失败:", e);
    return false;
  }
}

export function addOpdsSource(
  name: string,
  url: string,
  username?: string,
  password?: string
): OpdsSource | null {
  const n = name.trim();
  const u = url.trim();
  if (!n || !u) return null;

  const list = loadOpdsSources();
  const idx = list.findIndex((s) => s.url === u);
  if (idx >= 0) {
    const next = list.map((s, i) =>
      i === idx
        ? {
            ...s,
            name: n,
            username: username?.trim() || undefined,
            password: password?.trim() || undefined,
            lastUsedAt: Date.now(),
          }
        : s
    );
    persist(next);
    return next[idx];
  }

  const entry: OpdsSource = {
    id: createId(),
    name: n,
    url: u,
    username: username?.trim() || undefined,
    password: password?.trim() || undefined,
    addedAt: Date.now(),
    lastUsedAt: Date.now(),
  };
  persist([entry, ...list]);
  return entry;
}

export function removeOpdsSource(id: string): OpdsSource[] {
  const next = loadOpdsSources().filter((s) => s.id !== id);
  persist(next);
  return next;
}

export function touchOpdsSource(id: string): void {
  const next = loadOpdsSources().map((s) =>
    s.id === id ? { ...s, lastUsedAt: Date.now() } : s
  );
  persist(next);
}

/** 从 URL 猜一个名字 */
export function guessOpdsName(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

/** 生成 Basic Auth 请求头 */
export function buildOpdsAuthHeader(
  source: OpdsSource | undefined | null
): Record<string, string> {
  if (!source?.username || !source?.password) return {};
  try {
    return {
      Authorization:
        "Basic " +
        btoa(`${source.username}:${source.password}`),
    };
  } catch {
    return {};
  }
}