"use client";

import { useEffect, useState } from "react";

import { Plus, X } from "lucide-react";

import {
  DEFAULT_PERIOD_NOTE_CARDS,
  type PeriodNoteCard,
} from "@/data/period";

import {
  loadPeriodNoteCards,
  savePeriodNoteCards,
} from "@/lib/periodStorage";

type Props = {
  onClose: () => void;
};

type Tab = "Levi" | "Erwin";

const STORAGE_KEY = "runwithme_period_note_cards_v1";

function createNoteId(): string {
  return `period-note-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function PeriodNoteCardEditor({
  onClose,
}: Props) {
  const [cards, setCards] = useState<PeriodNoteCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("Levi");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    setCards(loadPeriodNoteCards());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePeriodNoteCards(cards);
  }, [cards, hydrated]);

  const list = cards.filter((c) => c.character === tab);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    setCards([
      ...cards,
      {
        id: createNoteId(),
        character: tab,
        text,
        enabled: true,
      },
    ]);
    setNewText("");
  }

  function handleRename(id: string, text: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  function handleToggle(id: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复到默认卡池？你添加的所有卡片都会被删除。"
      )
    )
      return;
    window.localStorage.removeItem(STORAGE_KEY);
    setCards(DEFAULT_PERIOD_NOTE_CARDS);
  }

  return (
    <div
      className="period-note-editor-backdrop"
      onClick={onClose}
    >
      <div
        className="period-note-editor"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="period-note-editor-header">
          <div>
            <div className="period-sheet-eyebrow">
              PERIOD
            </div>
            <h2>随机备注卡池</h2>
          </div>
          <button
            className="period-sheet-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="period-note-editor-hint">
          开始经期时会从卡池里随机抽一条。不做医疗建议。
        </div>

        <div className="period-note-editor-tabs">
          <button
            className={tab === "Levi" ? "active" : ""}
            onClick={() => setTab("Levi")}
          >
            Levi
          </button>
          <button
            className={tab === "Erwin" ? "active" : ""}
            onClick={() => setTab("Erwin")}
          >
            Erwin
          </button>
        </div>

        <div className="period-note-editor-add">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={`新增 ${tab} 的备注…`}
            maxLength={60}
          />
          <button onClick={handleAdd}>
            <Plus size={14} strokeWidth={2.6} />
            添加
          </button>
        </div>

        <div className="period-note-editor-list">
          {list.length === 0 ? (
            <div className="period-note-editor-empty">
              还没有卡片
            </div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`period-note-editor-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <input
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={60}
                />

                <button
                  className="period-note-editor-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="period-note-editor-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  <X size={14} strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="period-note-editor-footer">
          <button
            className="period-note-editor-reset"
            onClick={handleReset}
          >
            恢复默认
          </button>
          <button
            className="period-note-editor-done"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}