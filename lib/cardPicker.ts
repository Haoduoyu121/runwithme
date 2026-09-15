import type {
  CharacterCard,
  CardType,
  Character,
} from "@/data/cards";

export type PickedCard = {
  card: CharacterCard;
  character: Character;
  /* 文本卡附加的 emoji */
  emojiPrefix?: string;
  emojiSuffix?: string;
  /* 单独发出的 emoji */
  standaloneEmoji?: string;
};

/* 类型权重（拍一拍 / 语音 / 表情包 / 文本） */
const TYPE_WEIGHTS: Record<
  Exclude<CardType, "emoji">,
  number
> = {
  sticker: 33,
  voice: 22,
  pat: 11,
  text: 55,
};

/* 文本卡附加 emoji 的概率 */
const EMOJI_ATTACH_CHANCE = 0.14;

/* 附加 emoji 时，单独发出的概率（其余附加到文本） */
const EMOJI_STANDALONE_CHANCE = 0.33;

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

/* 主抽卡函数 */
export function pickCardWithRules(
  allCards: CharacterCard[]
): PickedCard | null {
  const primary: Character =
    Math.random() < 0.5 ? "Levi" : "Erwin";

  function tryCharacter(
    character: Character
  ): PickedCard | null {
    const available = filterAvailable(
      allCards,
      character
    );
    if (available.length === 0) return null;

    /* 收集有卡的类型和权重 */
    const types: Exclude<CardType, "emoji">[] = [];
    const weights: number[] = [];

    for (const t of [
      "sticker",
      "voice",
      "pat",
      "text",
    ] as Exclude<CardType, "emoji">[]) {
      if (available.some((c) => c.type === t)) {
        types.push(t);
        weights.push(TYPE_WEIGHTS[t]);
      }
    }

    if (types.length === 0) return null;

    /* 归一化并选择类型 */
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let chosenType: Exclude<CardType, "emoji"> =
      types[0];

    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosenType = types[i];
        break;
      }
    }

    /* 从该类型池里抽一张 */
    const pool = available.filter(
      (c) => c.type === chosenType
    );
    const card = pickFromPool(pool);
    if (!card) return null;

    /* 文本卡：可能附加 emoji */
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