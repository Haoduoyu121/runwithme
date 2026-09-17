import type { BlockCard } from "@/data/checkin";

const LEVI_BLOCK = [
  "不学了？",
  "别停在这。",
  "这才几分钟？",
  "手都还没热。",
  "再撑一会儿。",
  "想清楚再走。",
  "把这一段做完。",
  "别让我失望。",
];

const ERWIN_BLOCK = [
  "再坚持一下。",
  "这一步走完，就休息。",
  "比想象中更容易，不是吗？",
  "你可以的，慢慢来。",
  "眼前的事，先做完。",
  "不用急，但别走。",
  "停下来，值得吗？",
  "还差一点点。",
];

export const DEFAULT_BLOCK_CARDS: BlockCard[] = [
  ...LEVI_BLOCK.map((text, i) => ({
    id: `Levi-bc-default-${i}`,
    character: "Levi" as const,
    text,
    enabled: true,
  })),
  ...ERWIN_BLOCK.map((text, i) => ({
    id: `Erwin-bc-default-${i}`,
    character: "Erwin" as const,
    text,
    enabled: true,
  })),
];