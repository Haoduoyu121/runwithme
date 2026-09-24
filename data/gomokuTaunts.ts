export const WIN_TAUNTS: Record<"levi" | "erwin", string[]> = {
  levi: [
    "就这？",
    "还没热身完。",
    "再来。",
    "你走神了。",
    "三步之内，你输在哪我都能说出来。",
    "别急，慢慢来。",
    "这局不算，下一局也不一定算。",
  ],
  erwin: [
    "不错的开局，可惜。",
    "你已经接近了，再想想。",
    "很聪明的走法，不过我看得更远。",
    "差一点点。",
    "这就是经验。",
    "再来一局？我还想陪你。",
    "你下得比我预想的好——但结果不变。",
  ],
};

export const LOSE_TAUNTS: Record<"levi" | "erwin", string[]> = {
  levi: [
    "……运气。",
    "再来。",
    "这局我让你了。",
    "你的手比我想象中稳。",
    "啧。",
  ],
  erwin: [
    "输给你，是件愉快的事。",
    "你赢了。这次是真的。",
    "我要重新估量你。",
    "好，我承认。",
    "值得。",
    "再来一局，我想看你赢第二次。",
  ],
};

export const MID_TAUNTS: Record<"levi" | "erwin", string[]> = {
  levi: [
    "这里我要了。",
    "别犹豫。",
    "想好了吗。",
    "你每一步我都记着。",
    "嗯……有意思。",
  ],
  erwin: [
    "这是个选择。",
    "你想清楚了吗？",
    "还来得及。",
    "不急，慢慢想。",
    "我看得见你的意图。",
  ],
};

export function pickTaunt(
  who: "levi" | "erwin",
  kind: "win" | "lose" | "mid"
): string {
  const pool =
    kind === "win"
      ? WIN_TAUNTS[who]
      : kind === "lose"
        ? LOSE_TAUNTS[who]
        : MID_TAUNTS[who];
  return pool[Math.floor(Math.random() * pool.length)];
}