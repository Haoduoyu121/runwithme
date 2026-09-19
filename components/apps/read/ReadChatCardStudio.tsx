"use client";

import { useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";

import {
  createReadChatCardId,
  loadReadChatCards,
  resetReadChatCards,
  saveReadChatCards,
  type ReadChatCard,
  type ReadChatCardCharacter,
} from "@/lib/readChatCards";

type ReadChatCardStudioProps = {
  onClose: () => void;
};

export default function ReadChatCardStudio({
  onClose,
}: ReadChatCardStudioProps) {
  const [tab, setTab] =
    useState<ReadChatCardCharacter>("Levi");
  const [cards, setCards] = useState<ReadChatCard[]>(() =>
    loadReadChatCards()
  );
  const [newText, setNewText] = useState("");

  function persist(next: ReadChatCard[]) {
    setCards(next);
    saveReadChatCards(next);
  }

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    persist([
      ...cards,
      {
        id: createReadChatCardId(tab.toLowerCase()),
        character: tab,
        text,
        category: "自定义",
        enabled: true,
      },
    ]);
    setNewText("");
  }

  function handleToggle(id: string) {
    persist(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleRename(id: string, text: string) {
    persist(
      cards.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  function handleDelete(id: string) {
    persist(cards.filter((c) => c.id !== id));
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复默认卡池？自定义的卡片会丢失。"
      )
    ) {
      return;
    }
    resetReadChatCards();
    setCards(loadReadChatCards());
  }

  const list = cards.filter((c) => c.character === tab);

  return (
    <div className="rccs-backdrop" onClick={onClose}>
      <div
        className="rccs-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rccs-header">
          <h2>Read Chat Cards</h2>
          <button
            className="rccs-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="rccs-tabs">
          <button
            className={tab === "Levi" ? "active" : ""}
            onClick={() => setTab("Levi")}
          >
            Levi
            <span className="rccs-count">
              {
                cards.filter(
                  (c) => c.character === "Levi"
                ).length
              }
            </span>
          </button>
          <button
            className={tab === "Erwin" ? "active" : ""}
            onClick={() => setTab("Erwin")}
          >
            Erwin
            <span className="rccs-count">
              {
                cards.filter(
                  (c) => c.character === "Erwin"
                ).length
              }
            </span>
          </button>
        </div>

        <div className="rccs-add">
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
            placeholder={`新增 ${tab} 会说的话…`}
            maxLength={80}
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
          >
            <Plus size={14} strokeWidth={2.6} />
            添加
          </button>
        </div>

        <div className="rccs-list">
          {list.length === 0 ? (
            <div className="rccs-empty">还没有卡片</div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`rccs-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <input
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={80}
                />
                <button
                  className="rccs-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>
                <button
                  className="rccs-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="rccs-footer">
          <button
            className="rccs-reset"
            onClick={handleReset}
          >
            <RotateCcw size={12} strokeWidth={2.2} />
            恢复默认
          </button>
          <button className="rccs-done" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}