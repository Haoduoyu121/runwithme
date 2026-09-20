"use client";

import { useState } from "react";
import { ChevronLeft, Trash2, X } from "lucide-react";

import type {
  PhotoTextCard,
  PhotoTextPools,
  PhotoTextPoolKey,
} from "@/data/photoTextCards";
import {
  PHOTO_TEXT_POOL_LABELS,
  PHOTO_TEXT_POOL_ORDER,
  PHOTO_TEXT_POOL_MAX,
} from "@/data/photoTextCards";

import TextCard from "./TextCard";

type Props = {
  card: PhotoTextCard;
  pools: PhotoTextPools;
  avatars: Record<string, string | null>;
  onChange: (next: PhotoTextCard) => void;
  onDelete: () => void;
  onPoolsChange: (next: PhotoTextPools) => void;
  onClose: () => void;
};

export default function TextCardViewer({
  card,
  pools,
  avatars,
  onChange,
  onDelete,
  onPoolsChange,
  onClose,
}: Props) {
  const [editingKey, setEditingKey] =
    useState<PhotoTextPoolKey | null>(null);
  const [draft, setDraft] = useState("");

  function fieldValue(k: PhotoTextPoolKey): string {
    return card[k];
  }

  function pickPoolValue(k: PhotoTextPoolKey, v: string) {
    onChange({ ...card, [k]: v });
    setEditingKey(null);
  }

  function addToPool(k: PhotoTextPoolKey) {
    const t = draft.trim();
    if (!t) return;
    if (pools[k].includes(t)) {
      pickPoolValue(k, t);
      setDraft("");
      return;
    }
    if (pools[k].length >= PHOTO_TEXT_POOL_MAX) {
      window.alert(
        `每个词条池最多 ${PHOTO_TEXT_POOL_MAX} 条。`
      );
      return;
    }
    const nextPools = {
      ...pools,
      [k]: [...pools[k], t],
    };
    onPoolsChange(nextPools);
    pickPoolValue(k, t);
    setDraft("");
  }

  return (
    <div className="photo-text-viewer">
      <header className="photo-text-viewer-header">
        <button
          className="photo-text-viewer-btn"
          onClick={onClose}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.4} />
        </button>

        <div className="photo-text-viewer-title">
          {card.author} 拍的照片
        </div>

        <button
          className="photo-text-viewer-btn photo-text-viewer-btn-danger"
          onClick={() => {
            if (window.confirm("删除这张照片？")) {
              onDelete();
            }
          }}
          aria-label="删除"
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      </header>

      <div className="photo-text-viewer-body">
        <div className="photo-text-viewer-cardwrap">
          <TextCard
            card={card}
            variant="full"
            avatars={avatars}
          />
        </div>

        <div className="photo-text-viewer-meta">
          {card.author} 拍的照片
        </div>

        <div className="photo-text-viewer-fields">
          {PHOTO_TEXT_POOL_ORDER.map((k) => (
            <button
              key={k}
              className="photo-text-viewer-field"
              onClick={() => {
                setEditingKey(k);
                setDraft("");
              }}
              type="button"
            >
              <span className="photo-text-viewer-field-label">
                {PHOTO_TEXT_POOL_LABELS[k]}
              </span>
              <span className="photo-text-viewer-field-value">
                {fieldValue(k)}
              </span>
              <span className="photo-text-viewer-field-hint">
                点击更换
              </span>
            </button>
          ))}
        </div>
      </div>

      {editingKey && (
        <div
          className="photo-text-picker-backdrop"
          onClick={() => setEditingKey(null)}
        >
          <div
            className="photo-text-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="photo-text-picker-header">
              <h3>
                选一个
                {PHOTO_TEXT_POOL_LABELS[editingKey]}
              </h3>
              <button
                className="photo-text-picker-close"
                onClick={() => setEditingKey(null)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div className="photo-text-picker-add">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addToPool(editingKey);
                  }
                }}
                placeholder="新增一个…"
                maxLength={24}
              />
              <button
                onClick={() => addToPool(editingKey)}
              >
                添加
              </button>
            </div>

            <div className="photo-text-picker-list">
              {pools[editingKey].length === 0 ? (
                <div className="photo-text-picker-empty">
                  这个池是空的
                </div>
              ) : (
                pools[editingKey].map((v, i) => (
                  <button
                    key={`${v}-${i}`}
                    className={`photo-text-picker-item${
                      v === fieldValue(editingKey)
                        ? " active"
                        : ""
                    }`}
                    onClick={() =>
                      pickPoolValue(editingKey, v)
                    }
                  >
                    {v}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}