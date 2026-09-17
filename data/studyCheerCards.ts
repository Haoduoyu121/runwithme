import type { StudyCheerCard } from "@/data/study";

const LEVI_CHEER = [
  "加油，继续下一个。",
  "记住就行，别急。",
  "这词不难。",
  "再背几个。",
  "可以，保持这个速度。",
  "错了就再背一次。",
  "看一遍就够。",
  "别停。",
  "再撑一页。",
  "今天状态不错。",
];

const ERWIN_CHEER = [
  "今天再背几个吧。",
  "我相信你可以。",
  "慢慢来，记住最重要。",
  "背得快不如记得牢。",
  "这一步走得很稳。",
  "很好，继续。",
  "别忘了偶尔复习一下。",
  "多念几遍就熟了。",
  "今天的你会感谢今天的你。",
  "再坚持一会儿。",
];

export const DEFAULT_STUDY_CHEER_CARDS: StudyCheerCard[] =
  [
    ...LEVI_CHEER.map((text, i) => ({
      id: `Levi-cheer-default-${i}`,
      character: "Levi" as const,
      text,
      enabled: true,
    })),
    ...ERWIN_CHEER.map((text, i) => ({
      id: `Erwin-cheer-default-${i}`,
      character: "Erwin" as const,
      text,
      enabled: true,
    })),
  ];