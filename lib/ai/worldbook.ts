const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

export type WorldbookPosition = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const POSITION_LABELS: Record<
  WorldbookPosition,
  string
> = {
  0: "角色前",
  1: "角色后",
  2: "作者注前",
  3: "作者注后",
  4: "@深度",
  5: "示例前",
  6: "示例后",
};

export type WorldbookEntry = {
  id: string;
  keywords: string[];
  content: string;
  enabled: boolean;
  constant: boolean;
  caseSensitive: boolean;
  position: WorldbookPosition;
  depth: number;
};

export type Worldbook = {
  id: string;
  name: string;
  enabled: boolean;
  entries: WorldbookEntry[];
};

function genId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    prefix +
    "-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function newEntry(): WorldbookEntry {
  return {
    id: genId("wb-e"),
    keywords: [],
    content: "",
    enabled: true,
    constant: false,
    caseSensitive: false,
    position: 1,
    depth: 0,
  };
}

export function newWorldbook(name = "新世界书"): Worldbook {
  return {
    id: genId("wb-b"),
    name,
    enabled: true,
    entries: [],
  };
}

/* ---------- 归一化 ---------- */

function normalizeEntry(raw: unknown): WorldbookEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<WorldbookEntry>;
  const pos = e.position;
  const position: WorldbookPosition =
    typeof pos === "number" &&
    pos >= 0 &&
    pos <= 6 &&
    Number.isInteger(pos)
      ? (pos as WorldbookPosition)
      : 1;
  return {
    id:
      typeof e.id === "string" && e.id
        ? e.id
        : genId("wb-e"),
    keywords: Array.isArray(e.keywords)
      ? e.keywords.filter(
          (x): x is string => typeof x === "string"
        )
      : [],
    content: typeof e.content === "string" ? e.content : "",
    enabled: e.enabled !== false,
    constant: !!e.constant,
    caseSensitive: !!e.caseSensitive,
    position,
    depth:
      typeof e.depth === "number" && e.depth >= 0
        ? Math.floor(e.depth)
        : 0,
  };
}

function normalizeBook(raw: unknown): Worldbook | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Partial<Worldbook>;
  const entries = Array.isArray(b.entries)
    ? (b.entries
        .map(normalizeEntry)
        .filter(
          (x): x is WorldbookEntry => !!x
        ) as WorldbookEntry[])
    : [];
  return {
    id:
      typeof b.id === "string" && b.id
        ? b.id
        : genId("wb-b"),
    name:
      typeof b.name === "string" && b.name.trim()
        ? b.name.trim()
        : "未命名世界书",
    enabled: b.enabled !== false,
    entries,
  };
}

/* ---------- API ---------- */

export async function loadWorldbooks(
  cardId: string
): Promise<Worldbook[]> {
  try {
    const r = await fetch(
      `${API_BASE}/api/ai/worldbook/${encodeURIComponent(
        cardId
      )}`
    );
    if (!r.ok) return [];
    const data = await r.json();
    const payload = data?.entries;

    /* 新格式：{ books: Worldbook[] } */
    if (
      payload &&
      !Array.isArray(payload) &&
      Array.isArray(payload.books)
    ) {
      return (payload.books as unknown[])
        .map(normalizeBook)
        .filter((x): x is Worldbook => !!x);
    }

    /* 旧格式：WorldbookEntry[] -> 包成"默认"书 */
    if (Array.isArray(payload)) {
      const entries = (payload as unknown[])
        .map(normalizeEntry)
        .filter(
          (x): x is WorldbookEntry => !!x
        ) as WorldbookEntry[];
      if (entries.length === 0) return [];
      return [
        {
          id: "default",
          name: "默认世界书",
          enabled: true,
          entries,
        },
      ];
    }

    return [];
  } catch {
    return [];
  }
}

