import {
  GAME_CHAT_POOL,
  type GameChatContext,
} from "@/data/gameChatPool";

const KEY = "runwithme_gameChatPool_v1";

export type Pool = Record<GameChatContext, string[]>;
export type StoredPool = Record<"levi" | "erwin", Pool>;

const ALL_CONTEXTS: GameChatContext[] = [
  "opening",
  "mid",
  "leading",
  "trailing",
  "tension",
  "won",
  "lost",
  "idle",
  "challenge",
  "undo",
  "smallTalk",
];

export const CONTEXT_LABELS: Record<GameChatContext, string> = {
  opening: "开局",
  mid: "中盘",
  leading: "领先",
  trailing: "落后",
  tension: "关键时刻",
  won: "赢了",
  lost: "输了",
  idle: "发呆",
  challenge: "挑衅",
  undo: "悔棋",
  smallTalk: "闲聊",
};

export { ALL_CONTEXTS };

function mergePool(def: Pool, custom: unknown): Pool {
  if (!custom || typeof custom !== "object") return { ...def };
  const c = custom as Record<string, unknown>;
  const out: Pool = { ...def };
  for (const k of ALL_CONTEXTS) {
    if (Array.isArray(c[k])) {
      out[k] = (c[k] as unknown[])
        .filter(
          (x): x is string => typeof x === "string" && x.trim() !== ""
        )
        .map((x) => x.trim());
    }
  }
  return out;
}

export function loadGameChatPool(): StoredPool {
  if (typeof window === "undefined") return GAME_CHAT_POOL;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return GAME_CHAT_POOL;
    const r = raw as Record<string, unknown>;
    return {
      levi: mergePool(GAME_CHAT_POOL.levi, r.levi),
      erwin: mergePool(GAME_CHAT_POOL.erwin, r.erwin),
    };
  } catch {
    return GAME_CHAT_POOL;
  }
}

export function saveGameChatPool(pool: StoredPool) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(pool));
}

export function resetGameChatPool() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function pickLine(
  pool: StoredPool,
  who: "levi" | "erwin",
  ctx: GameChatContext,
  exclude?: string
): string {
  const p = pool[who][ctx];
  if (!p || p.length === 0) return "……";
  if (p.length === 1) return p[0];
  let line = p[Math.floor(Math.random() * p.length)];
  let tries = 0;
  while (line === exclude && tries < 5) {
    line = p[Math.floor(Math.random() * p.length)];
    tries++;
  }
  return line;
}