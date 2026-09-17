"use client";

import { useEffect, useState } from "react";

import {
  createCheerCardId,
  type StudyCheerCard,
} from "@/data/study";

import {
  loadCheerCards,
  saveCheerCards,
} from "@/lib/studyStorage";

import { DEFAULT_STUDY_CHEER_CARDS } from "@/data/studyCheerCards";

type Props = {
  onClose: () => void;
};

type Tab = "Levi" | "Erwin";

export default function CheerPoolEditor({ onClose }: Props) {
  const [cards, setCards] = useState<StudyCheerCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("Levi");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    setCards(loadCheerCards());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCheerCards(cards);
  }, [cards, hydrated]);

  const list = cards.filter((c) => c.character === tab);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    setCards([
      ...cards,
      {
        id: createCheerCardId(tab),
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
    window.localStorage.removeItem(
      "runwithme_study_cheer_v1"
    );
    setCards(DEFAULT_STUDY_CHEER_CARDS);
  }

  return (
    <div
      className="study-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="study-modal study-cheer-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="study-modal-header">
          <h2>鼓励卡池</h2>
          <button
            className="study-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="study-cheer-pool-hint">
          背单词时偶尔冒出的小气泡，就是从这些卡里抽的。
        </div>

        <div className="study-voice-segment">
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

        <div className="study-cheer-pool-add">
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
            placeholder={`新增 ${tab} 的鼓励语…`}
            maxLength={40}
          />
          <button onClick={handleAdd}>添加</button>
        </div>

        <div className="study-cheer-pool-list">
          {list.length === 0 ? (
            <div className="study-cheer-pool-empty">
              还没有卡片
            </div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`study-cheer-pool-item${
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
                  className="study-cheer-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="study-cheer-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="study-modal-footer study-modal-footer-split">
          <button
            className="study-btn ghost"
            onClick={handleReset}
          >
            恢复默认
          </button>
          <button
            className="study-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}