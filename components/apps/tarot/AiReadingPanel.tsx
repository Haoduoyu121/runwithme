"use client";

import { useEffect, useRef, useState } from "react";
import { X, Settings, Sparkles, RotateCcw, Save } from "lucide-react";
import {
  loadConfig,
  streamChat,
  type ChatMessage,
} from "@/lib/ai/apiClient";
import {
  loadReadingPrompt,
  saveReadingPrompt,
  buildReadingUserMessage,
  type ReadingCardRef,
} from "@/lib/tarotReading";

export default function AiReadingPanel({
  question,
  cards,
  initialReading,
  onClose,
  onReading,
}: {
  question: string;
  cards: ReadingCardRef[];
  initialReading?: string;
  onClose: () => void;
  onReading: (text: string) => void;
}) {
  const [showPresetEdit, setShowPresetEdit] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [reading, setReading] = useState(initialReading || "");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPromptDraft(loadReadingPrompt());
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [reading]);

  async function run() {
    const cfg = loadConfig();
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
      setErr(
        "请先到 /ai/settings 配置 API（Base URL / API Key / 模型）"
      );
      return;
    }
    setErr("");
    setReading("");
    setStreaming(true);
    abortRef.current = false;

    const sys: ChatMessage = {
      role: "system",
      content: loadReadingPrompt(),
    };
    const user: ChatMessage = {
      role: "user",
      content: buildReadingUserMessage(question, cards),
    };

    try {
      let acc = "";
      for await (const chunk of streamChat(cfg, [sys, user])) {
        if (abortRef.current) break;
        acc += chunk;
        setReading(acc);
      }
      if (acc.trim()) onReading(acc.trim());
      else setErr("AI 返回空内容");
    } catch (e) {
      setErr(
        "请求失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setStreaming(false);
    }
  }

  function savePreset() {
    saveReadingPrompt(promptDraft);
    setShowPresetEdit(false);
  }

  function resetPreset() {
    if (!window.confirm("恢复默认解读风格？")) return;
    saveReadingPrompt("");
    setPromptDraft(loadReadingPrompt());
  }

  return (
    <div className="tarot-wb-backdrop" onClick={onClose}>
      <div
        className="tarot-wb-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tarot-wb-header">
          <h2>{showPresetEdit ? "解读风格" : "塔罗解读"}</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {!showPresetEdit && !streaming && (
              <button
                className="tarot-icon-btn"
                onClick={() => setShowPresetEdit(true)}
                title="解读风格"
                aria-label="预设"
              >
                <Settings size={16} strokeWidth={2.2} />
              </button>
            )}
            {!showPresetEdit && !streaming && (
              <button
                className="tarot-icon-btn"
                onClick={() => void run()}
                title="重新解读"
                aria-label="重新解读"
              >
                <RotateCcw size={15} strokeWidth={2.2} />
              </button>
            )}
            <button
              className="tarot-icon-btn"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {showPresetEdit ? (
          <>
            <div className="tarot-wb-body">
              <div className="tarot-wb-tip">
                这是发给 AI 的 system prompt。决定解读的语气、结构、
                深度。改完点保存。
              </div>
              <textarea
                className="tarot-input tarot-textarea"
                rows={14}
                value={promptDraft}
                onChange={(e) =>
                  setPromptDraft(e.target.value)
                }
              />
            </div>
            <div className="tarot-wb-footer">
              <button
                className="tarot-btn"
                onClick={resetPreset}
              >
                恢复默认
              </button>
              <button
                className="tarot-btn primary"
                onClick={savePreset}
                style={{ flex: 1 }}
              >
                <Save size={14} strokeWidth={2.4} />
                保存风格
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="tarot-wb-body" ref={scrollRef}>
              {!reading && !streaming && !err && (
                <div className="tarot-reading-start">
                  <Sparkles
                    size={28}
                    strokeWidth={1.6}
                    className="tarot-reading-start-icon"
                  />
                  <div className="tarot-reading-start-text">
                    让 AI 为你解读这一副牌
                  </div>
                  <button
                    className="tarot-primary"
                    style={{ maxWidth: 220 }}
                    onClick={() => void run()}
                  >
                    开始解读
                  </button>
                </div>
              )}
              {reading && (
                <div className="tarot-reading-ai">{reading}</div>
              )}
              {streaming && !reading && (
                <div className="tarot-reading-wait">
                  正在感受牌面的气息…
                </div>
              )}
              {err && (
                <div className="tarot-reading-err">{err}</div>
              )}
            </div>
            {reading && !streaming && (
              <div className="tarot-wb-footer">
                <button
                  className="tarot-btn"
                  onClick={() => {
                    const t = reading;
                    navigator.clipboard?.writeText(t).catch(() => {});
                  }}
                >
                  复制
                </button>
                <button
                  className="tarot-btn primary"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  完成
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}