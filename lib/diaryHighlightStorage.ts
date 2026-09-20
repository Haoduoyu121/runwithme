import type {
  DiaryHighlight,
  HighlightCard,
} from "@/data/diaryHighlights";
import { DEFAULT_HIGHLIGHT_CARDS } from "@/data/diaryHighlights";

const HIGHLIGHT_KEY = "runwithme_diary_highlights";
const CARD_KEY = "runwithme_highlight_cards";

export function loadHighlights(): DiaryHighlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIGHLIGHT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.noteId === "string" &&
        (c.author === "user" ||
          c.author === "Levi" ||
          c.author === "Erwin") &&
        typeof c.text === "string" &&
        typeof c.occurrence === "number" &&
        typeof c.createdAt === "number"
    );
  } catch {
    return [];
  }
}

export function saveHighlights(
  list: DiaryHighlight[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    HIGHLIGHT_KEY,
    JSON.stringify(list)
  );
}

export function loadHighlightCards(): HighlightCard[] {
  if (typeof window === "undefined")
    return DEFAULT_HIGHLIGHT_CARDS;
  try {
    const raw = window.localStorage.getItem(CARD_KEY);
    if (!raw) {
      window.localStorage.setItem(
        CARD_KEY,
        JSON.stringify(DEFAULT_HIGHLIGHT_CARDS)
      );
      return DEFAULT_HIGHLIGHT_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return DEFAULT_HIGHLIGHT_CARDS;
    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        (c.character === "Levi" ||
          c.character === "Erwin") &&
        typeof c.text === "string" &&
        typeof c.enabled === "boolean"
    );
  } catch {
    return DEFAULT_HIGHLIGHT_CARDS;
  }
}

export function saveHighlightCards(
  list: HighlightCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CARD_KEY,
    JSON.stringify(list)
  );
}