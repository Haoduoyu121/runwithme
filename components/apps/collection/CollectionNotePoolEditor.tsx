"use client";

import { useEffect, useMemo, useState } from "react";

import {
  loadCollectionNoteCards,
  saveCollectionNoteCards,
  addCollectionNoteCard,
} from "@/lib/collectionNoteCardStorage";

import type {
  CollectionNoteCard,
  CollectionNoteOwner,
} from "@/data/collectionNoteCards";

type Props = {
  onClose: () => void;
};

type OwnerFilter = "all" | CollectionNoteOwner;

const OWNER_LABELS: Record<CollectionNoteOwner, string> = {
  levi: "Levi",
  erwin: "Erwin",
  both: "通用",
};

const OWNER_FILTERS: {
  key: OwnerFilter;
  label: string;
}[] = [
  { key: "all", label: "全部" },
  { key: "both", label: "通用" },
  { key: "levi", label: "Levi" },
  { key: "erwin", label: "Erwin" },
];

export default function CollectionNotePoolEditor({
  onClose,
}: Props) {
  const [cards, setCards] = useState<CollectionNoteCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<OwnerFilter>("all");

  const [newText, setNewText] = useState("");
  const [newOwner, setNewOwner] =
    useState<CollectionNoteOwner>("both");

  /* 加载 */
  useEffect(() => {
    setCards(loadCollectionNoteCards());
    setHydrated(true);
  }, []);

  /* 保存 */
  useEffect(() => {
    if (!hydrated) return;
    saveCollectionNoteCards(cards);
  }, [cards, hydrated]);

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => c.owner === filter);
  }, [cards, filter]);

  function handleAdd() {
    const t = newText.trim();
    if (!t) return;
    setCards(addCollectionNoteCard(cards, t, newOwner));
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
    if (!window.confirm("删除这张卡片？")) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleChangeOwner(
    id: string,
    owner: CollectionNoteOwner
  ) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, owner } : c))
    );
  }

  function handleReset() {
    if (
      !window.confirm(
        "恢复到默认卡池？你添加的所有卡片都会被删除。"
      )
    )
      return;
    window.localStorage.removeItem(
      "runwithme_collection_note_cards_v1"
    );
    setCards(loadCollectionNoteCards());
  }

  return (
    <div
      className="collection-pool-backdrop"
      onClick={onClose}
    >
      <div
        className="collection-pool-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="collection-pool-header">
          <h2>收藏备注卡池</h2>
          <button
            className="collection-pool-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="collection-pool-hint">
          Levi / Erwin 收藏用户内容时，会从这里抽一句作为备注。
        </div>

        {/* owner 筛选 */}
        <div className="collection-pool-segment">
          {OWNER_FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "active" : ""}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 添加 */}
        <div className="collection-pool-add">
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
            placeholder="新增备注卡…"
            maxLength={120}
          />
          <select
            value={newOwner}
            onChange={(e) =>
              setNewOwner(
                e.target.value as CollectionNoteOwner
              )
            }
          >
            <option value="both">通用</option>
            <option value="levi">Levi</option>
            <option value="erwin">Erwin</option>
          </select>
          <button onClick={handleAdd}>添加</button>
        </div>

        {/* 列表 */}
        <div className="collection-pool-list">
          {filtered.length === 0 ? (
            <div className="collection-pool-empty">
              还没有卡片
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`collection-pool-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <select
                  className="collection-pool-owner-select"
                  value={c.owner}
                  onChange={(e) =>
                    handleChangeOwner(
                      c.id,
                      e.target.value as CollectionNoteOwner
                    )
                  }
                >
                  <option value="both">通用</option>
                  <option value="levi">Levi</option>
                  <option value="erwin">Erwin</option>
                </select>

                <input
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={120}
                />

                <button
                  className="collection-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="collection-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="collection-pool-footer">
          <button
            className="collection-pool-reset"
            onClick={handleReset}
          >
            恢复默认
          </button>
          <button
            className="collection-pool-done"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}