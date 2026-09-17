"use client";

import { useEffect, useState } from "react";

import type { WordBook } from "@/data/study";

type Props = {
  initial: WordBook | null;
  onConfirm: (name: string, description: string) => void;
  onClose: () => void;
};

export default function BookFormModal({
  initial,
  onConfirm,
  onClose,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(
    initial?.description ?? ""
  );

  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
  }, [initial]);

  function handleSave() {
    const n = name.trim();
    if (!n) return;
    onConfirm(n, description.trim());
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
          <h2>{initial ? "编辑词书" : "新建词书"}</h2>
          <button
            className="study-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className="study-field">
          <span>名称</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：四级核心词汇"
            maxLength={40}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </label>

        <label className="study-field">
          <span>简介（可选）</span>
          <input
            type="text"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="例如：每天 20 个"
            maxLength={80}
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
            disabled={!name.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}