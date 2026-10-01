/* =========================================================
   Runwithme · 自由造句
   ========================================================= */

export type SentenceJoinMode =
  | "none"       // 直接连
  | "space"      // 加空格
  | "punct"      // 每词后加标点
  | "random";    // 每次随机

export type SentenceSettings = {
  enabled: boolean;
  /** 抽到文本卡后，变成造句的概率 0~1 */
  chance: number;
  /** 抽词数量范围 */
  wordCountMin: number;
  wordCountMax: number;
  /** 拼接方式 */
  joinMode: SentenceJoinMode;
  /** 选 punct 模式时，每个词后加标点的概率 0~1 */
  punctChance: number;
  /** 混合整句卡（text 卡当作"一个词"） */
  includeWholeCards: boolean;
  /** 统一字池（不分角色） */
  wordPool: string[];
};

export const SENTENCE_PUNCT_CHARS = [
  "。",
  "，",
  "…",
  "！",
  "？",
];

export const DEFAULT_SENTENCE_WORD_POOL: string[] = [
  "你",
  "我",
  "的",
  "是",
  "好",
  "不",
  "别",
  "过来",
  "已经",
  "知道",
  "今天",
  "真的",
  "想",
  "见",
];

export const DEFAULT_SENTENCE_SETTINGS: SentenceSettings = {
  enabled: false,
  chance: 0.3,
  wordCountMin: 2,
  wordCountMax: 6,
  joinMode: "none",
  punctChance: 0.3,
  includeWholeCards: false,
  wordPool: [...DEFAULT_SENTENCE_WORD_POOL],
};