import type {
  QPost,
  DailyRecord,
  CharacterQuestionCard,
  AnswerCard,
  SystemQuestionCard,
} from "@/data/questionnaire";

import {
  DEFAULT_CHARACTER_QUESTIONS,
  DEFAULT_ANSWER_CARDS,
  DEFAULT_SYSTEM_QUESTIONS,
} from "@/data/questionnaireCards";

const POSTS_KEY = "runwithme_q_posts";
const DAILY_KEY = "runwithme_q_daily";
const CQ_KEY = "runwithme_q_character_cards";
const AC_KEY = "runwithme_q_answer_cards";
const SQ_KEY = "runwithme_q_system_cards";

/* ---------- posts ---------- */

export function loadQPosts(): QPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.question === "string"
    );
  } catch {
    return [];
  }
}

export function saveQPosts(list: QPost[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    POSTS_KEY,
    JSON.stringify(list)
  );
}

/* ---------- daily ---------- */

export function loadDailyRecords(): DailyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d) =>
        d &&
        typeof d.dateStr === "string" &&
        typeof d.postId === "string"
    );
  } catch {
    return [];
  }
}

export function saveDailyRecords(
  list: DailyRecord[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DAILY_KEY,
    JSON.stringify(list)
  );
}

/* ---------- character question cards ---------- */

export function loadCQCards(): CharacterQuestionCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_CHARACTER_QUESTIONS;
  }

  try {
    const raw = window.localStorage.getItem(CQ_KEY);
    if (!raw) {
      window.localStorage.setItem(
        CQ_KEY,
        JSON.stringify(DEFAULT_CHARACTER_QUESTIONS)
      );
      return DEFAULT_CHARACTER_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_CHARACTER_QUESTIONS;
    }
    return parsed;
  } catch {
    return DEFAULT_CHARACTER_QUESTIONS;
  }
}

export function saveCQCards(
  list: CharacterQuestionCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CQ_KEY,
    JSON.stringify(list)
  );
}

/* ---------- answer cards ---------- */

export function loadACCards(): AnswerCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_ANSWER_CARDS;
  }

  try {
    const raw = window.localStorage.getItem(AC_KEY);
    if (!raw) {
      window.localStorage.setItem(
        AC_KEY,
        JSON.stringify(DEFAULT_ANSWER_CARDS)
      );
      return DEFAULT_ANSWER_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ANSWER_CARDS;
    }
    return parsed;
  } catch {
    return DEFAULT_ANSWER_CARDS;
  }
}

export function saveACCards(list: AnswerCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AC_KEY,
    JSON.stringify(list)
  );
}

/* ---------- system question cards ---------- */

export function loadSQCards(): SystemQuestionCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_SYSTEM_QUESTIONS;
  }

  try {
    const raw = window.localStorage.getItem(SQ_KEY);
    if (!raw) {
      window.localStorage.setItem(
        SQ_KEY,
        JSON.stringify(DEFAULT_SYSTEM_QUESTIONS)
      );
      return DEFAULT_SYSTEM_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_SYSTEM_QUESTIONS;
    }
    return parsed;
  } catch {
    return DEFAULT_SYSTEM_QUESTIONS;
  }
}

export function saveSQCards(
  list: SystemQuestionCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SQ_KEY,
    JSON.stringify(list)
  );
}