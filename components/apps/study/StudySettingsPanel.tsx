"use client";

import { useEffect, useState } from "react";

import type {
  AudioSource,
  StudySettings,
} from "@/data/study";

import {
  getEnglishVoices,
  initSpeech,
} from "@/lib/studyAudio";

import {
  saveStudySettings,
} from "@/lib/studyStorage";

import CheerPoolEditor from "@/components/apps/study/CheerPoolEditor";

type Props = {
  settings: StudySettings;
  onChange: (next: StudySettings) => void;
  onClose: () => void;
};

export default function StudySettingsPanel({
  settings,
  onChange,
  onClose,
}: Props) {
  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [showCheerPool, setShowCheerPool] = useState(false);

  useEffect(() => {
    initSpeech();
    setVoices(getEnglishVoices());

    /* iOS 是异步加载的，稍等再取一次 */
    const t = window.setTimeout(() => {
      setVoices(getEnglishVoices());
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  function patch(next: Partial<StudySettings>) {
    const merged = { ...settings, ...next };
    onChange(merged);
    saveStudySettings(merged);
  }

  return (
    <div
      className="study-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="study-modal study-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="study-modal-header">
          <h2>Study 设置</h2>
          <button
            className="study-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* 发音来源 */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            发音来源
          </div>

          <div className="study-audio-source-options">
            {(
              [
                {
                  key: "tts" as const,
                  label: "系统 TTS",
                  sub: "推荐。iOS 手势不会被打断",
                },
                {
                  key: "mp3" as const,
                  label: "自定义 mp3",
                  sub: "用你上传的 mp3，没有就静音",
                },
                {
                  key: "auto" as const,
                  label: "自动",
                  sub: "优先 mp3，失败时 TTS（桌面稳，iOS 可能失效）",
                },
              ] as {
                key: AudioSource;
                label: string;
                sub: string;
              }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`study-audio-source-option${
                  settings.audioSource === opt.key
                    ? " active"
                    : ""
                }`}
                onClick={() =>
                  patch({ audioSource: opt.key })
                }
              >
                <strong>{opt.label}</strong>
                <span>{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TTS 语速 */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            TTS 语速
          </div>

          <div className="study-settings-slider-row">
            <span>0.5</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={settings.ttsRate}
              onChange={(e) =>
                patch({
                  ttsRate: parseFloat(e.target.value),
                })
              }
            />
            <span>1.5</span>
          </div>
          <div className="study-settings-slider-value">
            当前：{settings.ttsRate.toFixed(2)}×
          </div>
        </div>

        {/* TTS 语音 */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            TTS 语音
          </div>

          {voices.length === 0 ? (
            <div className="study-settings-empty">
              还没有加载到系统语音。iOS 上请到 设置 →
              辅助功能 → 朗读内容 → 声音 → 英语
              下载语音包后再回来。
            </div>
          ) : (
            <select
              className="study-settings-select"
              value={settings.ttsVoiceName ?? ""}
              onChange={(e) =>
                patch({
                  ttsVoiceName:
                    e.target.value || null,
                })
              }
            >
              <option value="">系统默认</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 默认 voice（决定用哪个目录的 mp3） */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            自定义 mp3 目录
          </div>
          <div className="study-settings-hint">
            auto / mp3 模式下用这个目录的 mp3。
          </div>
          <div className="study-voice-segment">
            {(["levi", "erwin"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={
                  settings.defaultVoice === v
                    ? "active"
                    : ""
                }
                onClick={() =>
                  patch({ defaultVoice: v })
                }
              >
                {v === "levi" ? "Levi" : "Erwin"}
              </button>
            ))}
          </div>
        </div>

        {/* 每轮单词数 */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            每轮单词数
          </div>
          <div className="study-settings-hint">
            每次进入会话学习多少个单词。
          </div>

          <div className="study-session-size-row">
            <button
              type="button"
              className="study-session-size-step"
              onClick={() =>
                patch({
                  sessionSize: Math.max(
                    1,
                    settings.sessionSize - 5
                  ),
                })
              }
            >
              −5
            </button>

            <input
              type="number"
              className="study-session-size-input"
              min={1}
              max={500}
              value={settings.sessionSize}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isNaN(n)) return;
                patch({
                  sessionSize: Math.max(1, Math.min(500, n)),
                });
              }}
            />

            <button
              type="button"
              className="study-session-size-step"
              onClick={() =>
                patch({
                  sessionSize: Math.min(
                    500,
                    settings.sessionSize + 5
                  ),
                })
              }
            >
              +5
            </button>
          </div>

          <div className="study-session-size-quick">
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                type="button"
                className={
                  settings.sessionSize === n ? "active" : ""
                }
                onClick={() => patch({ sessionSize: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 气泡频率 */}
        <div className="study-settings-section">
          <div className="study-settings-label">
            鼓励气泡频率
          </div>
          <div className="study-voice-segment">
            {(
              [
                { key: "low", label: "低" },
                { key: "medium", label: "中" },
                { key: "high", label: "高" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                className={
                  settings.cheerFrequency === f.key
                    ? "active"
                    : ""
                }
                onClick={() =>
                  patch({ cheerFrequency: f.key })
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="study-settings-manage-btn"
            onClick={() => setShowCheerPool(true)}
          >
            管理鼓励卡池
          </button>
        </div>

        <div className="study-modal-footer">
          <button
            className="study-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>

      {showCheerPool && (
        <CheerPoolEditor
          onClose={() => setShowCheerPool(false)}
        />
      )}
    </div>
  );
}