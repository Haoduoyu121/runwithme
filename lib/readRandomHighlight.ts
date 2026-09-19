/**
 * Read · 随机划线
 *
 * 两种来源：
 *  1. 一起读期间，翻页 15% 触发
 *  2. 不在读时，每 24h 判定一次，7% 触发（划 2-3 条）
 *
 * 不做任何语义分析。纯随机 + 位置去重。
 */

import type { Highlight } from "./readHighlights";
import { createHighlightId } from "./readHighlights";

export type ReadingPartner = "levi" | "erwin";

/* ---------- Storage keys ---------- */

const CHAPTER_COUNT_KEY = "runwithme_read_hl_count_v1";
const AUTO_TIMER_KEY = "runwithme_read_auto_v1";
const POSITION_KEY = "runwithme_read_hl_pos_v1";
const LIMIT_KEY = "runwithme_read_hl_limit_v1";

/* ---------- 内部类型 ---------- */

type ChapterCountStore = Record<string, Record<string, number>>;
type AutoTimerStore = Record<string, number>;
type PositionStore = Record<string, string[]>;

/* ---------- 常量 ---------- */

const PAGE_TRIGGER_CHANCE = 0.15;
const AUTO_TRIGGER_CHANCE = 0.07;
const AUTO_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const COLLECT_CHANCE_MIN = 0.04;
const COLLECT_CHANCE_MAX = 0.07;

const MIN_SENTENCE_LEN = 8;
const MAX_SENTENCE_LEN = 80;

/** startOffset 相差在此值内，视为同一个位置（去重） */
const POSITION_CONFLICT_RANGE = 50;

const DEFAULT_CHAPTER_LIMIT = 3;

/* ---------- localStorage 工具 ---------- */

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("[readRandomHighlight] 保存失败:", key, e);
  }
}

/* ---------- 每章划线上限（用户可调） ---------- */

export function loadChapterLimit(): number {
  if (typeof window === "undefined") return DEFAULT_CHAPTER_LIMIT;
  try {
    const raw = window.localStorage.getItem(LIMIT_KEY);
    if (!raw) return DEFAULT_CHAPTER_LIMIT;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_CHAPTER_LIMIT;
    return Math.min(10, Math.floor(n));
  } catch {
    return DEFAULT_CHAPTER_LIMIT;
  }
}

export function saveChapterLimit(n: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIMIT_KEY, String(n));
  } catch (e) {
    console.error("[readRandomHighlight] 保存上限失败:", e);
  }
}

/* ---------- 每章触发次数 ---------- */

function getChapterCount(
  bookId: string,
  chapterIndex: number
): number {
  const store = loadJson<ChapterCountStore>(CHAPTER_COUNT_KEY, {});
  return store[bookId]?.[String(chapterIndex)] ?? 0;
}

function bumpChapterCount(
  bookId: string,
  chapterIndex: number
): void {
  const store = loadJson<ChapterCountStore>(CHAPTER_COUNT_KEY, {});
  if (!store[bookId]) store[bookId] = {};
  const key = String(chapterIndex);
  store[bookId][key] = (store[bookId][key] ?? 0) + 1;
  saveJson(CHAPTER_COUNT_KEY, store);
}

/* ---------- 24h 自主划线计时 ---------- */

function getLastAutoAt(bookId: string): number {
  const store = loadJson<AutoTimerStore>(AUTO_TIMER_KEY, {});
  return store[bookId] ?? 0;
}

function setLastAutoAt(bookId: string, t: number): void {
  const store = loadJson<AutoTimerStore>(AUTO_TIMER_KEY, {});
  store[bookId] = t;
  saveJson(AUTO_TIMER_KEY, store);
}

/* ---------- 已划位置记录 ---------- */

function getPositions(bookId: string): string[] {
  const store = loadJson<PositionStore>(POSITION_KEY, {});
  return store[bookId] ?? [];
}

function addPosition(
  bookId: string,
  chapterIndex: number,
  startOffset: number
): void {
  const store = loadJson<PositionStore>(POSITION_KEY, {});
  if (!store[bookId]) store[bookId] = [];
  store[bookId].push(`${chapterIndex}:${startOffset}`);
  saveJson(POSITION_KEY, store);
}

function conflictsWithExisting(
  bookId: string,
  chapterIndex: number,
  startOffset: number
): boolean {
  const positions = getPositions(bookId);
  for (const p of positions) {
    const [ch, off] = p.split(":").map(Number);
    if (ch !== chapterIndex) continue;
    if (Math.abs(off - startOffset) < POSITION_CONFLICT_RANGE) {
      return true;
    }
  }
  return false;
}

/* ---------- 句子切分 ---------- */

type Sentence = {
  text: string;
  start: number;
  end: number;
};

