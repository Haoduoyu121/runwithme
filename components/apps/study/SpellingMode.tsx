"use client";

import { useEffect, useRef, useState } from "react";

import { Check, X } from "lucide-react";

import type { Word } from "@/data/study";

type Props = {
  word: Word;
  onResult: (correct: boolean) => void;
  onPlay: () => void;
};

type Status = "idle" | "correct" | "wrong";

export default function SpellingMode({
  word,
  onResult,
  onPlay,
}: Props) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInput("");
    setStatus("idle");
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(t);
  }, [word.id]);

  function check() {
    const v = input.trim().toLowerCase();
    if (!v) return;

    const correct =
      v === word.text.toLowerCase().replace(/\s+/g, " ");

    if (correct) {
      setStatus("correct");
      onPlay();
      window.setTimeout(() => onResult(true), 800);
    } else {
      setStatus("wrong");
      onPlay();
    }
  }

  function skip() {
    setStatus("wrong");
    onPlay();
  }

  function goNext() {
    onResult(status === "correct");
  }

  return (
    <>
      <div className="study-spell-body">
        <div className="study-spell-prompt">
          <div className="study-spell-prompt-label">
            根据释义拼出单词
          </div>

          <div className="study-spell-meaning">
            {word.meaning}
          </div>

          {status === "wrong" && (
            <div className="study-spell-answer">
              正确答案：
              <strong>{word.text}</strong>
            </div>
          )}
        </div>

        <div
          className={`study-spell-input-wrap study-spell-input-${status}`}
        >
          <input
            ref={inputRef}
            type="text"
            className="study-spell-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (status === "idle") {
                check();
              } else if (status === "wrong") {
                goNext();
              }
            }}
            placeholder="输入单词…"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            disabled={status === "correct"}
          />

          {status === "correct" && (
            <span className="study-spell-icon study-spell-icon-correct">
              <Check size={22} strokeWidth={3} />
            </span>
          )}
          {status === "wrong" && (
            <span className="study-spell-icon study-spell-icon-wrong">
              <X size={22} strokeWidth={3} />
            </span>
          )}
        </div>
      </div>

      <div className="study-session-controls">
        {status === "idle" && (
          <>
            <button
              className="study-session-btn study-session-btn-unknown"
              onClick={skip}
            >
              不会
            </button>
            <button
              className="study-session-btn primary"
              onClick={check}
              disabled={!input.trim()}
            >
              提交
            </button>
          </>
        )}

        {status === "correct" && (
          <div className="study-spell-feedback study-spell-feedback-correct">
            ✓ 正确
          </div>
        )}

        {status === "wrong" && (
          <button
            className="study-session-btn primary"
            onClick={goNext}
          >
            继续 →
          </button>
        )}
      </div>
    </>
  );
}