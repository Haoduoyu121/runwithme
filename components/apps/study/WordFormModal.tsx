"use client";

import { useEffect, useState } from "react";

import type { Word } from "@/data/study";

type Props = {
  initial: Word | null;
  onConfirm: (
    text: string,
    meaning: string,
    example: string
  ) => void;
  onClose: () => void;
};

export default function WordFormModal({
  initial,
  onConfirm,
  onClose,
}: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [meaning, setMeaning] = useState(
    initial?.meaning ?? ""
  );
  const [example, setExample] = useState(
    initial?.example ?? ""
  );

  useEffect(() => {
    setText(initial?.text ?? "");
    setMeaning(initial?.meaning ?? "");
    setExample(initial?.example ?? "");
  }, [initial]);

  function handleSave() {
    const t = text.trim();
    const m = meaning.trim();
    if (!t || !m) return;
    onConfirm(t, m, example.trim());
    onClose();
  }

  return (
    <div
      className="study-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="study-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="study-modal-header">
          <h2>{initial ? "编辑单词" : "添加单词"}</h2>
          <button
            className="study-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className="study-field">
          <span>单词</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：apple"
            maxLength={60}
            autoFocus
          />
        </label>

        <label className="study-field">
          <span>释义</span>
          <input
            type="text"
            value={meaning}
            onChange={(e) =>
              setMeaning(e.target.value)
            }
            placeholder="例如：苹果"
            maxLength={120}
          />
        </label>

        <label className="study-field">
          <span>例句（可选）</span>
          <input
            type="text"
            value={example}
            onChange={(e) =>
              setExample(e.target.value)
            }
            placeholder="例如：I ate an apple."
            maxLength={200}
          />
        </label>

        <div className="study-modal-footer">
          <button
            className="study-btn ghost"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="study-btn"
            onClick={handleSave}
            disabled={!text.trim() || !meaning.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}