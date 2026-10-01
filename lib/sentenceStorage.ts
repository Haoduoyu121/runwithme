"use client";

import {
  DEFAULT_SENTENCE_SETTINGS,
  type SentenceSettings,
  type SentenceJoinMode,
} from "@/data/sentence";

const KEY = "runwithme_sentence_settings_v1";

const VALID_JOIN: SentenceJoinMode[] = [
  "none",
  "space",
  "punct",
  "random",
];

export function loadSentenceSettings(): SentenceSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SENTENCE_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SENTENCE_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SENTENCE_SETTINGS };
    }

    const p = parsed as Partial<SentenceSettings>;

    const joinMode: SentenceJoinMode =
      typeof p.joinMode === "string" &&
      VALID_JOIN.includes(p.joinMode as SentenceJoinMode)
        ? (p.joinMode as SentenceJoinMode)
        : DEFAULT_SENTENCE_SETTINGS.joinMode;

    const wordPool =
      Array.isArray(p.wordPool) &&
      p.wordPool.every((w) => typeof w === "string")
        ? (p.wordPool as string[])
        : [...DEFAULT_SENTENCE_SETTINGS.wordPool];

    return {
      enabled:
        typeof p.enabled === "boolean"
          ? p.enabled
          : DEFAULT_SENTENCE_SETTINGS.enabled,
      chance:
        typeof p.chance === "number"
          ? Math.max(0, Math.min(1, p.chance))
          : DEFAULT_SENTENCE_SETTINGS.chance,
      wordCountMin:
        typeof p.wordCountMin === "number"
          ? Math.max(1, Math.min(50, p.wordCountMin))
          : DEFAULT_SENTENCE_SETTINGS.wordCountMin,
      wordCountMax:
        typeof p.wordCountMax === "number"
          ? Math.max(1, Math.min(50, p.wordCountMax))
          : DEFAULT_SENTENCE_SETTINGS.wordCountMax,
      joinMode,
      punctChance:
        typeof p.punctChance === "number"
          ? Math.max(0, Math.min(1, p.punctChance))
          : DEFAULT_SENTENCE_SETTINGS.punctChance,
      includeWholeCards:
        typeof p.includeWholeCards === "boolean"
          ? p.includeWholeCards
          : DEFAULT_SENTENCE_SETTINGS.includeWholeCards,
      wordPool,
    };
  } catch {
    return { ...DEFAULT_SENTENCE_SETTINGS };
  }
}

export function saveSentenceSettings(
  s: SentenceSettings
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.error("保存造句设置失败:", e);
  }
}

export function resetSentenceSettings(): SentenceSettings {
  const d = { ...DEFAULT_SENTENCE_SETTINGS };
  saveSentenceSettings(d);
  return d;
}