export async function saveWorldbooks(
  cardId: string,
  books: Worldbook[]
): Promise<void> {
  await fetch(
    `${API_BASE}/api/ai/worldbook/${encodeURIComponent(
      cardId
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: { books } }),
    }
  );
}

/* 展平：用于对话页触发检测 */
export function flattenBooks(
  books: Worldbook[]
): WorldbookEntry[] {
  const out: WorldbookEntry[] = [];
  for (const b of books) {
    if (!b.enabled) continue;
    for (const e of b.entries) out.push(e);
  }
  return out;
}

/* ---------- SillyTavern JSON 导入 ---------- */

type STEntry = {
  uid?: number;
  key?: string[];
  content?: string;
  comment?: string;
  constant?: boolean;
  disable?: boolean;
  caseSensitive?: boolean;
  position?: number | string;
  depth?: number;
};

type STWorldbook = {
  name?: string;
  entries?: Record<string, STEntry>;
};

function parseSTPosition(v: unknown): WorldbookPosition {
  if (typeof v === "number" && v >= 0 && v <= 6) {
    return v as WorldbookPosition;
  }
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 6) {
      return n as WorldbookPosition;
    }
    const m: Record<string, WorldbookPosition> = {
      before_char: 0,
      after_char: 1,
      before_an: 2,
      after_an: 3,
      at_depth: 4,
      before_em: 5,
      after_em: 6,
    };
    if (v in m) return m[v];
  }
  return 1;
}

/** 把 ST 世界书解析成一本 Worldbook（可能包含多个条目） */
export function parseSillyTavernWorldbook(
  json: unknown,
  fallbackName = "导入的世界书"
): Worldbook {
  const wb = (json || {}) as STWorldbook;
  const raw = wb.entries;
  if (!raw || typeof raw !== "object") {
    throw new Error("不是有效的世界书格式（缺少 entries）");
  }

  const entries: WorldbookEntry[] = [];
  for (const [k, e] of Object.entries(raw)) {
    if (!e || typeof e !== "object") continue;
    const keys = Array.isArray(e.key) ? e.key : [];
    const content =
      typeof e.content === "string" ? e.content : "";
    if (!content) continue;
    entries.push({
      id: `st-${k}-${Math.random().toString(36).slice(2, 6)}`,
      keywords: keys.filter(
        (x) => typeof x === "string" && x.trim()
      ),
      content,
      enabled: !e.disable,
      constant: !!e.constant,
      caseSensitive: !!e.caseSensitive,
      position: parseSTPosition(e.position),
      depth:
        typeof e.depth === "number" && e.depth >= 0
          ? Math.floor(e.depth)
          : 0,
    });
  }

  return {
    id: genId("wb-b"),
    name:
      typeof wb.name === "string" && wb.name.trim()
        ? wb.name.trim()
        : fallbackName,
    enabled: true,
    entries,
  };
}

/* ---------- 触发 ---------- */

function buildRecentText(
  messages: { role: string; content: string }[],
  windowSize = 6
): string {
  const recent = messages
    .filter((m) => m.role !== "system")
    .slice(-windowSize);
  return recent.map((m) => m.content).join("\n");
}

export type TriggeredByPos = {
  beforeChar: WorldbookEntry[];
  afterChar: WorldbookEntry[];
  beforeAn: WorldbookEntry[];
  afterAn: WorldbookEntry[];
  atDepth: WorldbookEntry[];
  beforeEm: WorldbookEntry[];
  afterEm: WorldbookEntry[];
};

const EMPTY: TriggeredByPos = {
  beforeChar: [],
  afterChar: [],
  beforeAn: [],
  afterAn: [],
  atDepth: [],
  beforeEm: [],
  afterEm: [],
};

export function collectTriggered(
  entries: WorldbookEntry[],
  messages: { role: string; content: string }[]
): TriggeredByPos {
  if (entries.length === 0) return EMPTY;

  const text = buildRecentText(messages);
  const lower = text.toLowerCase();

  function active(e: WorldbookEntry): boolean {
    if (!e.enabled) return false;
    if (e.constant) return true;
    if (!text) return false;
    if (e.keywords.length === 0) return false;
    return e.keywords.some((kw) => {
      if (!kw) return false;
      const k = e.caseSensitive ? kw : kw.toLowerCase();
      const t = e.caseSensitive ? text : lower;
      return t.includes(k);
    });
  }

  const out: TriggeredByPos = {
    beforeChar: [],
    afterChar: [],
    beforeAn: [],
    afterAn: [],
    atDepth: [],
    beforeEm: [],
    afterEm: [],
  };

  for (const e of entries) {
    if (!active(e)) continue;
    switch (e.position) {
      case 0:
        out.beforeChar.push(e);
        break;
      case 2:
        out.beforeAn.push(e);
        break;
      case 3:
        out.afterAn.push(e);
        break;
      case 4:
        out.atDepth.push(e);
        break;
      case 5:
        out.beforeEm.push(e);
        break;
      case 6:
        out.afterEm.push(e);
        break;
      case 1:
      default:
        out.afterChar.push(e);
    }
  }
  return out;
}

export function formatEntries(
  entries: WorldbookEntry[]
): string {
  if (entries.length === 0) return "";
  return entries.map((e) => `- ${e.content}`).join("\n");
}