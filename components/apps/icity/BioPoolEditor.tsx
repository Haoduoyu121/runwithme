"use client";

import { useEffect, useState } from "react";

import { Plus, X } from "lucide-react";

import {
  createBioCardId,
  DEFAULT_ICITY_BIO_CARDS,
  loadBioCards,
  saveBioCards,
  type ICityBioCard,
} from "@/lib/icityBioStorage";

type Props = {
  onClose: () => void;
};

type Tab = "Levi" | "Erwin";

export default function BioPoolEditor({ onClose }: Props) {
  const [cards, setCards] = useState<ICityBioCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("Levi");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    setCards(loadBioCards());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBioCards(cards);
  }, [cards, hydrated]);

  const list = cards.filter((c) => c.character === tab);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;

    setCards([
      ...cards,
      {
        id: createBioCardId(),
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
      "runwithme_icity_bio_cards_v1"
    );
    setCards(DEFAULT_ICITY_BIO_CARDS);
  }

  return (
    <div
      className="icity-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="icity-modal icity-bio-pool-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="icity-modal-header">
          <h2>简介卡池</h2>
          <button
            className="icity-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="icity-bio-pool-hint">
          Levi 和 Erwin 的个人简介会从这里每天随机抽一条。
          你自己不改的话，他们会自己换。
        </div>

        <div className="icity-bio-pool-tabs">
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

        <div className="icity-bio-pool-add">
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
            placeholder={`新增 ${tab} 的简介…`}
            maxLength={60}
          />
          <button onClick={handleAdd}>
            <Plus size={14} strokeWidth={2.6} />
            添加
          </button>
        </div>

        <div className="icity-bio-pool-list">
          {list.length === 0 ? (
            <div className="icity-bio-pool-empty">
              还没有卡片
            </div>
          ) : (
            list.map((c) => (
              <div
                key={c.id}
                className={`icity-bio-pool-item${
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
                  className="icity-bio-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="icity-bio-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  <X size={14} strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="icity-modal-footer icity-bio-pool-footer">
          <button
            className="icity-btn ghost"
            onClick={handleReset}
          >
            恢复默认
          </button>
          <button
            className="icity-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}