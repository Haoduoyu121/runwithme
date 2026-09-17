"use client";

import { useState } from "react";

type Tab = "text" | "choice";

type Props = {
  onClose: () => void;
  onSubmitText: (text: string) => void;
  onSubmitChoice: (
    question: string,
    options: string[]
  ) => void;
};

export default function NewQuestionModal({
  onClose,
  onSubmitText,
  onSubmitChoice,
}: Props) {
  const [tab, setTab] = useState<Tab>("text");

  /* 文字问题 */
  const [text, setText] = useState("");

  /* 选项问卷 */
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([
    "",
    "",
  ]);

  function addOption() {
    if (options.length >= 4) return;
    setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, v: string) {
    setOptions((prev) =>
      prev.map((x, idx) => (idx === i ? v : x))
    );
  }

  function handleSubmit() {
    if (tab === "text") {
      const t = text.trim();
      if (!t) return;
      onSubmitText(t);
      onClose();
      return;
    }

    const q = question.trim();
    const opts = options
      .map((x) => x.trim())
      .filter(Boolean);

    if (!q || opts.length < 2) return;
    onSubmitChoice(q, opts);
    onClose();
  }

  const canSubmit =
    tab === "text"
      ? text.trim().length > 0
      : question.trim().length > 0 &&
        options.filter((x) => x.trim()).length >= 2;

  return (
    <div
      className="q-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="q-modal q-ask-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="q-modal-header">
          <h2>New Question</h2>
          <button
            className="q-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="q-tab-segment">
          <button
            className={tab === "text" ? "active" : ""}
            onClick={() => setTab("text")}
            type="button"
          >
            文字问题
          </button>
          <button
            className={
              tab === "choice" ? "active" : ""
            }
            onClick={() => setTab("choice")}
            type="button"
          >
            选项问卷
          </button>
        </div>

        {tab === "text" && (
          <>
            <div className="q-ask-to">
              Levi 和 Erwin 都会回答
            </div>

            <textarea
              className="q-ask-textarea"
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              placeholder="问他们一个问题…"
              maxLength={200}
              autoFocus
              rows={4}
            />
          </>
        )}

        {tab === "choice" && (
          <>
            <div className="q-ask-to">
              Levi 和 Erwin 会各自随机选一个选项
            </div>

            <input
              type="text"
              className="q-choice-question-input"
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              placeholder="问题…"
              maxLength={200}
              autoFocus
            />

            <div className="q-choice-options">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="q-choice-option-row"
                >
                  <span className="q-choice-option-label">
                    {String.fromCharCode(65 + i)}
                  </span>

                  <input
                    type="text"
                    className="q-choice-option-input"
                    value={opt}
                    onChange={(e) =>
                      updateOption(i, e.target.value)
                    }
                    placeholder={`选项 ${String.fromCharCode(
                      65 + i
                    )}…`}
                    maxLength={80}
                  />

                  {options.length > 2 && (
                    <button
                      className="q-choice-option-remove"
                      onClick={() => removeOption(i)}
                      type="button"
                      aria-label="删除选项"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 4 && (
              <button
                className="q-choice-add-option"
                onClick={addOption}
                type="button"
              >
                ＋ 添加选项（最多 4 个）
              </button>
            )}
          </>
        )}

        <div className="q-modal-footer">
          <button
            className="q-btn ghost"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="q-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            发布
          </button>
        </div>
      </div>
    </div>
  );
}