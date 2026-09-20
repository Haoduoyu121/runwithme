export type HighlightAuthor = "user" | "Levi" | "Erwin";

export type DiaryHighlight = {
  id: string;
  noteId: string;
  author: HighlightAuthor;
  text: string;
  occurrence: number;
  note?: string;
  createdAt: number;
};

export type HighlightCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

export function createHighlightId(): string {
  return `hl-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createHighlightCardId(
  character: "Levi" | "Erwin"
): string {
  return `hc-${character}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- 默认评价卡池 ---------- */

export const DEFAULT_HIGHLIGHT_CARDS: HighlightCard[] = [
  // Levi
  { id: "hc-levi-0", character: "Levi", text: "这句写得不错。", enabled: true },
  { id: "hc-levi-1", character: "Levi", text: "我懂你的意思。", enabled: true },
  { id: "hc-levi-2", character: "Levi", text: "嗯，跟我猜的差不多。", enabled: true },
  { id: "hc-levi-3", character: "Levi", text: "别憋着，可以多说点。", enabled: true },
  { id: "hc-levi-4", character: "Levi", text: "看到这句，我停了一下。", enabled: true },
  { id: "hc-levi-5", character: "Levi", text: "你那天心情应该不太好。", enabled: true },
  { id: "hc-levi-6", character: "Levi", text: "我也这么想。", enabled: true },
  { id: "hc-levi-7", character: "Levi", text: "下次告诉我。", enabled: true },
  { id: "hc-levi-8", character: "Levi", text: "这句我记住了。", enabled: true },
  { id: "hc-levi-9", character: "Levi", text: "写得挺真的。", enabled: true },
  { id: "hc-levi-10", character: "Levi", text: "其实你不说我也知道。", enabled: true },
  { id: "hc-levi-11", character: "Levi", text: "嗯。", enabled: true },
  // Erwin
  { id: "hc-erwin-0", character: "Erwin", text: "这句话说得很真诚。", enabled: true },
  { id: "hc-erwin-1", character: "Erwin", text: "我能理解你当时的心情。", enabled: true },
  { id: "hc-erwin-2", character: "Erwin", text: "有些话写下来就轻了。", enabled: true },
  { id: "hc-erwin-3", character: "Erwin", text: "这让我想起一件事。", enabled: true },
  { id: "hc-erwin-4", character: "Erwin", text: "愿你以后少些这样的时刻。", enabled: true },
  { id: "hc-erwin-5", character: "Erwin", text: "不必勉强自己。", enabled: true },
  { id: "hc-erwin-6", character: "Erwin", text: "很动人。", enabled: true },
  { id: "hc-erwin-7", character: "Erwin", text: "我为你感到高兴。", enabled: true },
  { id: "hc-erwin-8", character: "Erwin", text: "这一段值得留着。", enabled: true },
  { id: "hc-erwin-9", character: "Erwin", text: "能写出来，已经很好了。", enabled: true },
  { id: "hc-erwin-10", character: "Erwin", text: "我懂。", enabled: true },
  { id: "hc-erwin-11", character: "Erwin", text: "等见到你再聊。", enabled: true },
];