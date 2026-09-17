import type { BlockCard } from "@/data/checkin";
import { DEFAULT_BLOCK_CARDS } from "@/data/checkinBlockCards";

const BLOCK_CARDS_KEY = "runwithme_checkin_block_cards";

export function loadBlockCards(): BlockCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_BLOCK_CARDS;
  }
  try {
    const raw = window.localStorage.getItem(
      BLOCK_CARDS_KEY
    );
    if (!raw) {
      window.localStorage.setItem(
        BLOCK_CARDS_KEY,
        JSON.stringify(DEFAULT_BLOCK_CARDS)
      );
      return DEFAULT_BLOCK_CARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_BLOCK_CARDS;
    }
    return parsed;
  } catch {
    return DEFAULT_BLOCK_CARDS;
  }
}

export function saveBlockCards(list: BlockCard[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BLOCK_CARDS_KEY,
    JSON.stringify(list)
  );
}