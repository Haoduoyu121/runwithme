"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatMinSec,
  type PomodoroSettings,
} from "@/data/checkin";

import {
  usePomodoro,
  type PomodoroMode,
} from "@/lib/PomodoroContext";

import {
  saveFocusWallpaper,
  getFocusWallpaper,
  deleteFocusWallpaper,
} from "@/lib/focusWallpaperStorage";

import {
  saveFocusNoise,
  getFocusNoise,
  deleteFocusNoise,
} from "@/lib/focusNoiseStorage";

import {
  loadFocusSettings,
  saveFocusSettings,
  type FocusWallpaperType,
} from "@/lib/focusStorage";

type PomodoroPanelProps = {
  activeTaskName: string | null;
};

export default function PomodoroPanel({
  activeTaskName,
}: PomodoroPanelProps) {
  const {
    mode,
    running,
    remaining,
    settings,
    totalSeconds,
    toggle,
    reset,
    setMode,
    updateSettings,
    openFocusOverlay,
  } = usePomodoro();

  const [showSettings, setShowSettings] = useState(false);

  /* 壁纸状态 */
  const [wallpaperType, setWallpaperType] =
    useState<FocusWallpaperType>("none");
  const [wallpaperUrl, setWallpaperUrl] = useState<
    string | null
  >(null);
  const [uploading, setUploading] = useState(false);

  /* 白噪音 */
  const [noiseAvailable, setNoiseAvailable] =
    useState(false);
  const [noiseName, setNoiseName] = useState("");
  const [noiseUploading, setNoiseUploading] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const noiseInputRef = useRef<HTMLInputElement | null>(
    null
  );

  /* 载入壁纸信息 */
  useEffect(() => {
    if (!showSettings) return;

    const s = loadFocusSettings();
    setWallpaperType(s.wallpaperType);

    if (s.wallpaperType === "none") {
      setWallpaperUrl(null);
      return;
    }

    let cancelled = false;
    let url: string | null = null;

    async function load() {
      const blob = await getFocusWallpaper();
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setWallpaperUrl(url);
    }
    void load();

    /* 顺便查白噪音是否存在 */
    void (async () => {
      try {
        const blob = await getFocusNoise();
        if (!cancelled) {
          setNoiseAvailable(!!blob);
          setNoiseName(blob ? "已上传白噪音" : "");
        }
      } catch {
        if (!cancelled) setNoiseAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [showSettings]);

  /* 进度 */
  const progress =
    totalSeconds > 0
      ? Math.min(
          100,
          ((totalSeconds - remaining) / totalSeconds) * 100
        )
      : 0;

  function handleModeChange(m: PomodoroMode) {
    setMode(m);
  }

  function patchSettings(
    patch: Partial<PomodoroSettings>
  ) {
    updateSettings({
      ...settings,
      ...patch,
    });
  }

  /* START 时如果 focus 模式，自动打开全屏层 */
  function handleToggle() {
    const wasRunning = running;
    toggle();
    if (!wasRunning && mode === "focus") {
      openFocusOverlay();
    }
  }

  /* ---------- 壁纸 ---------- */

  async function handlePickWallpaper(
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("只支持图片或视频。");
      return;
    }

    /* 大小检查：视频 30MB，图片 15MB */
    const LIMIT_VIDEO = 30 * 1024 * 1024;
    const LIMIT_IMAGE = 15 * 1024 * 1024;
    const limit = isVideo ? LIMIT_VIDEO : LIMIT_IMAGE;
    const limitLabel = isVideo ? "30MB" : "15MB";

    if (file.size > limit) {
      alert(
        `${isVideo ? "视频" : "图片"}不能超过 ${limitLabel}，当前 ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB。`
      );
      return;
    }

    setUploading(true);
    try {
      await saveFocusWallpaper(file);
      const next = {
        wallpaperType: (isVideo ? "video" : "image") as
          | "video"
          | "image",
        wallpaperMime: file.type,
      };
      saveFocusSettings(next);
      setWallpaperType(next.wallpaperType);

      /* 刷新预览 */
      if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
      const url = URL.createObjectURL(file);
      setWallpaperUrl(url);
    } catch (e) {
      console.error("保存壁纸失败:", e);
      alert("保存壁纸失败，可能文件太大。");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveWallpaper() {
    if (!window.confirm("移除专注壁纸？")) return;
    await deleteFocusWallpaper();
    saveFocusSettings({
      wallpaperType: "none",
      wallpaperMime: "",
    });
    setWallpaperType("none");
    if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
    setWallpaperUrl(null);
  }

    /* ---------- 白噪音 ---------- */

  async function handlePickNoise(
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith("audio/")) {
      alert("请上传音频文件（mp3 / m4a / ogg 等）。");
      return;
    }

    /* 音频 20MB 上限 */
    const LIMIT = 20 * 1024 * 1024;
    if (file.size > LIMIT) {
      alert(
        `音频不能超过 20MB，当前 ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB。`
      );
      return;
    }

    setNoiseUploading(true);
    try {
      await saveFocusNoise(file);
      setNoiseAvailable(true);
      setNoiseName(file.name);
    } catch (e) {
      console.error("保存白噪音失败:", e);
      alert("保存失败，可能文件太大。");
    } finally {
      setNoiseUploading(false);
    }
  }

  async function handleRemoveNoise() {
    if (!window.confirm("移除白噪音？")) return;
    await deleteFocusNoise();
    setNoiseAvailable(false);
    setNoiseName("");
  }

  return (
    <div className="checkin-pomodoro">
      {/* 模式切换 */}
      <div className="checkin-pomo-segment">
        <button
          className={mode === "focus" ? "active" : ""}
          onClick={() => handleModeChange("focus")}
        >
          Focus
        </button>
        <button
          className={mode === "short" ? "active" : ""}
          onClick={() => handleModeChange("short")}
        >
          Short Break
        </button>
        <button
          className={mode === "long" ? "active" : ""}
          onClick={() => handleModeChange("long")}
        >
          Long Break
        </button>
      </div>

      {mode === "focus" && activeTaskName && (
        <div className="checkin-pomo-task">
          正在专注：{activeTaskName}
        </div>
      )}

      {/* 圆环 */}
      <div className="checkin-pomo-ring-wrap">
        <svg
          className="checkin-pomo-ring"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="rgba(142, 101, 111, 0.12)"
            strokeWidth="6"
          />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="#8e656f"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${
              2 *
              Math.PI *
              88 *
              (1 - progress / 100)
            }`}
            transform="rotate(-90 100 100)"
            style={{
              transition:
                "stroke-dashoffset 0.4s linear",
            }}
          />
        </svg>

        <div className="checkin-pomo-ring-center">
          <div className="checkin-pomo-time">
            {formatMinSec(remaining)}
          </div>
          <div className="checkin-pomo-label">
            {mode === "focus"
              ? "Focus"
              : mode === "short"
                ? "Short Break"
                : "Long Break"}
          </div>
        </div>
      </div>

      {/* 控制 */}
      <div className="checkin-pomo-controls">
        <button
          className="checkin-pomo-btn ghost"
          onClick={reset}
          aria-label="重置"
        >
          ↺
        </button>

        <button
          className="checkin-pomo-btn primary"
          onClick={handleToggle}
        >
          {running ? "PAUSE" : "START"}
        </button>

        <button
          className="checkin-pomo-btn ghost"
          onClick={() => setShowSettings(true)}
          aria-label="设置"
        >
          ⚙
        </button>
      </div>

      {/* 手动进入全屏（未自动进入时用） */}
      {mode === "focus" && running && (
        <button
          className="checkin-pomo-enter-focus"
          onClick={openFocusOverlay}
        >
          进入专注模式
        </button>
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <div
          className="checkin-modal-backdrop"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="checkin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="checkin-modal-header">
              <h2>Timer Settings</h2>
              <button
                className="checkin-modal-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <label className="checkin-field">
              <span>Focus (min)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.focusMin}
                onChange={(e) =>
                  patchSettings({
                    focusMin: Math.max(
                      1,
                      Math.min(
                        120,
                        parseInt(e.target.value, 10) ||
                          25
                      )
                    ),
                  })
                }
              />
            </label>

            <label className="checkin-field">
              <span>Short Break (min)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.shortBreakMin}
                onChange={(e) =>
                  patchSettings({
                    shortBreakMin: Math.max(
                      1,
                      Math.min(
                        60,
                        parseInt(e.target.value, 10) ||
                          5
                      )
                    ),
                  })
                }
              />
            </label>

            <label className="checkin-field">
              <span>Long Break (min)</span>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.longBreakMin}
                onChange={(e) =>
                  patchSettings({
                    longBreakMin: Math.max(
                      1,
                      Math.min(
                        120,
                        parseInt(e.target.value, 10) ||
                          15
                      )
                    ),
                  })
                }
              />
            </label>

            {/* 专注壁纸 */}
            <div className="checkin-focus-wallpaper-section">
              <div className="checkin-focus-wallpaper-label">
                专注模式壁纸
              </div>

              <div className="checkin-focus-wallpaper-preview">
                {wallpaperType === "video" &&
                wallpaperUrl ? (
                  <video
                    src={wallpaperUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : wallpaperType === "image" &&
                  wallpaperUrl ? (
                  <img src={wallpaperUrl} alt="" />
                ) : (
                  <span>空白</span>
                )}
              </div>

              <div className="checkin-focus-wallpaper-actions">
                <button
                  type="button"
                  className="checkin-btn ghost"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={uploading}
                >
                  {uploading
                    ? "上传中…"
                    : wallpaperType === "none"
                      ? "上传壁纸"
                      : "更换壁纸"}
                </button>

                {wallpaperType !== "none" && (
                  <button
                    type="button"
                    className="checkin-btn ghost danger"
                    onClick={handleRemoveWallpaper}
                  >
                    移除
                  </button>
                )}
              </div>

              <div className="checkin-focus-wallpaper-hint">
                支持图片 / mp4 视频（视频会静音循环）
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) void handlePickWallpaper(files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* 白噪音 */}
            <div className="checkin-focus-wallpaper-section">
              <div className="checkin-focus-wallpaper-label">
                白噪音
              </div>

              <div className="checkin-focus-noise-preview">
                {noiseAvailable ? (
                  <>
                    <span className="checkin-focus-noise-icon">
                      🎵
                    </span>
                    <span className="checkin-focus-noise-name">
                      {noiseName || "已上传"}
                    </span>
                  </>
                ) : (
                  <span className="checkin-focus-noise-empty">
                    还没有白噪音
                  </span>
                )}
              </div>

              <div className="checkin-focus-wallpaper-actions">
                <button
                  type="button"
                  className="checkin-btn ghost"
                  onClick={() =>
                    noiseInputRef.current?.click()
                  }
                  disabled={noiseUploading}
                >
                  {noiseUploading
                    ? "上传中…"
                    : noiseAvailable
                      ? "更换音频"
                      : "上传音频"}
                </button>

                {noiseAvailable && (
                  <button
                    type="button"
                    className="checkin-btn ghost danger"
                    onClick={handleRemoveNoise}
                  >
                    移除
                  </button>
                )}
              </div>

              <div className="checkin-focus-wallpaper-hint">
                支持 mp3 / m4a / ogg，20MB 内。上传后在专注模式里默认播放，可点喇叭开关。
              </div>

              <input
                ref={noiseInputRef}
                type="file"
                accept="audio/*"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) void handlePickNoise(files);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="checkin-modal-footer">
              <button
                className="checkin-btn"
                onClick={() => setShowSettings(false)}
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}