"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";

import type {
  WishlistItem,
  WishlistCompleter,
} from "@/data/notes";
import type { HighlightCard } from "@/data/diaryHighlights";
import { toAvatarKey } from "@/lib/useCharacterAvatars";

type Props = {
  item: WishlistItem;
  cards: HighlightCard[];
  avatars: Record<string, string | null>;
  onConfirm: (
    completedBy: WishlistCompleter[],
    note: string
  ) => void;
  onCancel: () => void;
};

export default function WishlistCompleteSheet({
  item,
  cards,
  avatars,
  onConfirm,
  onCancel,
}: Props) {
  const [who, setWho] = useState<WishlistCompleter[]>([
    "user",
  ]);
  const [note, setNote] = useState("");

  function toggleWho(c: WishlistCompleter) {
    setWho((prev) =>
      prev.includes(c)
        ? prev.filter((x) => x !== c)
        : [...prev, c]
    );
  }

  function pickFromPool() {
    const pool = cards.filter((c) => c.enabled);
    if (pool.length === 0) {
      window.alert("评价卡池是空的。");
      return;
    }
    const card =
      pool[Math.floor(Math.random() * pool.length)];
    setNote(card.text);
  }

  function renderAvatar(c: WishlistCompleter) {
    if (c === "user") {
      const url = avatars.you ?? null;
      return (
        <span
          className={`wish-complete-avatar wish-complete-avatar-user${
            url ? " has-image" : ""
          }`}
        >
          {url ? <img src={url} alt="我" /> : "我"}
        </span>
      );
    }
    const key = toAvatarKey(c);
    const url = key ? avatars[key] : null;
    return (
      <span
        className={`wish-complete-avatar wish-complete-avatar-${c.toLowerCase()}${
          url ? " has-image" : ""
        }`}
      >
        {url ? (
          <img src={url} alt={c} />
        ) : (
          c.charAt(0)
        )}
      </span>
    );
  }

  const canConfirm = who.length > 0;

  return (
    <div
      className="wish-complete-backdrop"
      onClick={onCancel}
    >
      <div
        className="wish-complete-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wish-complete-header">
          <h3>完成了</h3>
          <button
            className="wish-complete-close"
            onClick={onCancel}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="wish-complete-quote">
          「{item.text}」
        </div>

        <div className="wish-complete-section">
          <div className="wish-complete-label">
            谁完成的（可多选）
          </div>
          <div className="wish-complete-who">
            {(
              [
                "user",
                "Levi",
                "Erwin",
              ] as WishlistCompleter[]
            ).map((c) => (
              <button
                key={c}
                className={`wish-complete-who-btn${
                  who.includes(c) ? " active" : ""
                }`}
                onClick={() => toggleWho(c)}
                type="button"
              >
                {renderAvatar(c)}
                <span>{c === "user" ? "我" : c}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="wish-complete-section">
          <div className="wish-complete-label">
            写心得（可留空）
          </div>
          <textarea
            className="wish-complete-input"
            value={note}
            onChange={(e) =>
              setNote(e.target.value.slice(0, 80))
            }
            placeholder="写点什么…"
            maxLength={80}
          />
          <button
            type="button"
            className="wish-complete-pool-btn"
            onClick={pickFromPool}
          >
            <Sparkles size={12} strokeWidth={2} />
            从卡池抽一张
          </button>
        </div>

        <div className="wish-complete-actions">
          <button
            className="wish-complete-btn ghost"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="wish-complete-btn primary"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm(who, note.trim())
            }
          >
            <Check size={14} strokeWidth={2.4} />
            完成
          </button>
        </div>
      </div>
    </div>
  );
}