import type { CharacterCard } from "@/data/cards";

const CARDS_STORAGE_KEY = "runwithme_character_cards";

/* -------------------------------------------------------
   去重

   - text / pat / emoji：按 归属 + 类型 + 文本 去重
   - voice / sticker：按 归属 + 类型 + mediaId 去重
     如果 mediaId 缺失，就按 id 去重
   ------------------------------------------------------- */

export function dedupeCards(
  cards: CharacterCard[]
): CharacterCard[] {
  const seen = new Set<string>();
  const result: CharacterCard[] = [];

  for (const card of cards) {
    let key: string;

    if (
      card.type === "text" ||
      card.type === "pat" ||
      card.type === "emoji"
    ) {
      key = `${card.character}|${card.type}|${card.text
        .trim()
        .toLowerCase()}`;
    } else {
      key = `${card.character}|${card.type}|${
        card.mediaId ?? card.id
      }`;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(card);
  }

  return result;
}

/* -------------------------------------------------------
   加载 / 保存
   ------------------------------------------------------- */

export function loadCards(
  defaultCards: CharacterCard[]
): CharacterCard[] {
  if (typeof window === "undefined") {
    return dedupeCards(defaultCards);
  }

  const saved = window.localStorage.getItem(
    CARDS_STORAGE_KEY
  );

  if (!saved) {
    const deduped = dedupeCards(defaultCards);

    window.localStorage.setItem(
      CARDS_STORAGE_KEY,
      JSON.stringify(deduped)
    );

    return deduped;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return dedupeCards(defaultCards);
    }

    return dedupeCards(parsed);
  } catch {
    return dedupeCards(defaultCards);
  }
}

export function saveCards(cardList: CharacterCard[]): void {
  if (typeof window === "undefined") return;

  /* ★ 保存时自动去重 */
  const deduped = dedupeCards(cardList);

  window.localStorage.setItem(
    CARDS_STORAGE_KEY,
    JSON.stringify(deduped)
  );
}

export function clearSavedCards(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(CARDS_STORAGE_KEY);
}