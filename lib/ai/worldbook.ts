const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

export type WorldbookEntry = {
  id: string;
  keywords: string[];
  content: string;
  enabled: boolean;
  /** true = 总是注入，不看关键词 */
  constant: boolean;
  caseSensitive: boolean;
};

function genId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    "wb-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

export function newEntry(): WorldbookEntry {
  return {
    id: genId(),
    keywords: [],
    content: "",
    enabled: true,
    constant: false,
    caseSensitive: false,
  };
}

export async function loadWorldbook(
  cardId: string
): Promise<WorldbookEntry[]> {
  try {
    const r = await fetch(
      `${API_BASE}/api/ai/worldbook/${encodeURIComponent(cardId)}`
    );
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

export async function saveWorldbook(
  cardId: string,
  entries: WorldbookEntry[]
): Promise<void> {
  await fetch(
    `${API_BASE}/api/ai/worldbook/${encodeURIComponent(cardId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    }
  );
}

/* ---------- SillyTavern JSON 世界书导入 ---------- */

type STEntry = {
  uid?: number;
  key?: string[];
  keysecondary?: string[];
  content?: string;
  comment?: string;
  constant?: boolean;
  disable?: boolean;
  caseSensitive?: boolean;
};

type STWorldbook = {
  entries?: Record<string, STEntry>;
};

export function parseSillyTavernWorldbook(
  json: unknown
): WorldbookEntry[] {
  const wb = json as STWorldbook;
  const raw = wb?.entries;
  if (!raw || typeof raw !== "object") {
    throw new Error("不是有效的世界书格式（缺少 entries）");
  }

  const out: WorldbookEntry[] = [];
  for (const [k, e] of Object.entries(raw)) {
    if (!e || typeof e !== "object") continue;
    const keys = Array.isArray(e.key) ? e.key : [];
    const content = typeof e.content === "string" ? e.content : "";
    if (!content) continue;
    out.push({
      id: `st-${k}-${Math.random().toString(36).slice(2, 6)}`,
      keywords: keys.filter(
        (x) => typeof x === "string" && x.trim()
      ),
      content,
      enabled: !e.disable,
      constant: !!e.constant,
      caseSensitive: !!e.caseSensitive,
    });
  }
  return out;
}

/* ---------- 触发 ---------- */

/** 从最近消息里构建待匹配文本 */
function buildRecentText(
  messages: { role: string; content: string }[],
  windowSize = 6
): string {
  const recent = messages
    .filter((m) => m.role !== "system")
    .slice(-windowSize);
  return recent.map((m) => m.content).join("\n");
}

export function collectTriggered(
  entries: WorldbookEntry[],
  messages: { role: string; content: string }[]
): WorldbookEntry[] {
  const text = buildRecentText(messages);
  if (!text) {
    /* 还没聊，只注入 constant */
    return entries.filter((e) => e.enabled && e.constant);
  }
  const lower = text.toLowerCase();
  return entries.filter((e) => {
    if (!e.enabled) return false;
    if (e.constant) return true;
    if (e.keywords.length === 0) return false;
    return e.keywords.some((kw) => {
      if (!kw) return false;
      const k = e.caseSensitive ? kw : kw.toLowerCase();
      const t = e.caseSensitive ? text : lower;
      return t.includes(k);
    });
  });
}

export function buildWorldbookBlock(
  triggered: WorldbookEntry[]
): string {
  if (triggered.length === 0) return "";
  const lines = triggered.map((e) => `- ${e.content}`);
  return `[世界书 / 设定参考]\n${lines.join("\n")}`;
}