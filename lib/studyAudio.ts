/* =========================================================
   RunWithme · Study Audio
   mp3 优先 + Web Speech API 兜底
   注意：iOS 要求 speak() 在用户手势的同步路径里调用，
   所以 playWord 不再 await 探测，改成同步决定。
   ========================================================= */

import { normalizeWordToFilename } from "@/data/study";
import type { AudioSource } from "@/data/study";

export type VoiceKey = "levi" | "erwin";

/* ---------- 播放状态 ---------- */

let currentAudio: HTMLAudioElement | null = null;

export function stopCurrentAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {}
    currentAudio = null;
  }
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/* ---------- 预先加载 TTS voices ---------- */

let ttsReady = false;

export function initSpeech(): void {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  /* 触发一次，让浏览器开始加载 */
  try {
    window.speechSynthesis.getVoices();
  } catch {}

  if (!ttsReady) {
    ttsReady = true;
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  }
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return [];
  }
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"));
}

/* ---------- TTS ---------- */

export function speakWithTTS(
  text: string,
  rate: number,
  voiceName: string | null
): void {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
  } catch {}

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = Math.max(0.5, Math.min(1.5, rate));

  /* 指定 voice（若用户选了） */
  if (voiceName) {
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.name === voiceName);
    if (voice) u.voice = voice;
  } else {
    /* 没指定就找第一个 en 的 */
    const voices = window.speechSynthesis
      .getVoices()
      .filter((v) =>
        v.lang.toLowerCase().startsWith("en")
      );
    if (voices.length > 0) u.voice = voices[0];
  }

  try {
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.error("TTS speak 失败:", e);
  }
}

/* ---------- mp3 路径 ---------- */

export function getMp3Url(
  word: string,
  voice: VoiceKey | null
): string {
  const name = normalizeWordToFilename(word);
  if (voice) {
    return `/audio/words/${voice}/${name}.mp3`;
  }
  return `/audio/words/${name}.mp3`;
}

/* ---------- 主入口（同步） ---------- */

export type PlayOptions = {
  word: string;
  /* 会话里用哪个 voice 的 mp3 目录 */
  voice: VoiceKey | null;
  /* 发音来源 */
  source: AudioSource;
  /* TTS 语速 */
  ttsRate: number;
  /* TTS voice 名字 */
  ttsVoiceName: string | null;
};

/* 同步启动，不再返回 Promise。
   iOS 上 speechSynthesis.speak() 会立即执行，手势完整。 */
export function playWord(opts: PlayOptions): void {
  stopCurrentAudio();

  const { word, voice, source, ttsRate, ttsVoiceName } =
    opts;

  if (source === "tts") {
    speakWithTTS(word, ttsRate, ttsVoiceName);
    return;
  }

  if (source === "mp3") {
    const url = getMp3Url(word, voice);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.play().catch(() => {
      /* mp3 不存在 / 加载失败 → 静默 */
      if (currentAudio === audio) currentAudio = null;
    });
    return;
  }

  /* source === "auto"
     先同步尝试 mp3，失败时用 Audio 元素的 error 事件兜底到 TTS。
     注意：iOS 上兜底可能因为手势丢失而失败，桌面可用。 */
  const url = getMp3Url(word, voice);
  const audio = new Audio(url);
  currentAudio = audio;

  let fallbackDone = false;

  const fallback = () => {
    if (fallbackDone) return;
    fallbackDone = true;
    if (currentAudio === audio) currentAudio = null;
    speakWithTTS(word, ttsRate, ttsVoiceName);
  };

  audio.addEventListener("error", fallback);

  audio.play().catch(fallback);
}