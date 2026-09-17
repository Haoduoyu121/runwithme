/* =========================================================
   RunWithme · Voice Cards
   专注模式随机弹出的语音气泡
   ========================================================= */

export type VoiceCardCharacter = "Levi" | "Erwin";

export type VoiceCard = {
  id: string;
  character: VoiceCardCharacter;
  /* 语音对应的文字（气泡里显示） */
  text: string;
  /* 音频 mime（保存时用） */
  audioMime: string;
  enabled: boolean;
  createdAt: number;
};

export function createVoiceCardId(): string {
  return `vc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function pickRandomVoiceCard(
  cards: VoiceCard[]
): VoiceCard | null {
  const pool = cards.filter((c) => c.enabled);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- 气泡频率 ---------- */

export type BubbleFrequency = "low" | "medium" | "high";

/* 单位：毫秒。格式 [最小值, 最大值] */
export const BUBBLE_INTERVAL_RANGE: Record<
  BubbleFrequency,
  [number, number]
> = {
  low: [10 * 60 * 1000, 20 * 60 * 1000],
  medium: [3 * 60 * 1000, 6 * 60 * 1000],
  high: [15 * 1000, 40 * 1000],
};

export const BUBBLE_FREQUENCY_LABELS: Record<
  BubbleFrequency,
  string
> = {
  low: "低",
  medium: "中",
  high: "高",
};

/* 气泡不点的话多久自动消失 */
export const BUBBLE_AUTO_HIDE_MS = 15000;