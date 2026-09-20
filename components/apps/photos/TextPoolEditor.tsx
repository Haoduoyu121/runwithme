"use client";

import { useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";

import type {
  PhotoTextPools,
  PhotoTextPoolKey,
} from "@/data/photoTextCards";
import {
  PHOTO_TEXT_POOL_LABELS,
  PHOTO_TEXT_POOL_ORDER,
  PHOTO_TEXT_POOL_MAX,
  DEFAULT_PHOTO_TEXT_POOLS,
} from "@/data/photoTextCards";

type Props = {
  pools: PhotoTextPools;
  onChange: (next: PhotoTextPools) => void;
  onClose: () => void;
};

export default function TextPoolEditor({
  pools,
  onChange,
  onClose,
}: Props) {
  const [tab, setTab] =
    useState<PhotoTextPoolKey>("place");
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState<
    number | null
  >(null);
  const [editingValue, setEditingValue] = useState("");

  const list = pools[tab];

  function add() {
    const t = draft.trim();
    if (!t) return;
    if (list.includes(t)) {
      setDraft("");
      return;
    }
    if (list.length >= PHOTO_TEXT_POOL_MAX) {
      window.alert(
        `每个词条池最多 ${PHOTO_TEXT_POOL_MAX} 条。`
      );
      return;
    }
    onChange({ ...pools, [tab]: [...list, t] });
    setDraft("");
  }

  function remove(index: number) {
    const next = list.filter((_, i) => i !== index);
    onChange({ ...pools, [tab]: next });
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditingValue(list[index]);
  }

  function commitEdit() {
    if (editingIndex === null) return;
    const t = editingValue.trim();
    if (!t) {
      setEditingIndex(null);
      return;
    }
    const next = list.map((v, i) =>
      i === editingIndex ? t : v
    );
    onChange({ ...pools, [tab]: next });
    setEditingIndex(null);
  }

  function resetCurrent() {
    if (
      !window.confirm(
        `恢复「${PHOTO_TEXT_POOL_LABELS[tab]}」默认？（当前修改会丢失）`
      )
    )
      return;
    onChange({
      ...pools,
      [tab]: DEFAULT_PHOTO_TEXT_POOLS[tab],
    });
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
          <h2>文字相册词库</h2>
          <button
            className="notes-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="notes-segment notes-pool-tabs">
          {PHOTO_TEXT_POOL_ORDER.map((k) => (
            <button
              key={k}
              className={tab === k ? "active" : ""}
              onClick={() => {
                setTab(k);
                setEditingIndex(null);
              }}
            >
              {PHOTO_TEXT_POOL_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="notes-pool-add">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={`新增一条${
              PHOTO_TEXT_POOL_LABELS[tab]
            }…`}
            maxLength={24}
          />
          <button onClick={add}>
            <Plus size={14} strokeWidth={2.4} />
          </button>
        </div>

        <div className="notes-pool-list">
          {list.length === 0 ? (
            <div className="notes-pool-empty">
              还没有词条
            </div>
          ) : (
            list.map((v, i) =>
              editingIndex === i ? (
                <div
                  key={`edit-${i}`}
                  className="notes-pool-item"
                >
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) =>
                      setEditingValue(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      }
                      if (e.key === "Escape") {
                        setEditingIndex(null);
                      }
                    }}
                    onBlur={commitEdit}
                    maxLength={24}
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  key={`item-${i}-${v}`}
                  className="notes-pool-item photo-text-pool-item"
                >
                  <button
                    type="button"
                    className="photo-text-pool-item-text"
                    onClick={() => startEdit(i)}
                  >
                    {v}
                  </button>
                  <button
                    className="notes-pool-delete"
                    onClick={() => remove(i)}
                    aria-label="删除"
                  >
                    <X size={12} strokeWidth={2.4} />
                  </button>
                </div>
              )
            )
          )}
        </div>

        <div className="notes-modal-footer">
          <button
            className="notes-list-clear-filter"
            onClick={resetCurrent}
          >
            <RotateCcw size={12} strokeWidth={2} /> 恢复
            {PHOTO_TEXT_POOL_LABELS[tab]}默认
          </button>
        </div>
      </div>
    </div>
  );
}