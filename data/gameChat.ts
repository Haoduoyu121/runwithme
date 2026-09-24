export type GameChatPhase =
  | "opening"
  | "mid"
  | "winning"
  | "losing"
  | "undo-request"
  | "undo-accept"
  | "undo-refuse";

type LinePool = Record<GameChatPhase, string[]>;

export const GAME_CHAT_LINES: Record<"you" | "levi" | "erwin", LinePool> = {
  you: {
    opening: ["开始吧。", "手下留情。", "我先走。"],
    mid: ["嗯……", "让我想想。", "这步不错。", "有意思。"],
    winning: ["快到了。", "这下麻烦了。", "承让。"],
    losing: ["……", "别高兴太早。", "再来。", "我还没输。"],
    "undo-request": ["我可以悔一步吗？"],
    "undo-accept": ["……好吧。", "就这一次。"],
    "undo-refuse": ["不行。", "落子无悔。"],
  },
  levi: {
    opening: [
      "开始。",
      "别磨蹭。",
      "快点落子。",
      "你执黑，先。",
      "不用废话。",
    ],
    mid: [
      "这里我要了。",
      "嗯。",
      "……",
      "想好了吗。",
      "你犹豫了。",
      "看到了。",
      "无聊。",
    ],
    winning: [
      "结束了。",
      "你看到了吗？",
      "还差一步。",
      "嗯，就这样。",
    ],
    losing: [
      "……运气。",
      "再来一局。",
      "这局不算。",
      "你的手比平时稳。",
      "啧。",
    ],
    "undo-request": ["……让我悔一步。"],
    "undo-accept": ["嗯。"],
    "undo-refuse": ["落子无悔。"],
  },
  erwin: {
    opening: [
      "请。",
      "你先。",
      "慢慢来。",
      "我很期待。",
      "开始吧。",
    ],
    mid: [
      "不错的开局。",
      "你在试探我。",
      "我看得见。",
      "再想想。",
      "这一步有意思。",
      "嗯，我记下了。",
      "有点意思。",
    ],
    winning: [
      "接近了。",
      "你还有机会。",
      "看这边。",
      "这就是经验。",
    ],
    losing: [
      "输给你，是件愉快的事。",
      "我要重新估量你。",
      "你赢了。这次是真的。",
      "值得。",
      "好。",
    ],
    "undo-request": ["请允许我收回一步。"],
    "undo-accept": ["当然。"],
    "undo-refuse": ["落子无悔，朋友。"],
  },
};

export function pickChatLine(
  who: "you" | "levi" | "erwin",
  phase: GameChatPhase
): string {
  const pool = GAME_CHAT_LINES[who][phase];
  if (!pool || pool.length === 0) return "……";
  return pool[Math.floor(Math.random() * pool.length)];
}