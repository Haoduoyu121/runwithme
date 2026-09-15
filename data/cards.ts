export type Character = "Levi" | "Erwin";

export type CardCharacter = Character | "Shared";

export type CardType =
  | "text"
  | "voice"
  | "sticker"
  | "pat"
  | "emoji";

export type CharacterCard = {
  id: string;
  character: CardCharacter;
  type: CardType;
  text: string;
  mediaId?: string;
  fileName?: string;
  category: string;
  enabled: boolean;
};

/* -------------------------------------------------------
   默认卡片
   ------------------------------------------------------- */

export const cards: CharacterCard[] = [
  /* Levi 文本 */
  {
    id: "levi-text-001",
    character: "Levi",
    type: "text",
    category: "日常",
    text: "那就休息。",
    enabled: true,
  },
  {
    id: "levi-text-002",
    character: "Levi",
    type: "text",
    category: "安慰",
    text: "别硬撑。",
    enabled: true,
  },
  {
    id: "levi-text-003",
    character: "Levi",
    type: "text",
    category: "安慰",
    text: "今天已经够累了。",
    enabled: true,
  },
  {
    id: "levi-text-004",
    character: "Levi",
    type: "text",
    category: "日常",
    text: "去喝点热的。",
    enabled: true,
  },
  {
    id: "levi-text-005",
    character: "Levi",
    type: "text",
    category: "亲密",
    text: "过来。坐下。",
    enabled: true,
  },

  /* Erwin 文本 */
  {
    id: "erwin-text-001",
    character: "Erwin",
    type: "text",
    category: "安慰",
    text: "今天辛苦了。",
    enabled: true,
  },
  {
    id: "erwin-text-002",
    character: "Erwin",
    type: "text",
    category: "安慰",
    text: "不必急着解决所有事情。",
    enabled: true,
  },
  {
    id: "erwin-text-003",
    character: "Erwin",
    type: "text",
    category: "日常",
    text: "明天再继续也可以。",
    enabled: true,
  },
  {
    id: "erwin-text-004",
    character: "Erwin",
    type: "text",
    category: "亲密",
    text: "我想，我们还有很多时间。",
    enabled: true,
  },
  {
    id: "erwin-text-005",
    character: "Erwin",
    type: "text",
    category: "日常",
    text: "你今天想聊点什么？",
    enabled: true,
  },

  /* 拍一拍示例（Levi / Erwin / Shared） */
  {
    id: "levi-pat-001",
    character: "Levi",
    type: "pat",
    category: "亲密",
    text: "拍了拍你的头",
    enabled: true,
  },
  {
    id: "levi-pat-002",
    character: "Levi",
    type: "pat",
    category: "亲密",
    text: "从背后轻轻抱住你",
    enabled: true,
  },
  {
    id: "erwin-pat-001",
    character: "Erwin",
    type: "pat",
    category: "亲密",
    text: "揉了揉你的头发",
    enabled: true,
  },
  {
    id: "erwin-pat-002",
    character: "Erwin",
    type: "pat",
    category: "亲密",
    text: "轻轻握住你的手",
    enabled: true,
  },
  {
    id: "shared-pat-001",
    character: "Shared",
    type: "pat",
    category: "日常",
    text: "戳了戳你",
    enabled: true,
  },

  /* Emoji 示例 */
  {
    id: "shared-emoji-001",
    character: "Shared",
    type: "emoji",
    category: "日常",
    text: "💕",
    enabled: true,
  },
  {
    id: "shared-emoji-002",
    character: "Shared",
    type: "emoji",
    category: "日常",
    text: "🌸",
    enabled: true,
  },
  {
    id: "shared-emoji-003",
    character: "Shared",
    type: "emoji",
    category: "日常",
    text: "🥺",
    enabled: true,
  },
  {
    id: "shared-emoji-004",
    character: "Shared",
    type: "emoji",
    category: "日常",
    text: "☺️",
    enabled: true,
  },
];

/* -------------------------------------------------------
   兼容旧 API
   ------------------------------------------------------- */

export function randomCard(
  cardPool: CharacterCard[]
): CharacterCard | null {
  const enabled = cardPool.filter((c) => c.enabled);
  if (enabled.length === 0) return null;

  return enabled[
    Math.floor(Math.random() * enabled.length)
  ];
}