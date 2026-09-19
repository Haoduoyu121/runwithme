/**
 * Search 统一索引
 *
 * 设计原则：
 * - 不依赖任何 App 的 storage 模块（避免类型依赖 + 避免写数据）
 * - 直接读 localStorage 原始 JSON，用结构化探测字段
 * - 每个数据源是一个 SOURCES 条目，扩展只需追加
 * - 结果按时间倒序（无时间戳的按 0）
 */

export type SearchSourceApp =
  | "memory"
  | "music"
  | "notes"
  | "wishlist"
  | "chat"
  | "letter";

export type IndexedItem = {
  /** 全局唯一 key：`${sourceApp}:${sourceId}` */
  id: string;
  sourceApp: SearchSourceApp;
  sourceId: string;
  title: string;
  body?: string;
  timestamp: number;
};

/* ---------- 类型安全的字段探测 ---------- */

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0
    ? v
    : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v)
    ? v
    : undefined;
}

function readRawArray(
  key: string
): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is Record<string, unknown> =>
        x !== null && typeof x === "object"
    );
  } catch {
    return [];
  }
}

/* ---------- 数据源定义 ---------- */

type MappedItem = {
  title: string;
  body?: string;
  timestamp: number;
  sourceId: string;
} | null;

type SourceDef = {
  app: SearchSourceApp;
  key: string;
  map: (raw: Record<string, unknown>) => MappedItem;
};

const SOURCES: SourceDef[] = [
  {
    app: "memory",
    key: "runwithme_memory_v1",
    map: (raw) => {
      const sourceId = asString(raw.id);
      const title = asString(raw.title);
      if (!sourceId || !title) return null;
      return {
        title,
        body: asString(raw.preview),
        timestamp: asNumber(raw.timestamp) ?? 0,
        sourceId,
      };
    },
  },
  {
    app: "music",
    key: "runwithme_music",
    map: (raw) => {
      const sourceId = asString(raw.id);
      const title = asString(raw.title);
      if (!sourceId || !title) return null;
      return {
        title,
        body: asString(raw.artist),
        timestamp: 0,
        sourceId,
      };
    },
  },
  {
    app: "notes",
    key: "runwithme_notes",
    map: (raw) => {
      const sourceId = asString(raw.id);
      if (!sourceId) return null;
      const title =
        asString(raw.title) || "（无标题）";
      const body = asString(raw.body);
      const timestamp =
        asNumber(raw.updatedAt) ??
        asNumber(raw.createdAt) ??
        0;
      return { title, body, timestamp, sourceId };
    },
  },
  {
    app: "wishlist",
    key: "runwithme_wishlist",
    map: (raw) => {
      const sourceId = asString(raw.id);
      const text = asString(raw.text);
      if (!sourceId || !text) return null;
      return {
        title: text,
        timestamp: 0,
        sourceId,
      };
    },
  },
  {
    app: "chat",
    key: "runwithme_chat_messages",
    map: (raw) => {
      const sourceId = asString(raw.id);
      if (!sourceId) return null;
      if (asString(raw.type) !== "text") return null;
      const text = asString(raw.text);
      if (!text) return null;
      const sender = asString(raw.sender);
      return {
        title: text.length > 80
          ? text.slice(0, 80) + "…"
          : text,
        body: sender ? `— ${sender}` : undefined,
        timestamp: asNumber(raw.timestamp) ?? 0,
        sourceId,
      };
    },
  },
  {
    app: "letter",
    key: "runwithme_letters",
    map: (raw) => {
      const sourceId = asString(raw.id);
      if (!sourceId) return null;
      const title =
        asString(raw.title) ||
        asString(raw.subject) ||
        "（无标题）";
      const body =
        asString(raw.body) ||
        asString(raw.content);
      return {
        title,
        body: body
          ? body.length > 120
            ? body.slice(0, 120) + "…"
            : body
          : undefined,
        timestamp:
          asNumber(raw.createdAt) ??
          asNumber(raw.timestamp) ??
          0,
        sourceId,
      };
    },
  },
];

/* ---------- 构建 ---------- */

export function buildSearchIndex(): IndexedItem[] {
  const out: IndexedItem[] = [];

  for (const source of SOURCES) {
    const raws = readRawArray(source.key);
    for (const raw of raws) {
      const mapped = source.map(raw);
      if (!mapped) continue;
      out.push({
        id: `${source.app}:${mapped.sourceId}`,
        sourceApp: source.app,
        sourceId: mapped.sourceId,
        title: mapped.title,
        body: mapped.body,
        timestamp: mapped.timestamp,
      });
    }
  }

  /* 按时间倒序 */
  out.sort((a, b) => b.timestamp - a.timestamp);
  return out;
}