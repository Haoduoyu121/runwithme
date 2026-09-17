/* =========================================================
   RunWithme · Study Storage
   ========================================================= */

import type {
  WordBook,
  Word,
  DailySentence,
  StudyCheerCard,
  DailyStudyRecord,
  StudySettings,
} from "@/data/study";

import {
  DEFAULT_STUDY_SETTINGS,
} from "@/data/study";

import {
  DEFAULT_STUDY_CHEER_CARDS,
} from "@/data/studyCheerCards";

import {
  DEFAULT_DAILY_SENTENCES,
} from "@/data/dailySentences";

const BOOKS_KEY = "runwithme_study_books_v1";
const WORDS_KEY = "runwithme_study_words_v1";
const CHEER_KEY = "runwithme_study_cheer_v1";
const DAILY_SENTENCE_KEY =
  "runwithme_study_daily_sentences_v1";
const RECORDS_KEY = "runwithme_study_records_v1";
const SETTINGS_KEY = "runwithme_study_settings_v1";

/* ---------- 通用读写 ---------- */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("保存失败:", key, e);
  }
}

/* ---------- 词书 ---------- */

export function loadBooks(): WordBook[] {
  const raw = readJSON<unknown>(BOOKS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is WordBook =>
      !!b &&
      typeof b === "object" &&
      typeof (b as WordBook).id === "string" &&
      typeof (b as WordBook).name === "string"
  );
}

export function saveBooks(list: WordBook[]): void {
  writeJSON(BOOKS_KEY, list);
}

/* ---------- 单词 ---------- */

export function loadWords(): Word[] {
  const raw = readJSON<unknown>(WORDS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (w): w is Word =>
      !!w &&
      typeof w === "object" &&
      typeof (w as Word).id === "string" &&
      typeof (w as Word).bookId === "string" &&
      typeof (w as Word).text === "string"
  );
}

export function saveWords(list: Word[]): void {
  writeJSON(WORDS_KEY, list);
}

/* ---------- 鼓励气泡卡池 ---------- */

export function loadCheerCards(): StudyCheerCard[] {
  const raw = readJSON<unknown>(CHEER_KEY, null);
  if (!Array.isArray(raw)) {
    writeJSON(CHEER_KEY, DEFAULT_STUDY_CHEER_CARDS);
    return DEFAULT_STUDY_CHEER_CARDS;
  }
  return raw.filter(
    (c): c is StudyCheerCard =>
      !!c &&
      typeof c === "object" &&
      typeof (c as StudyCheerCard).id === "string" &&
      typeof (c as StudyCheerCard).text === "string"
  );
}

export function saveCheerCards(list: StudyCheerCard[]): void {
  writeJSON(CHEER_KEY, list);
}

/* ---------- 每日一句池 ---------- */

export function loadDailySentences(): DailySentence[] {
  const raw = readJSON<unknown>(DAILY_SENTENCE_KEY, null);
  if (!Array.isArray(raw)) {
    writeJSON(
      DAILY_SENTENCE_KEY,
      DEFAULT_DAILY_SENTENCES
    );
    return DEFAULT_DAILY_SENTENCES;
  }
  return raw.filter(
    (s): s is DailySentence =>
      !!s &&
      typeof s === "object" &&
      typeof (s as DailySentence).id === "string" &&
      typeof (s as DailySentence).text === "string"
  );
}

export function saveDailySentences(
  list: DailySentence[]
): void {
  writeJSON(DAILY_SENTENCE_KEY, list);
}

/* ---------- 每日记录 ---------- */

export function loadRecords(): DailyStudyRecord[] {
  const raw = readJSON<unknown>(RECORDS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is DailyStudyRecord =>
      !!r &&
      typeof r === "object" &&
      typeof (r as DailyStudyRecord).dateStr === "string"
  );
}

export function saveRecords(
  list: DailyStudyRecord[]
): void {
  writeJSON(RECORDS_KEY, list);
}

/* ---------- 设置 ---------- */

export function loadStudySettings(): StudySettings {
  const raw = readJSON<unknown>(SETTINGS_KEY, null);
  if (
    raw &&
    typeof raw === "object" &&
    typeof (raw as StudySettings).ttsRate === "number"
  ) {
    const r = raw as Partial<StudySettings>;
    return {
      cheerFrequency:
        r.cheerFrequency === "low" ||
        r.cheerFrequency === "medium" ||
        r.cheerFrequency === "high"
          ? r.cheerFrequency
          : "medium",
      ttsRate:
        typeof r.ttsRate === "number"
          ? Math.max(0.5, Math.min(1.5, r.ttsRate))
          : 0.9,
      audioSource:
        r.audioSource === "tts" ||
        r.audioSource === "mp3" ||
        r.audioSource === "auto"
          ? r.audioSource
          : "tts",
      defaultVoice:
        r.defaultVoice === "levi" ||
        r.defaultVoice === "erwin"
          ? r.defaultVoice
          : "levi",
      ttsVoiceName:
        typeof r.ttsVoiceName === "string"
          ? r.ttsVoiceName
          : null,
      sessionSize:
        typeof r.sessionSize === "number" &&
        r.sessionSize >= 1 &&
        r.sessionSize <= 500
          ? Math.round(r.sessionSize)
          : 20,
    };
  }
  return DEFAULT_STUDY_SETTINGS;
}

export function saveStudySettings(
  s: StudySettings
): void {
  writeJSON(SETTINGS_KEY, s);
}

/* ---------- 每日一句：今天抽哪句 ---------- */

const TODAY_SENTENCE_KEY = "runwithme_study_today_sentence_v1";

type TodaySentenceCache = {
  dateStr: string;
  sentenceId: string;
};

export function getTodaySentence(
  all: DailySentence[]
): DailySentence | null {
  if (typeof window === "undefined") return null;
  if (all.length === 0) return null;

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(
    2,
    "0"
  )}`;

  try {
    const raw = window.localStorage.getItem(
      TODAY_SENTENCE_KEY
    );
    if (raw) {
      const parsed = JSON.parse(raw) as TodaySentenceCache;
      if (parsed.dateStr === dateStr) {
        const found = all.find(
          (s) => s.id === parsed.sentenceId
        );
        if (found) return found;
      }
    }
  } catch {}

  /* 抽一句（只从 enabled 的抽） */
  const pool = all.filter((s) => s.enabled);
  if (pool.length === 0) return null;
  const picked =
    pool[Math.floor(Math.random() * pool.length)];

  writeJSON(TODAY_SENTENCE_KEY, {
    dateStr,
    sentenceId: picked.id,
  });

  return picked;
}

/* ---------- 每日一句：系统收藏标记 ---------- */

const TODAY_SYS_COLLECT_KEY =
  "runwithme_study_today_sys_collect_v1";

export function hasSystemCollectedToday(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(
      TODAY_SYS_COLLECT_KEY
    );
    if (!raw) return false;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${String(d.getDate()).padStart(
      2,
      "0"
    )}`;
    return raw === today;
  } catch {
    return false;
  }
}

export function markSystemCollectedToday(): void {
  if (typeof window === "undefined") return;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
  try {
    window.localStorage.setItem(
      TODAY_SYS_COLLECT_KEY,
      today
    );
  } catch {}
}