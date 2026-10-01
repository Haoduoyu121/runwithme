/* =========================================================
   Runwithme · 自由造句生成
   ========================================================= */

import type { CharacterCard, Character } from "@/data/cards";
import {
  SENTENCE_PUNCT_CHARS,
  type SentenceSettings,
  type SentenceJoinMode,
} from "@/data/sentence";

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 组装池子：字池 + (可选) 当前角色的 text 卡
 */
function buildPool(
  cards: CharacterCard[],
  character: Character,
  settings: SentenceSettings
): string[] {
  const words = [...settings.wordPool];

  if (settings.includeWholeCards) {
    const textCards = cards.filter(
      (c) =>
        c.enabled &&
        c.type === "text" &&
        (c.character === "Shared" ||
          c.character === character) &&
        c.text.trim().length > 0
    );
    for (const c of textCards) {
      words.push(c.text);
    }
  }

  return words;
}

/**
 * 按模式拼接
 */
function joinWords(
  words: string[],
  mode: SentenceJoinMode,
  punctChance: number
): string {
  const effectiveMode: SentenceJoinMode =
    mode === "random"
      ? (["none", "space", "punct"] as const)[
          Math.floor(Math.random() * 3)
        ]
      : mode;

  if (effectiveMode === "none") {
    return words.join("");
  }

  if (effectiveMode === "space") {
    return words.join(" ");
  }

  /* punct：每个词后按概率加标点 */
  let out = "";
  for (const w of words) {
    out += w;
    if (Math.random() < punctChance) {
      const p = pickRandom(SENTENCE_PUNCT_CHARS);
      if (p) out += p;
    }
  }
  return out;
}

/**
 * 生成一句话。失败返回 null。
 */
export function generateSentence(
  cards: CharacterCard[],
  character: Character,
  settings: SentenceSettings
): string | null {
  const pool = buildPool(cards, character, settings);
  if (pool.length === 0) return null;

  const count = randomInt(
    settings.wordCountMin,
    settings.wordCountMax
  );

  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    const w = pickRandom(pool);
    if (w !== null) picked.push(w);
  }

  if (picked.length === 0) return null;

  const result = joinWords(
    picked,
    settings.joinMode,
    settings.punctChance
  );

  const trimmed = result.trim();
  return trimmed.length > 0 ? trimmed : null;
}