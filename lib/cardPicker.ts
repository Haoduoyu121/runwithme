import type {
  CharacterCard,
  CardType,
  Character,
} from "@/data/cards";
import type { GalleryItem } from "@/data/gallery";
import { loadGalleryByOwner } from "@/lib/galleryStorage";
import { loadCardWeights } from "@/lib/cardWeightStorage";

export type PickedCard = {
  card: CharacterCard;
  character: Character;
  emojiPrefix?: string;
  emojiSuffix?: string;
  standaloneEmoji?: string;
};

const EMOJI_ATTACH_CHANCE = 0.14;
const EMOJI_STANDALONE_CHANCE = 0.33;

/* 用户可调整的抽卡类型 */
type UserPickableType =
  | "text"
  | "sticker"
  | "voice"
  | "pat"
  | "gallery";

function filterAvailable(
  allCards: CharacterCard[],
  character: Character
): CharacterCard[] {
  return allCards.filter(
    (c) =>
      c.enabled &&
      (c.character === "Shared" ||
        c.character === character)
  );
}

function pickFromPool(
  pool: CharacterCard[]
): CharacterCard | null {
  if (pool.length === 0) return null;
  return pool[
    Math.floor(Math.random() * pool.length)
  ];
}

function buildTypeWeights(
  available: CharacterCard[],
  galleryItems: GalleryItem[]
): { type: UserPickableType; weight: number }[] {
  const weights = loadCardWeights();
  const list: { type: UserPickableType; weight: number }[] =
    [];

  for (const t of [
    "text",
    "sticker",
    "voice",
    "pat",
  ] as const) {
    if (
      available.some((c) => c.type === t) &&
      weights[t] > 0
    ) {
      list.push({ type: t, weight: weights[t] });
    }
  }

  if (galleryItems.length > 0 && weights.gallery > 0) {
    list.push({
      type: "gallery",
      weight: weights.gallery,
    });
  }

  return list;
}

export function pickCardWithRules(
  allCards: CharacterCard[]
): PickedCard | null {
  const primary: Character =
    Math.random() < 0.5 ? "Levi" : "Erwin";

  /* 一次性读两个角色的图库 */
  const galleryMap: Record<Character, GalleryItem[]> = {
    Levi: loadGalleryByOwner("Levi").filter(
      (g) => g.enabled
    ),
    Erwin: loadGalleryByOwner("Erwin").filter(
      (g) => g.enabled
    ),
  };

  function tryCharacter(
    character: Character
  ): PickedCard | null {
    const available = filterAvailable(
      allCards,
      character
    );

    const galleryItems = galleryMap[character] ?? [];

    if (
      available.length === 0 &&
      galleryItems.length === 0
    ) {
      return null;
    }

    const typeWeights = buildTypeWeights(
      available,
      galleryItems
    );
    if (typeWeights.length === 0) return null;

    const total = typeWeights.reduce(
      (s, w) => s + w.weight,
      0
    );
    let r = Math.random() * total;
    let chosenType: UserPickableType =
      typeWeights[0].type;

    for (const item of typeWeights) {
      r -= item.weight;
      if (r <= 0) {
        chosenType = item.type;
        break;
      }
    }

    /* ---------- gallery 分支 ---------- */
    if (chosenType === "gallery") {
      const picked =
        galleryItems[
          Math.floor(Math.random() * galleryItems.length)
        ];
      const virtualCard: CharacterCard = {
        id: `gallery-${picked.id}`,
        character,
        type: "gallery" as CardType,
        text: "",
        category: "gallery",
        enabled: true,
        mediaId: picked.id,
      };
      return { card: virtualCard, character };
    }

    /* ---------- 普通卡分支 ---------- */
    const pool = available.filter(
      (c) => c.type === chosenType
    );
    const card = pickFromPool(pool);
    if (!card) return null;

    let emojiPrefix: string | undefined;
    let emojiSuffix: string | undefined;
    let standaloneEmoji: string | undefined;

    if (
      chosenType === "text" &&
      Math.random() < EMOJI_ATTACH_CHANCE
    ) {
      const emojis = available.filter(
        (c) => c.type === "emoji"
      );
      if (emojis.length > 0) {
        const emoji = pickFromPool(emojis)?.text ?? "";
        if (emoji) {
          if (
            Math.random() < EMOJI_STANDALONE_CHANCE
          ) {
            standaloneEmoji = emoji;
          } else if (Math.random() < 0.5) {
            emojiPrefix = emoji;
          } else {
            emojiSuffix = emoji;
          }
        }
      }
    }

    return {
      card,
      character,
      emojiPrefix,
      emojiSuffix,
      standaloneEmoji,
    };
  }

  let picked = tryCharacter(primary);
  if (!picked) {
    const fallback: Character =
      primary === "Levi" ? "Erwin" : "Levi";
    picked = tryCharacter(fallback);
  }

  return picked;
}