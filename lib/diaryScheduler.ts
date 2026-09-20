import type { Note } from "@/data/notes";
import { createNoteId } from "@/data/notes";
import type {
  DiaryCharacter,
  DiaryMoodCard,
  DiaryContentCard,
  DiaryContentCategory,
} from "@/data/diaryCards";
import {
  createHighlightId,
  type DiaryHighlight,
} from "@/data/diaryHighlights";
import {
  loadMoodCards,
  loadContentCards,
  loadSchedulerState,
  saveSchedulerState,
} from "./diaryCardsStorage";
import { loadHighlightCards } from "./diaryHighlightStorage";
import { inferOccurrence } from "./diaryTextUtils";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN_GAP = 16 * HOUR;
const MAX_GAP = 24 * HOUR;

export type DiarySchedulerResult = {
  notes: Note[];
  highlights: DiaryHighlight[];
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickCount(): number {
  const r = Math.random();
  if (r < 0.4) return 0;
  if (r < 0.75) return 1;
  if (r < 0.95) return 2;
  return 3;
}

function pickCharacter(): DiaryCharacter {
  return Math.random() < 0.5 ? "Levi" : "Erwin";
}

function pickMood(
  cards: DiaryMoodCard[]
): string | undefined {
  const pool = cards.filter((c) => c.enabled);
  if (pool.length === 0) return undefined;
  return pool[Math.floor(Math.random() * pool.length)].mood;
}

function pickFrom<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function poolByCategory(
  cards: DiaryContentCard[],
  character: DiaryCharacter,
  category: DiaryContentCategory
): DiaryContentCard[] {
  return cards.filter(
    (c) =>
      c.character === character &&
      c.category === category &&
      c.enabled
  );
}

function buildDiaryBody(
  cards: DiaryContentCard[],
  character: DiaryCharacter
): string | null {
  const body = pickFrom(
    poolByCategory(cards, character, "body")
  );
  if (!body) return null;

  if (/[。！？.!?]$/.test(body.text)) {
    return body.text;
  }

  const opening = pickFrom(
    poolByCategory(cards, character, "opening")
  );
  const closing = pickFrom(
    poolByCategory(cards, character, "closing")
  );

  let result = "";
  if (opening) result += opening.text + "，";
  result += body.text + "。";
  if (closing) result += closing.text;

  return result;
}

function pickSentenceFrom(
  body: string
): { text: string; occurrence: number } | null {
  type S = { text: string; start: number };
  const sentences: S[] = [];
  let buf = "";
  let bufStart = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (!buf) bufStart = i;
    buf += ch;
    if ("。！？!?".includes(ch)) {
      sentences.push({ text: buf, start: bufStart });
      buf = "";
    }
  }
  if (buf) sentences.push({ text: buf, start: bufStart });

  const valid = sentences.filter((s) => {
    const t = s.text.trim();
    return t.length >= 8 && t.length <= 40;
  });
  if (valid.length === 0) return null;

  const picked = pickFrom(valid);
  if (!picked) return null;

  const trimmed = picked.text
    .trim()
    .replace(/[。！？!?.]+$/, "");
  if (!trimmed) return null;

  const occurrence = inferOccurrence(
    body,
    trimmed,
    picked.start
  );
  return { text: trimmed, occurrence };
}

export function ensureDiaryScheduler(
  existingNotes: Note[]
): DiarySchedulerResult {
  const empty: DiarySchedulerResult = {
    notes: [],
    highlights: [],
  };

  if (typeof window === "undefined") return empty;

  const now = Date.now();
  const state = loadSchedulerState();

  if (!state) {
    saveSchedulerState({
      lastCheckedAt: now,
      nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
    });
    return empty;
  }

  if (now < state.nextCheckAt) return empty;

  /* ---------- 1. 生成新日记 ---------- */

  const count = pickCount();
  const moodCards = loadMoodCards();
  const contentCards = loadContentCards();
  const generated: Note[] = [];

  for (let i = 0; i < count; i++) {
    const character = pickCharacter();
    const mood = pickMood(moodCards);
    const body = buildDiaryBody(
      contentCards,
      character
    );
    if (!body) continue;

    const createdAt = now + i * 1000;
    generated.push({
      id: createNoteId(),
      kind: "diary",
      author: character,
      title: "",
      body,
      tags: [],
      mood,
      createdAt,
      updatedAt: createdAt,
    });
  }

  /* ---------- 2. 角色划用户的日记 ---------- */

  const newHighlights: DiaryHighlight[] = [];

  const userDiaries = existingNotes.filter(
    (n) =>
      n.kind === "diary" &&
      n.author === "user" &&
      now - n.createdAt < 7 * DAY
  );

  if (userDiaries.length > 0 && Math.random() < 0.5) {
    const target = pickFrom(userDiaries);
    if (target) {
      const character: DiaryCharacter =
        Math.random() < 0.5 ? "Levi" : "Erwin";
      const picked = pickSentenceFrom(target.body);
      if (picked) {
        const cards = loadHighlightCards();
        const pool = cards.filter(
          (c) =>
            c.character === character && c.enabled
        );
        const card = pickFrom(pool);
        if (card) {
          newHighlights.push({
            id: createHighlightId(),
            noteId: target.id,
            author: character,
            text: picked.text,
            occurrence: picked.occurrence,
            note: card.text,
            createdAt: now + 5000,
          });
        }
      }
    }
  }

  saveSchedulerState({
    lastCheckedAt: now,
    nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
  });

  return { notes: generated, highlights: newHighlights };
}