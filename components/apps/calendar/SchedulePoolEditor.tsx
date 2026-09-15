"use client";

import { useState } from "react";

import type {
  ScheduleCard,
  ScheduleCardCharacter,
} from "@/data/calendarScheduleCards";

import { createScheduleCardId } from "@/lib/calendarSystemStorage";

type Props = {
  cards: ScheduleCard[];
  onChange: (next: ScheduleCard[]) => void;
  onClose: () => void;
};

export default function SchedulePoolEditor({
  cards,
  onChange,
  onClose,
}: Props) {
  const [tab, setTab] =
    useState<ScheduleCardCharacter>("Levi");
  const [newText, setNewText] = useState("");

  const list = cards.filter((c) => c.character === tab);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    onChange([
      ...cards,
      {
        id: createScheduleCardId(tab),
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
      cards.map((c) =>
        c.id === id ? { ...c, text } : c
      )
    );
  }

  return (
    <div
      className="calendar-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="calendar-modal calendar-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <h2>行程卡池</h2>

          <button
            className="calendar-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="calendar-segment calendar-pool-tabs">
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

        <div className="calendar-pool-add">
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
            placeholder="新增一条行程…"
            maxLength={40}
          />
          <button onClick={handleAdd}>添加</button>
        </div>

        <div className="calendar-pool-list">
          {list.length === 0 ? (
            <div className="calendar-pool-empty">
              还没有行程卡
            </div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`calendar-pool-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <input
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={40}
                />

                <button
                  className="calendar-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="calendar-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="calendar-modal-footer">
          <button
            className="calendar-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}