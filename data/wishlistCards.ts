import type { WishlistCard } from "@/data/notes";

function make(
  character: "Levi" | "Erwin",
  texts: string[]
): WishlistCard[] {
  return texts.map((text, i) => ({
    id: `${character}-wish-default-${i}`,
    character,
    text,
    enabled: true,
  }));
}

const LEVI = [
  "想一起去吃一家很安静的餐厅。",
  "想找一天什么都不做。",
  "想一起去海边。",
  "想和你一起看一次日出。",
  "想给你做一次饭。",
  "想在下雨天一起待着。",
  "想一起看一场电影。",
  "想买一对杯子。",
  "想一起去一次书店。",
  "想找一天早点睡。",
  "想一起去天台吹风。",
  "想给你泡一杯茶。",
  "想和你一起看一场雨。",
  "想一起去一次远方。",
  "想找一天什么都不说，只是坐在一起。",
];

const ERWIN = [
  "想和你一起去看一次日落。",
  "想一起旅行。",
  "想和你去一次海边。",
  "想找一个安静的下午看书。",
  "想一起去一家咖啡馆。",
  "想给你留一封信。",
  "想和你一起看一场雪。",
  "想一起吃一次蛋糕。",
  "想一起看一次老电影。",
  "想陪你散一次长步。",
  "想一起去逛一次旧书店。",
  "想和你一起做一次晚饭。",
  "想在雨天听一整张唱片。",
  "想找一个周末去附近的小镇。",
  "想和你一起看一次夕阳。",
];

export const DEFAULT_WISHLIST_CARDS: WishlistCard[] = [
  ...make("Levi", LEVI),
  ...make("Erwin", ERWIN),
];

export function pickWishlistCard(
  cards: WishlistCard[]
): WishlistCard | null {
  const pool = cards.filter((c) => c.enabled);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}