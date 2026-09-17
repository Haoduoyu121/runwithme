"use client";

import { useEffect, useRef, useState } from "react";

import { usePomodoro } from "@/lib/PomodoroContext";
import {
  formatMinSec,
  pickRandomEnabled,
  type BlockCard,
  type CommentCard,
} from "@/data/checkin";

import {
  BUBBLE_AUTO_HIDE_MS,
  BUBBLE_INTERVAL_RANGE,
  type VoiceCard,
} from "@/data/checkinVoiceCards";

import { getFocusWallpaper } from "@/lib/focusWallpaperStorage";
import { getFocusNoise } from "@/lib/focusNoiseStorage";
import { getVoiceFile } from "@/lib/checkinVoiceFiles";
import { loadVoiceCards } from "@/lib/checkinVoiceStorage";
import { loadBlockCards } from "@/lib/checkinBlockCardStorage";
import { loadCommentCards } from "@/lib/checkinStorage";
import {
  loadFocusSettings,
  type FocusWallpaperType,
} from "@/lib/focusStorage";

const LONG_PRESS_MS = 1500;

type VoiceCardWithUrl = VoiceCard & { audioUrl: string };

type BubblePos = {
  leftPct: number;
  topPct: number;
};

export default function FocusOverlay() {
  const {
    mode,
    running,
    remaining,
    totalSeconds,
    focusOverlayOpen,
    closeFocusOverlay,
    toggle,
    finishEarly,
    onFocusComplete,
  } = usePomodoro();

  const [wallpaperUrl, setWallpaperUrl] = useState<
    string | null
  >(null);
  const [wallpaperType, setWallpaperType] =
    useState<FocusWallpaperType>("none");

  const [longPressProgress, setLongPressProgress] =
    useState(0);

  /* 白噪音 */
  const [noiseAvailable, setNoiseAvailable] =
    useState(false);
  const [noiseOn, setNoiseOn] = useState(false);
  const noiseAudioRef = useRef<HTMLAudioElement | null>(
    null
  );
  const noiseUrlRef = useRef<string | null>(null);

  /* 阻止卡 */
  const [blockCard, setBlockCard] =
    useState<BlockCard | null>(null);
  const [showBlockCard, setShowBlockCard] =
    useState(false);

  /* 语音气泡 */
  const [voicePool, setVoicePool] = useState<
    VoiceCardWithUrl[]
  >([]);
  const [bubble, setBubble] =
    useState<VoiceCardWithUrl | null>(null);
  const [bubblePlaying, setBubblePlaying] = useState(false);
  const [bubblePos, setBubblePos] = useState<BubblePos>({
    leftPct: 6,
    topPct: 50,
  });

  /* 完成弹窗（focus 结束后的 comments 卡） */
  const [completionCard, setCompletionCard] =
    useState<CommentCard | null>(null);
  const [completionOpen, setCompletionOpen] =
    useState(false);

  const bubbleAudioRef = useRef<HTMLAudioElement | null>(
    null
  );
  const bubbleTimerRef = useRef<number | null>(null);
  const bubbleHideTimerRef = useRef<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  /* ---------- 打开/关闭时初始化 ---------- */
  useEffect(() => {
    if (!focusOverlayOpen) {
      /* 关闭：清空所有状态 */
      noiseAudioRef.current?.pause();
      noiseAudioRef.current = null;
      if (noiseUrlRef.current) {
        URL.revokeObjectURL(noiseUrlRef.current);
        noiseUrlRef.current = null;
      }
      setNoiseOn(false);
      setNoiseAvailable(false);

      setShowBlockCard(false);
      setBlockCard(null);

      setCompletionOpen(false);
      setCompletionCard(null);

      /* 语音池清理 */
      voicePool.forEach((c) => URL.revokeObjectURL(c.audioUrl));
      setVoicePool([]);

      bubbleAudioRef.current?.pause();
      bubbleAudioRef.current = null;
      setBubble(null);
      setBubblePlaying(false);

      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = null;
      }
      if (bubbleHideTimerRef.current !== null) {
        window.clearTimeout(bubbleHideTimerRef.current);
        bubbleHideTimerRef.current = null;
      }

      return;
    }

    const settings = loadFocusSettings();
    setWallpaperType(settings.wallpaperType);

    let cancelled = false;
    let wallUrl: string | null = null;
    const voiceUrls: string[] = [];

    async function loadWallpaper() {
      if (settings.wallpaperType === "none") {
        setWallpaperUrl(null);
        return;
      }
      try {
        const blob = await getFocusWallpaper();
        if (!blob || cancelled) return;
        wallUrl = URL.createObjectURL(blob);
        setWallpaperUrl(wallUrl);
      } catch (e) {
        console.error("读取专注壁纸失败:", e);
      }
    }

    async function loadNoise() {
      try {
        const blob = await getFocusNoise();
        if (!blob || cancelled) {
          setNoiseAvailable(false);
          return;
        }

        setNoiseAvailable(true);

        const url = URL.createObjectURL(blob);
        noiseUrlRef.current = url;

        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = 0.5;
        audio.preload = "auto";
        noiseAudioRef.current = audio;

        if (settings.noiseDefaultOn) {
          try {
            await audio.play();
            if (!cancelled) setNoiseOn(true);
          } catch {
            if (!cancelled) setNoiseOn(false);
          }
        }
      } catch (e) {
        console.error("读取白噪音失败:", e);
      }
    }

    async function loadVoicePool() {
      try {
        const cards = loadVoiceCards().filter(
          (c) => c.enabled
        );
        if (cards.length === 0) return;

        const withUrl: VoiceCardWithUrl[] = [];

        for (const card of cards) {
          try {
            const blob = await getVoiceFile(card.id);
            if (!blob) continue;
            const url = URL.createObjectURL(blob);
            voiceUrls.push(url);
            withUrl.push({ ...card, audioUrl: url });
          } catch (e) {
            console.error("读取语音失败:", card.id, e);
          }
        }

        if (cancelled) {
          voiceUrls.forEach((u) => URL.revokeObjectURL(u));
          return;
        }

        setVoicePool(withUrl);
      } catch (e) {
        console.error("加载语音卡池失败:", e);
      }
    }

    void loadWallpaper();
    void loadNoise();
    void loadVoicePool();

    return () => {
      cancelled = true;
      if (wallUrl) URL.revokeObjectURL(wallUrl);
    };
  }, [focusOverlayOpen]);

    /* 诊断：看 voicePool 是否加载成功 */
  useEffect(() => {
    console.log(
      "[FocusOverlay] voicePool:",
      voicePool.length,
      voicePool
    );
  }, [voicePool]);


  /* 卸载清理 */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current);
      }
      if (bubbleHideTimerRef.current !== null) {
        window.clearTimeout(bubbleHideTimerRef.current);
      }
      noiseAudioRef.current?.pause();
      bubbleAudioRef.current?.pause();
      if (noiseUrlRef.current) {
        URL.revokeObjectURL(noiseUrlRef.current);
      }
    };
  }, []);

  /* ---------- 订阅 focus 完成 → 弹 comments 卡 ---------- */
  useEffect(() => {
    if (!focusOverlayOpen) return;

    const unsub = onFocusComplete(() => {
      /* 抽一张 comments 卡 */
      const cards = loadCommentCards();
      const picked = pickRandomEnabled(cards);

      if (picked) {
        setCompletionCard(picked);
        setCompletionOpen(true);
      } else {
        /* 卡池为空：直接关闭专注层 */
        closeFocusOverlay();
      }
    });

    return unsub;
  }, [focusOverlayOpen, onFocusComplete, closeFocusOverlay]);

  /* ---------- 语音气泡调度 ---------- */

  useEffect(() => {
    if (!focusOverlayOpen) return;
    if (voicePool.length === 0) return;
    if (bubble) return;
    if (completionOpen) return;

    const settings = loadFocusSettings();
    const [min, max] =
      BUBBLE_INTERVAL_RANGE[settings.bubbleFrequency];
    const delay = min + Math.random() * (max - min);

    if (bubbleTimerRef.current !== null) {
      window.clearTimeout(bubbleTimerRef.current);
    }

    bubbleTimerRef.current = window.setTimeout(() => {
      const picked =
        voicePool[
          Math.floor(Math.random() * voicePool.length)
        ];
      setBubble(picked);
      setBubblePlaying(false);

      /* 随机位置：左 6%~48%，上 32%~66% */
      setBubblePos({
        leftPct: 6 + Math.random() * 42,
        topPct: 32 + Math.random() * 34,
      });

      if (bubbleHideTimerRef.current !== null) {
        window.clearTimeout(bubbleHideTimerRef.current);
      }
      bubbleHideTimerRef.current = window.setTimeout(() => {
        dismissBubble();
      }, BUBBLE_AUTO_HIDE_MS);
    }, delay);

    return () => {
      if (bubbleTimerRef.current !== null) {
        window.clearTimeout(bubbleTimerRef.current);
        bubbleTimerRef.current = null;
      }
    };
  }, [
    focusOverlayOpen,
    voicePool,
    bubble,
    completionOpen,
  ]);

  /* ---------- 长按 → 弹阻止卡 ---------- */

  function startLongPress() {
    if (showBlockCard) return;
    if (completionOpen) return;
    if (bubble) return;
    if (timerRef.current !== null) return;
    startRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(
        100,
        (elapsed / LONG_PRESS_MS) * 100
      );
      setLongPressProgress(p);

      if (elapsed >= LONG_PRESS_MS) {
        clearLongPress();
        showBlockCardNow();
      }
    }, 30);
  }

  function clearLongPress() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setLongPressProgress(0);
  }

  function showBlockCardNow() {
    const cards = loadBlockCards();
    const picked = pickRandomEnabled(cards);

    if (picked) {
      setBlockCard(picked);
      setShowBlockCard(true);
    } else {
      closeFocusOverlay();
    }
  }

  /* ---------- 白噪音开关 ---------- */

  async function toggleNoise() {
    const audio = noiseAudioRef.current;
    if (!audio) return;

    if (noiseOn) {
      audio.pause();
      setNoiseOn(false);
      return;
    }

    try {
      await audio.play();
      setNoiseOn(true);
    } catch (e) {
      console.error("播放白噪音失败:", e);
    }
  }

  /* ---------- 提前完成 ---------- */
  /* 只触发 finishEarly，弹窗由 onFocusComplete 监听器处理 */

  function handleFinish() {
    finishEarly();
  }

  /* ---------- 完成弹窗确认 ---------- */

  function acknowledgeCompletion() {
    setCompletionOpen(false);
    setCompletionCard(null);
    closeFocusOverlay();
  }

  /* ---------- 气泡播放 / 消失 ---------- */

  async function handleBubbleTap() {
    if (!bubble) return;
    if (bubblePlaying) return;

    try {
      const audio = new Audio(bubble.audioUrl);
      bubbleAudioRef.current = audio;

      audio.addEventListener("ended", () => {
        setBubblePlaying(false);
        if (bubbleHideTimerRef.current !== null) {
          window.clearTimeout(bubbleHideTimerRef.current);
        }
        bubbleHideTimerRef.current = window.setTimeout(() => {
          dismissBubble();
        }, 2000);
      });

      await audio.play();
      setBubblePlaying(true);

      if (bubbleHideTimerRef.current !== null) {
        window.clearTimeout(bubbleHideTimerRef.current);
        bubbleHideTimerRef.current = null;
      }
    } catch (e) {
      console.error("播放语音失败:", e);
      setBubblePlaying(false);
    }
  }

  function dismissBubble() {
    bubbleAudioRef.current?.pause();
    bubbleAudioRef.current = null;
    setBubble(null);
    setBubblePlaying(false);
    if (bubbleHideTimerRef.current !== null) {
      window.clearTimeout(bubbleHideTimerRef.current);
      bubbleHideTimerRef.current = null;
    }
  }

  if (!focusOverlayOpen) return null;

  const progress =
    totalSeconds > 0
      ? Math.min(
          100,
          ((totalSeconds - remaining) / totalSeconds) * 100
        )
      : 0;

  return (
    <div
      className="focus-overlay"
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      {wallpaperUrl && wallpaperType === "video" && (
        <video
          className="focus-wallpaper"
          src={wallpaperUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      {wallpaperUrl && wallpaperType === "image" && (
        <img
          className="focus-wallpaper"
          src={wallpaperUrl}
          alt=""
        />
      )}
      {!wallpaperUrl && (
        <div className="focus-wallpaper-empty" />
      )}

      <div className="focus-veil" />

      <div className="focus-top">
        <div className="focus-top-hint">
          长按屏幕 1.5 秒退出专注
        </div>
      </div>

      <div className="focus-center">
        <div className="focus-time">
          {formatMinSec(remaining)}
        </div>
        <div className="focus-label">
          {mode === "focus"
            ? "Focus"
            : mode === "short"
              ? "Short Break"
              : "Long Break"}
        </div>

        <div className="focus-progress-line">
          <div
            className="focus-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        className="focus-controls"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerCancel={(e) => e.stopPropagation()}
        onPointerLeave={(e) => e.stopPropagation()}
      >
        {noiseAvailable && (
          <button
            className={`focus-noise-btn${
              noiseOn ? " is-on" : ""
            }`}
            onClick={toggleNoise}
            aria-label={
              noiseOn ? "关闭白噪音" : "开启白噪音"
            }
          >
            {noiseOn ? "🔊" : "🔇"}
          </button>
        )}

        <button
          className="focus-btn"
          onClick={toggle}
          aria-label={running ? "暂停" : "继续"}
        >
          {running ? "❚❚" : "▶"}
        </button>

        {mode === "focus" && (
          <button
            className="focus-finish-btn"
            onClick={handleFinish}
            aria-label="提前完成"
          >
            ✓
          </button>
        )}
      </div>

      {longPressProgress > 0 && (
        <div className="focus-longpress-bar">
          <div
            className="focus-longpress-fill"
            style={{ width: `${longPressProgress}%` }}
          />
        </div>
      )}

      {/* 语音气泡（位置随机） */}
      {bubble && !completionOpen && (
        <div
          className="focus-bubble"
          style={{
            left: `${bubblePos.leftPct}%`,
            top: `${bubblePos.topPct}%`,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
        >
          <button
            className="focus-bubble-body"
            onClick={handleBubbleTap}
            aria-label={
              bubblePlaying ? "播放中" : "播放语音"
            }
          >
            <span
              className={`focus-bubble-avatar focus-bubble-avatar-${bubble.character.toLowerCase()}`}
            >
              {bubble.character.charAt(0)}
            </span>

            <span className="focus-bubble-content">
              <span className="focus-bubble-name">
                {bubble.character}
              </span>
              <span className="focus-bubble-text">
                {bubble.text}
              </span>
            </span>

            <span className="focus-bubble-play">
              {bubblePlaying ? "❚❚" : "▶"}
            </span>
          </button>

          <button
            className="focus-bubble-close"
            onClick={dismissBubble}
            aria-label="关闭气泡"
          >
            ×
          </button>
        </div>
      )}

      {/* 阻止卡 */}
      {showBlockCard && blockCard && (
        <div
          className="focus-block-backdrop"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="focus-block-card">
            <div
              className={`focus-block-avatar focus-block-avatar-${blockCard.character.toLowerCase()}`}
            >
              {blockCard.character.charAt(0)}
            </div>

            <div className="focus-block-name">
              {blockCard.character}
            </div>

            <div className="focus-block-text">
              {blockCard.text}
            </div>

            <div className="focus-block-actions">
              <button
                className="focus-block-stay"
                onClick={() => {
                  setShowBlockCard(false);
                  setBlockCard(null);
                }}
              >
                继续专注
              </button>
              <button
                className="focus-block-leave"
                onClick={() => {
                  setShowBlockCard(false);
                  setBlockCard(null);
                  closeFocusOverlay();
                }}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完成弹窗（focus 结束） */}
      {completionOpen && completionCard && (
        <div
          className="focus-block-backdrop"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="focus-block-card focus-completion-card">
            <div
              className={`focus-block-avatar focus-block-avatar-${completionCard.character.toLowerCase()}`}
            >
              {completionCard.character.charAt(0)}
            </div>

            <div className="focus-block-name">
              {completionCard.character}
            </div>

            <div className="focus-block-text">
              {completionCard.text}
            </div>

            <div className="focus-completion-subtitle">
              🍅 这一轮专注完成了
            </div>

            <div className="focus-completion-actions">
              <button
                className="focus-completion-primary"
                onClick={acknowledgeCompletion}
              >
                继续努力
              </button>
              <button
                className="focus-completion-secondary"
                onClick={acknowledgeCompletion}
              >
                谢谢老公
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}