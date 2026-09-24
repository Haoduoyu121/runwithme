import type { AiStyle } from "./gomoku";

export type PlayerId = "you" | "levi" | "erwin";

/* ---------- 玩家基础属性 ---------- */

export const PLAYER_PROFILE: Record<
  PlayerId,
  {
    name: string;
    acceptRate: number;
    undoAcceptRate: number;
    undoRequestRate: number;
  }
> = {
  you: {
    name: "你",
    acceptRate: 1,
    undoAcceptRate: 1,
    undoRequestRate: 0,
  },
  levi: {
    name: "Levi",
    acceptRate: 0.75,
    undoAcceptRate: 0.55,
    undoRequestRate: 0.03,
  },
  erwin: {
    name: "Erwin",
    acceptRate: 0.9,
    undoAcceptRate: 0.7,
    undoRequestRate: 0.05,
  },
};

export const REFUSE_LINES: Record<"levi" | "erwin", string[]> = {
  levi: ["不。", "没空。", "下次。", "自己下。", "……"],
  erwin: ["现在不太方便。", "改天吧，抱歉。", "我有别的事。", "下次一定。"],
};

export function pickRefuseLine(who: "levi" | "erwin"): string {
  const pool = REFUSE_LINES[who];
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- 风格设置（可调） ---------- */

const STYLE_KEY = "runwithme_gomoku_styles_v1";

export type PlayerStyle = {
  levi: AiStyle;
  erwin: AiStyle;
};

export const DEFAULT_STYLES: PlayerStyle = {
  levi: "aggressive",
  erwin: "balanced",
};

function isValidStyle(v: unknown): v is AiStyle {
  return (
    v === "aggressive" ||
    v === "defensive" ||
    v === "balanced" ||
    v === "chaotic"
  );
}

export function loadStyles(): PlayerStyle {
  if (typeof window === "undefined") return DEFAULT_STYLES;
  try {
    const raw = JSON.parse(localStorage.getItem(STYLE_KEY) || "{}");
    return {
      levi: isValidStyle(raw.levi) ? raw.levi : DEFAULT_STYLES.levi,
      erwin: isValidStyle(raw.erwin) ? raw.erwin : DEFAULT_STYLES.erwin,
    };
  } catch {
    return DEFAULT_STYLES;
  }
}

export function saveStyles(s: PlayerStyle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STYLE_KEY, JSON.stringify(s));
}

/* ---------- 思考时间：2-30s ---------- */

export const THINK_MIN_MS = 2000;
export const THINK_MAX_MS = 30000;

export function randomThinkMs(): number {
  return (
    THINK_MIN_MS +
    Math.random() * (THINK_MAX_MS - THINK_MIN_MS)
  );
}