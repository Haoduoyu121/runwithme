/* =========================================================
   RunWithme · Study
   数据模型 & 常量
   ========================================================= */

/* ---------- 词书 ---------- */

export type WordBook = {
  id: string;
  name: string;
  /* 简介（可空） */
  description: string;
  createdAt: number;
  updatedAt: number;
};

/* ---------- 单词 ---------- */

export type WordMastery = "new" | "learning" | "mastered";

export type Word = {
  id: string;
  bookId: string;
  /* 单词本体，例如 "apple" */
  text: string;
  /* 释义，例如 "苹果" */
  meaning: string;
  /* 例句（可空） */
  example: string;
  /* 掌握状态 */
  mastery: WordMastery;
  /* 答对次数（不连续计数，用于升级判定） */
  correctCount: number;
  /* 答错次数 */
  wrongCount: number;
  /* 加入时间 */
  createdAt: number;
  /* 最后复习时间 */
  lastReviewedAt: number | null;
};

/* ---------- 每日一句 ---------- */

export type DailySentence = {
  id: string;
  /* 中文 / 英文文学摘抄 */
  text: string;
  /* 出处（作者 / 书名），可空 */
  source: string;
  /* 语言 */
  lang: "zh" | "en";
  enabled: boolean;
  createdAt: number;
};

/* ---------- 鼓励气泡卡池 ---------- */

export type StudyCheerCard = {
  id: string;
  character: "Levi" | "Erwin";
  text: string;
  enabled: boolean;
};

/* ---------- 每日记录（用于统计） ---------- */

export type DailyStudyRecord = {
  /* 格式 YYYY-MM-DD */
  dateStr: string;
  /* 当天学过的 word id（去重） */
  wordIds: string[];
  /* 当天答对次数 */
  correctCount: number;
  /* 当天答错次数 */
  wrongCount: number;
};

/* ---------- 设置 ---------- */

export type CheerFrequency = "low" | "medium" | "high";

/* 发音来源：
   - "tts"：只用系统 TTS（推荐 iOS，手势不会被拦截）
   - "mp3"：只播 public/audio/words/ 下的 mp3
   - "auto"：优先 mp3，找不到时降级 TTS（桌面可用，iOS 可能丢手势） */
export type AudioSource = "tts" | "mp3" | "auto";

export type StudySettings = {
  /* 气泡频率 */
  cheerFrequency: CheerFrequency;
  /* TTS 语速 0.5 ~ 1.5 */
  ttsRate: number;
  /* 发音来源 */
  audioSource: AudioSource;
  /* 默认会话 voice */
  defaultVoice: "levi" | "erwin";
  /* TTS 系统 voice 名字（null = 用系统默认） */
  ttsVoiceName: string | null;
  /* 每轮学习多少个单词 */
  sessionSize: number;
};

export const DEFAULT_STUDY_SETTINGS: StudySettings = {
  cheerFrequency: "medium",
  ttsRate: 0.9,
  audioSource: "tts",
  defaultVoice: "levi",
  ttsVoiceName: null,
  sessionSize: 20,
};

/* ---------- 频率常量 ---------- */

/* 每背多少个词触发一次气泡 */
export const CHEER_INTERVAL: Record<
  CheerFrequency,
  [number, number]
> = {
  low: [8, 12],
  medium: [4, 6],
  high: [2, 3],
};

/* 从频率档位抽一个"下一次触发需要背多少个词" */
export function pickCheerInterval(
  freq: CheerFrequency
): number {
  const [min, max] = CHEER_INTERVAL[freq];
  return min + Math.floor(Math.random() * (max - min + 1));
}

/* 气泡停留时长（毫秒） */
export const CHEER_BUBBLE_DURATION_MS = 9000;

/* ---------- mastery ---------- */

/* learning 状态累计答对几次升级到 mastered */
export const MASTERY_UP_THRESHOLD = 3;

/* mastery 显示文案 */
export const MASTERY_LABELS: Record<WordMastery, string> = {
  new: "新词",
  learning: "学习中",
  mastered: "已掌握",
};

/* ---------- id 生成 ---------- */

export function createBookId(): string {
  return `book-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createWordId(): string {
  return `word-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createDailySentenceId(): string {
  return `ds-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createCheerCardId(
  character: "Levi" | "Erwin"
): string {
  return `${character}-cheer-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/* ---------- 日期 ---------- */

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ---------- 掌握状态判定 ---------- */

/* 每答对 1 次：new → learning */
/* learning 状态答对累计 3 次：→ mastered */
export function nextMastery(
  current: WordMastery,
  correctCount: number,
  isCorrect: boolean
): { mastery: WordMastery; correctCount: number } {
  if (!isCorrect) {
    return {
      mastery: "learning",
      correctCount: 0,
    };
  }

  const nextCorrect = correctCount + 1;

  if (current === "new") {
    return { mastery: "learning", correctCount: nextCorrect };
  }
  if (current === "learning") {
    if (nextCorrect >= 3) {
      return {
        mastery: "mastered",
        correctCount: nextCorrect,
      };
    }
    return {
      mastery: "learning",
      correctCount: nextCorrect,
    };
  }
  /* mastered 保持 */
  return {
    mastery: "mastered",
    correctCount: nextCorrect,
  };
}

/* ---------- 文件名规范化 ---------- */

/* 与 mp3 命名规则保持一致 */
export function normalizeWordToFilename(word: string): string {
  return word
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

/* ---------- 抽卡 ---------- */

export function pickRandomEnabled<
  T extends { enabled: boolean },
>(list: T[]): T | null {
  const pool = list.filter((x) => x.enabled);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
/* =========================================================
   学习会话
   ========================================================= */

export type SessionPartner = "levi" | "erwin" | "both";

export type StudyMode = "card" | "spell" | "match";

export type StudySessionKind = "normal" | "mistakes";

export type StudySessionState = {
  kind: StudySessionKind;
  partner: SessionPartner;
  bookId: string;
  /* 本轮多少词（进入会话时从 settings 快照） */
  limit: number;
  /* 本轮参与的 word id 列表（进入会话时随机抽好，之后不改） */
  wordIds: string[];
  /* 当前在第几个词 */
  index: number;
  /* 会话开始时间 */
  startedAt: number;
  /* 本会话已学单词数（去重的 word id） */
  studiedWordIds: string[];
};

/* 错题集条目 */
export type StudyMistake = {
  wordId: string;
  addedAt: number;
};