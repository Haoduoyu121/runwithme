"use client";

import { useState } from "react";

import {
  loadWatchCards,
  saveWatchCards,
  DEFAULT_WATCH_CARDS,
  type WatchCard,
} from "@/lib/watchCards";

type Props = {
  onClose: () => void;
};

export default function WatchCardEditor({ onClose }: Props) {
  const [cards, setCards] = useState<WatchCard[]>(() =>
    loadWatchCards()
  );
  const [tab, setTab] = useState<"Levi" | "Erwin">("Levi");
  const [draft, setDraft] = useState("");

  function persist(next: WatchCard[]) {
    setCards(next);
    saveWatchCards(next);
  }

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;

    const next: WatchCard[] = [
      ...cards,
      {
        id: `w-${tab.toLowerCase()}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        character: tab,
        text,
        enabled: true,
      },
    ];
    persist(next);
    setDraft("");
  }

  function handleEdit(id: string, text: string) {
    persist(
      cards.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  function handleToggle(id: string) {
    persist(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    persist(cards.filter((c) => c.id !== id));
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复默认卡池？当前的会全部丢失。"
      )
    )
      return;
    persist(DEFAULT_WATCH_CARDS);
  }

  const visible = cards.filter((c) => c.character === tab);
  const total = cards.length;
  const enabledCount = cards.filter((c) => c.enabled).length;

  return (
    <div className="watch-import-backdrop" onClick={onClose}>
      <div
        className="watch-import-sheet watch-card-editor-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="watch-import-handle" />

        <div className="watch-invite-sheet-title">
          一起看 · 字卡池
        </div>
        <div className="watch-invite-sheet-sub">
          共 {total} 条 · 启用 {enabledCount} 条
        </div>

        <div className="watch-card-editor-tabs">
          <button
            className={
              "watch-import-tab" +
              (tab === "Levi" ? " active" : "")
            }
            onClick={() => setTab("Levi")}
          >
            Levi
          </button>
          <button
            className={
              "watch-import-tab" +
              (tab === "Erwin" ? " active" : "")
            }
            onClick={() => setTab("Erwin")}
          >
            Erwin
          </button>
        </div>

        <div className="watch-card-editor-add">
          <input
            className="watch-import-input"
            type="text"
            value={draft}
            placeholder={`给 ${tab} 加一条…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <button
            className="watch-card-editor-add-btn"
            onClick={handleAdd}
            disabled={!draft.trim()}
          >
            添加
          </button>
        </div>

        <div className="watch-card-editor-list">
          {visible.length === 0 ? (
            <div className="watch-card-editor-empty">
              这个角色还没有卡
            </div>
          ) : (
            visible.map((c) => (
              <div
                key={c.id}
                className={
                  "watch-card-editor-item" +
                  (c.enabled ? "" : " is-disabled")
                }
              >
                <input
                  className="watch-card-editor-text"
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleEdit(c.id, e.target.value)
                  }
                />
                <button
                  className="watch-card-editor-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>
                <button
                  className="watch-card-editor-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="watch-card-editor-footer">
          <button
            className="watch-card-editor-reset"
            onClick={handleReset}
          >
            恢复默认
          </button>
          <button
            className="watch-import-confirm"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}