const BOUNDARY_RE = /[。！？!?…\n]/;

function extractSentences(chapterText: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;

  for (let i = 0; i < chapterText.length; i++) {
    if (!BOUNDARY_RE.test(chapterText[i])) continue;

    const raw = chapterText.slice(start, i + 1);
    const trimmed = raw.trim();
    if (
      trimmed.length >= MIN_SENTENCE_LEN &&
      trimmed.length <= MAX_SENTENCE_LEN
    ) {
      const leading = raw.length - raw.trimStart().length;
      const s = start + leading;
      out.push({
        text: trimmed,
        start: s,
        end: s + trimmed.length,
      });
    }
    start = i + 1;
  }

  if (start < chapterText.length) {
    const raw = chapterText.slice(start);
    const trimmed = raw.trim();
    if (
      trimmed.length >= MIN_SENTENCE_LEN &&
      trimmed.length <= MAX_SENTENCE_LEN
    ) {
      const leading = raw.length - raw.trimStart().length;
      const s = start + leading;
      out.push({
        text: trimmed,
        start: s,
        end: s + trimmed.length,
      });
    }
  }

  return out;
}

/* ---------- 挑一个句子 ---------- */

function pickSentence(
  bookId: string,
  chapterIndex: number,
  chapterText: string,
  extraExisting?: Highlight[]
): Sentence | null {
  const all = extractSentences(chapterText);
  if (all.length === 0) return null;

  const filtered = all.filter((s) => {
    if (conflictsWithExisting(bookId, chapterIndex, s.start)) {
      return false;
    }
    if (extraExisting) {
      for (const h of extraExisting) {
        if (
          Math.abs(h.startOffset - s.start) <
          POSITION_CONFLICT_RANGE
        ) {
          return false;
        }
      }
    }
    return true;
  });

  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/* ---------- 一起读：翻页触发 ---------- */

export type PageTriggerParams = {
  bookId: string;
  chapterIndex: number;
  chapterText: string;
  partners: ReadingPartner[];
  chapterLimit: number;
};

export function maybeTriggerPageHighlight(
  params: PageTriggerParams
): Highlight | null {
  const {
    bookId,
    chapterIndex,
    chapterText,
    partners,
    chapterLimit,
  } = params;

  if (partners.length === 0) return null;
  if (!chapterText) return null;
  if (Math.random() >= PAGE_TRIGGER_CHANCE) return null;

  const used = getChapterCount(bookId, chapterIndex);
  if (used >= chapterLimit) return null;

  const sentence = pickSentence(
    bookId,
    chapterIndex,
    chapterText
  );
  if (!sentence) return null;

  const character =
    partners[Math.floor(Math.random() * partners.length)];

  bumpChapterCount(bookId, chapterIndex);
  addPosition(bookId, chapterIndex, sentence.start);

  return {
    id: createHighlightId(),
    bookId,
    chapterIndex,
    startOffset: sentence.start,
    endOffset: sentence.end,
    text: sentence.text,
    kind: "highlight",
    author: character,
    createdAt: Date.now(),
  };
}

/* ---------- 24h 自主划线 ---------- */

export type AutoTriggerParams = {
  bookId: string;
  chapterIndex: number;
  chapterText: string;
};

export function maybeTriggerAutoHighlight(
  params: AutoTriggerParams
): Highlight[] {
  const { bookId, chapterIndex, chapterText } = params;

  if (!chapterText) return [];

  const last = getLastAutoAt(bookId);
  const now = Date.now();
  if (now - last < AUTO_MIN_INTERVAL_MS) return [];

  // 无论是否触发，都刷新时间戳
  setLastAutoAt(bookId, now);

  if (Math.random() >= AUTO_TRIGGER_CHANCE) return [];

  const count = 2 + Math.floor(Math.random() * 2); // 2 或 3
  const result: Highlight[] = [];

  for (let i = 0; i < count; i++) {
    const sentence = pickSentence(
      bookId,
      chapterIndex,
      chapterText,
      result
    );
    if (!sentence) break;

    const character: ReadingPartner =
      Math.random() < 0.5 ? "levi" : "erwin";

    addPosition(bookId, chapterIndex, sentence.start);

    result.push({
      id: createHighlightId(),
      bookId,
      chapterIndex,
      startOffset: sentence.start,
      endOffset: sentence.end,
      text: sentence.text,
      kind: "highlight",
      author: character,
      createdAt: Date.now(),
    });
  }

  return result;
}

/* ---------- 收藏概率 ---------- */

export function shouldCollectHighlight(): boolean {
  const p =
    COLLECT_CHANCE_MIN +
    Math.random() *
      (COLLECT_CHANCE_MAX - COLLECT_CHANCE_MIN);
  return Math.random() < p;
}