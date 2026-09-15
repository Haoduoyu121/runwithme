"use client";

import { useState } from "react";

import {
  createWishlistCardId,
  type WishlistCard,
} from "@/data/notes";

type Props = {
  cards: WishlistCard[];
  onChange: (next: WishlistCard[]) => void;
  onClose: () => void;
};

export default function WishlistPoolEditor({
  cards,
  onChange,
  onClose,
}: Props) {
  const [tab, setTab] =
    useState<"Levi" | "Erwin">("Levi");
  const [newText, setNewText] = useState("");

  const list = cards.filter((c) => c.character === tab);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    onChange([
      ...cards,
      {
        id: createWishlistCardId(tab),
        character: tab,
        text,
        enabled: true,
      },
    ]);
    setNewText("");
  }

  function handleToggle(id: string) {
    onChange(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  function handleDelete(id: string) {
    onChange(cards.filter((c) => c.id !== id));
  }

  function handleRename(id: string, text: string) {
    onChange(
      cards.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  return (
    <div
      className="notes-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="notes-modal notes-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notes-modal-header">
          <h2>Wishlist 卡池</h2>

          <button
            className="notes-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="notes-segment notes-pool-tabs">
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

        <div className="notes-pool-add">
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
            placeholder="新增一条愿望…"
            maxLength={60}
          />
          <button onClick={handleAdd}>添加</button>
        </div>

        <div className="notes-pool-list">
          {list.length === 0 ? (
            <div className="notes-pool-empty">
              还没有愿望卡
            </div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`notes-pool-item${
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
                  className="notes-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="notes-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="notes-modal-footer">
          <button
            className="notes-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}