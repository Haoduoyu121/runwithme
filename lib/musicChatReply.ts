import {
  cards as defaultCards,
  type CharacterCard,
} from "@/data/cards";

import { loadCards } from "@/lib/storage";
import { pickCardWithRules } from "@/lib/cardPicker";

/* Music 聊天专属分类名 */
export const MUSIC_CATEGORY = "music";

/* 所有 category === "music" 的卡片 */
export function loadMusicCards(): CharacterCard[] {
  const all = loadCards(defaultCards);
  return all.filter((c) => c.category === MUSIC_CATEGORY);
}

/* 只筛选：启用 + 文字类型的卡 */
export function getEnabledMusicCards(): CharacterCard[] {
  return loadMusicCards().filter(
    (c) => c.enabled && c.type === "text"
  );
}

export type MusicReply = {
  sender: "Levi" | "Erwin";
  text: string;
};

/* 随机抽一条回复，如果没有可用卡返回 null */
export function generateMusicReply(
  allowedSenders?: ("Levi" | "Erwin")[]
): MusicReply | null {
  let cards = getEnabledMusicCards();

  if (allowedSenders && allowedSenders.length > 0) {
    cards = cards.filter((c) =>
      allowedSenders.includes(
        c.character as "Levi" | "Erwin"
      )
    );
  }

  if (cards.length === 0) return null;

  const picked = pickCardWithRules(cards);
  if (!picked) return null;

  const {
    card,
    character,
    emojiPrefix,
    emojiSuffix,
  } = picked;

  if (card.type !== "text") return null;

  if (
    allowedSenders &&
    allowedSenders.length > 0 &&
    !allowedSenders.includes(
      character as "Levi" | "Erwin"
    )
  ) {
    return null;
  }

  let text = card.text;
  if (emojiPrefix) text = `${emojiPrefix} ${text}`;
  if (emojiSuffix) text = `${text} ${emojiSuffix}`;

  return {
    sender: character as "Levi" | "Erwin",
    text,
  };
}