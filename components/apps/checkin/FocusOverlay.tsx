"use client";

import { useEffect, useRef, useState } from "react";

import { usePomodoro } from "@/lib/PomodoroContext";
import { formatMinSec } from "@/data/checkin";

import { getFocusWallpaper } from "@/lib/focusWallpaperStorage";
import { getFocusNoise } from "@/lib/focusNoiseStorage";
import {
  loadFocusSettings,
  type FocusWallpaperType,
} from "@/lib/focusStorage";

const LONG_PRESS_MS = 1500;

export default function FocusOverlay() {
  const {
    mode,
    running,
    remaining,
    totalSeconds,
    focusOverlayOpen,
    closeFocusOverlay,
    toggle,
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

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  /* ---------- 每次打开：载入壁纸 + 白噪音 ---------- */
  useEffect(() => {
    if (!focusOverlayOpen) {
      /* 关闭时清掉白噪音 */
      noiseAudioRef.current?.pause();
      noiseAudioRef.current = null;
      if (noiseUrlRef.current) {
        URL.revokeObjectURL(noiseUrlRef.current);
        noiseUrlRef.current = null;
      }
      setNoiseOn(false);
      setNoiseAvailable(false);
      return;
    }

    const settings = loadFocusSettings();
    setWallpaperType(settings.wallpaperType);

    let cancelled = false;
    let wallUrl: string | null = null;

    /* ---- 壁纸 ---- */
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

    /* ---- 白噪音 ---- */
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

        /* 默认开 + 有文件 → 尝试自动播放 */
        if (settings.noiseDefaultOn) {
          try {
            await audio.play();
            if (!cancelled) setNoiseOn(true);
          } catch (e) {
            /* iOS 有时会拦截，让用户手动点喇叭 */
            console.warn("白噪音自动播放被拦截:", e);
            if (!cancelled) setNoiseOn(false);
          }
        }
      } catch (e) {
        console.error("读取白噪音失败:", e);
      }
    }

    void loadWallpaper();
    void loadNoise();

    return () => {
      cancelled = true;
      if (wallUrl) URL.revokeObjectURL(wallUrl);
    };
  }, [focusOverlayOpen]);

  /* 卸载清理 */
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      noiseAudioRef.current?.pause();
      noiseAudioRef.current = null;
      if (noiseUrlRef.current) {
        URL.revokeObjectURL(noiseUrlRef.current);
        noiseUrlRef.current = null;
      }
    };
  }, []);

  /* ---------- 长按退出 ---------- */

  function startLongPress() {
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
        closeFocusOverlay();
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
      {/* 壁纸层 */}
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

      {/* 遮罩层 */}
      <div className="focus-veil" />

      {/* 顶部提示 */}
      <div className="focus-top">
        <div className="focus-top-hint">
          长按屏幕 1.5 秒退出专注
        </div>
      </div>

      {/* 中央大计时 */}
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

      {/* 底部按钮区（阻止冒泡） */}
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
      </div>

      {/* 长按进度条 */}
      {longPressProgress > 0 && (
        <div className="focus-longpress-bar">
          <div
            className="focus-longpress-fill"
            style={{ width: `${longPressProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}