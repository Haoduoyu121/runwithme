import type { ICityAuthor } from "@/data/icity";

export type ICityBioCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

const KEY = "runwithme_icity_bio_cards_v1";

export function createBioCardId(): string {
  return `icity-bio-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const DEFAULT_ICITY_BIO_CARDS: ICityBioCard[] = [
  /* ---------- Levi ---------- */
  {
    id: "icity-bio-default-levi-1",
    character: "Levi",
    text: "调查兵团 · 特别作战班。",
    enabled: true,
  },
  {
    id: "icity-bio-default-levi-2",
    character: "Levi",
    text: "话不多。做得比说得多。",
    enabled: true,
  },
  {
    id: "icity-bio-default-levi-3",
    character: "Levi",
    text: "世界是残酷的。接受它，然后活下去。",
    enabled: true,
  },
  {
    id: "icity-bio-default-levi-4",
    character: "Levi",
    text: "讨厌麻烦的事。但不会放过该做的事。",
    enabled: true,
  },
  {
    id: "icity-bio-default-levi-5",
    character: "Levi",
    text: "只要还站着，就没结束。",
    enabled: true,
  },

  /* ---------- Erwin ---------- */
  {
    id: "icity-bio-default-erwin-1",
    character: "Erwin",
    text: "调查兵团 · 第 13 任团长。",
    enabled: true,
  },
  {
    id: "icity-bio-default-erwin-2",
    character: "Erwin",
    text: "人类的自由，值得用一切换。",
    enabled: true,
  },
  {
    id: "icity-bio-default-erwin-3",
    character: "Erwin",
    text: "在答案揭晓之前，不要停下脚步。",
    enabled: true,
  },
  {
    id: "icity-bio-default-erwin-4",
    character: "Erwin",
    text: "背负一切，向前走。",
    enabled: true,
  },
  {
    id: "icity-bio-default-erwin-5",
    character: "Erwin",
    text: "信任不是免费的。但它值得。",
    enabled: true,
  },
];

export function loadBioCards(): ICityBioCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_ICITY_BIO_CARDS;
  }

  const saved = window.localStorage.getItem(KEY);
  if (!saved) return DEFAULT_ICITY_BIO_CARDS;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ICITY_BIO_CARDS;
    }
    const valid = parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        (c.character === "Levi" ||
          c.character === "Erwin") &&
        typeof c.text === "string" &&
        typeof c.enabled === "boolean"
    );
    return valid.length > 0
      ? valid
      : DEFAULT_ICITY_BIO_CARDS;
  } catch {
    return DEFAULT_ICITY_BIO_CARDS;
  }
}

export function saveBioCards(cards: ICityBioCard[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("[icityBioStorage] save failed:", e);
  }
}

export function pickRandomBio(
  cards: ICityBioCard[],
  character: "Levi" | "Erwin"
): string | null {
  const pool = cards.filter(
    (c) => c.enabled && c.character === character
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].text;
}