export type UnoColor = "red" | "yellow" | "green" | "blue";
export type UnoCardColor = UnoColor | "wild";
export type UnoCardType =
  | "num"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export type UnoCard = {
  id: string;
  color: UnoCardColor;
  type: UnoCardType;
  num?: number;
};

export const UNO_COLORS: UnoColor[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

export const COLOR_LABELS: Record<UnoColor, string> = {
  red: "红",
  yellow: "黄",
  green: "绿",
  blue: "蓝",
};

let _idSeq = 0;
function genId(): string {
  _idSeq++;
  return "u" + Date.now().toString(36) + "-" + _idSeq;
}

export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of UNO_COLORS) {
    /* 0 一张 */
    deck.push({ id: genId(), color, type: "num", num: 0 });
    /* 1-9 各两张 */
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: genId(), color, type: "num", num: n });
      deck.push({ id: genId(), color, type: "num", num: n });
    }
    /* 跳过/反转/+2 各两张 */
    for (let k = 0; k < 2; k++) {
      deck.push({ id: genId(), color, type: "skip" });
      deck.push({ id: genId(), color, type: "reverse" });
      deck.push({ id: genId(), color, type: "draw2" });
    }
  }
  /* 万能牌 */
  for (let k = 0; k < 4; k++) {
    deck.push({ id: genId(), color: "wild", type: "wild" });
    deck.push({ id: genId(), color: "wild", type: "wild4" });
  }
  return deck;
}

export function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardLabel(c: UnoCard): string {
  if (c.type === "num") return String(c.num);
  if (c.type === "skip") return "⊘";
  if (c.type === "reverse") return "⇋";
  if (c.type === "draw2") return "+2";
  if (c.type === "wild") return "🌈";
  if (c.type === "wild4") return "+4";
  return "?";
}

export function canPlay(
  card: UnoCard,
  topCard: UnoCard,
  currentColor: UnoColor
): boolean {
  if (card.color === "wild") return true;
  if (card.color === currentColor) return true;
  if (
    card.type === "num" &&
    topCard.type === "num" &&
    card.num === topCard.num
  )
    return true;
  if (card.type !== "num" && card.type === topCard.type) return true;
  return false;
}

/* ---------- AI ---------- */

export function pickCardAI(
  hand: UnoCard[],
  topCard: UnoCard,
  currentColor: UnoColor
): UnoCard | null {
  const playable = hand.filter((c) =>
    canPlay(c, topCard, currentColor)
  );
  if (playable.length === 0) return null;

  /* 优先级：让下家难受 > 万能 > 数字 > 功能 */

  /* 1. 优先让对方摸牌或跳过 */
  const draw2 = playable.find((c) => c.type === "draw2");
  if (draw2) return draw2;

  const skip = playable.find((c) => c.type === "skip");
  if (skip) return skip;

  /* 2. 数字牌优先匹配当前色（避免过早浪费万能牌） */
  const sameColorNum = playable
    .filter((c) => c.type === "num" && c.color === currentColor)
    .sort((a, b) => (b.num ?? 0) - (a.num ?? 0));
  if (sameColorNum.length > 0) return sameColorNum[0];

  /* 3. 其他数字牌 */
  const otherNum = playable.filter((c) => c.type === "num");
  if (otherNum.length > 0) return otherNum[0];

  /* 4. 反转 */
  const rev = playable.find((c) => c.type === "reverse");
  if (rev) return rev;

  /* 5. 万能牌 */
  const wild4 = playable.find((c) => c.type === "wild4");
  if (wild4) return wild4;
  const wild = playable.find((c) => c.type === "wild");
  if (wild) return wild;

  return playable[0];
}

/** AI 选色：手里哪种色最多就选哪种；万能牌全无色，返回随机 */
export function pickColorAI(hand: UnoCard[]): UnoColor {
  const counts: Record<UnoColor, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    blue: 0,
  };
  for (const c of hand) {
    if (c.color !== "wild") counts[c.color]++;
  }
  let best: UnoColor = "red";
  let bestN = -1;
  for (const color of UNO_COLORS) {
    if (counts[color] > bestN) {
      bestN = counts[color];
      best = color;
    }
  }
  return best;
}

/* ---------- 抽牌 ---------- */

export function drawFromDeck(
  deck: UnoCard[],
  discard: UnoCard[],
  n: number
): {
  cards: UnoCard[];
  deck: UnoCard[];
  discard: UnoCard[];
} {
  let d = [...deck];
  let disc = [...discard];
  const out: UnoCard[] = [];

  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      /* 洗牌：保留弃牌堆最上面一张 */
      if (disc.length <= 1) break;
      const top = disc[disc.length - 1];
      const rest = disc.slice(0, disc.length - 1);
      /* 万能牌重新洗入牌堆时，颜色恢复为 wild 无副作用 */
      d = shuffle(rest);
      disc = [top];
    }
    const c = d.shift();
    if (!c) break;
    out.push(c);
  }

  return { cards: out, deck: d, discard: disc };
}