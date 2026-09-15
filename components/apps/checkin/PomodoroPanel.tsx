"use client";

import { useState } from "react";

import {
  formatMinSec,
  type PomodoroSettings,
} from "@/data/checkin";

import {
  usePomodoro,
  type PomodoroMode,
} from "@/lib/PomodoroContext";

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
  } = usePomodoro();

  const [showSettings, setShowSettings] = useState(false);

  /* 进度 */
  const progress =
    totalSeconds > 0
      ? Math.min(
          100,
          ((totalSeconds - remaining) / totalSeconds) *
            100
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
          className={
            mode === "short" ? "active" : ""
          }
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
          onClick={toggle}
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