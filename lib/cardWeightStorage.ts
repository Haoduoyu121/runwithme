export type CardWeights = {
  text: number;
  sticker: number;
  voice: number;
  pat: number;
  gallery: number;
};

export const DEFAULT_CARD_WEIGHTS: CardWeights = {
  text: 60,
  sticker: 16,
  voice: 16,
  pat: 8,
  gallery: 10,
};

const KEY = "runwithme_card_weights_v1";

export function loadCardWeights(): CardWeights {
  if (typeof window === "undefined") {
    return { ...DEFAULT_CARD_WEIGHTS };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_CARD_WEIGHTS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_CARD_WEIGHTS };
    }

    const p = parsed as Partial<CardWeights>;
    return {
      text:
        typeof p.text === "number"
          ? Math.max(0, p.text)
          : DEFAULT_CARD_WEIGHTS.text,
      sticker:
        typeof p.sticker === "number"
          ? Math.max(0, p.sticker)
          : DEFAULT_CARD_WEIGHTS.sticker,
      voice:
        typeof p.voice === "number"
          ? Math.max(0, p.voice)
          : DEFAULT_CARD_WEIGHTS.voice,
      pat:
        typeof p.pat === "number"
          ? Math.max(0, p.pat)
          : DEFAULT_CARD_WEIGHTS.pat,
      gallery:
        typeof p.gallery === "number"
          ? Math.max(0, p.gallery)
          : DEFAULT_CARD_WEIGHTS.gallery,
    };
  } catch {
    return { ...DEFAULT_CARD_WEIGHTS };
  }
}

export function saveCardWeights(w: CardWeights): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(w));
  } catch (e) {
    console.error("保存抽卡权重失败:", e);
  }
}

export function resetCardWeights(): CardWeights {
  const d = { ...DEFAULT_CARD_WEIGHTS };
  saveCardWeights(d);
  return d;
}