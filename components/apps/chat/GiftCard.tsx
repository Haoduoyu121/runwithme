"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  X,
} from "lucide-react";

import type { ChatMessage } from "@/data/chat";
import { formatMoney } from "@/data/wallet";
import {
  STAGE_LABELS,
  stageProgress,
} from "@/lib/shopDelivery";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
  onRate?: (
    messageId: string,
    rating: number,
    comment: string
  ) => void;
};

export default function GiftCard({
  message,
  names,
  onRate,
}: Props) {
  const g = message.gift;
  if (!g) return null;

  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState("");

  const toName =
    g.receiver === "Levi"
      ? names.levi
      : g.receiver === "Erwin"
        ? names.erwin
        : g.receiver === "You"
          ? names.you
          : g.receiver;

  const isOutgoing = g.buyer === "You";
  const isFood = g.category === "food";

  const title = isOutgoing
    ? `送给 ${toName} 的${isFood ? "外卖" : "礼物"}`
    : `${g.buyer} 送的${isFood ? "外卖" : "礼物"}`;

  const d = g.delivery;
  const progress = d ? stageProgress(g.category, d.stage) : 0;

  const canRate =
    isOutgoing &&
    !!onRate &&
    g.status === "accepted" &&
    d?.stage === "signed" &&
    !d.rating;

  return (
    <div
      className={
        "gift-card" +
        (g.status === "accepted" ? " is-accepted" : "") +
        (g.status === "rejected" ? " is-rejected" : "")
      }
    >
      <div className="gift-card-title">{title}</div>

      <div className="gift-card-emoji">{g.itemEmoji}</div>

      <div className="gift-card-name">{g.itemName}</div>

      <div className="gift-card-price">
        {formatMoney(g.price)}
      </div>

      {g.note && (
        <div className="gift-card-note">{g.note}</div>
      )}

      {d && (
        <>
          <div className="gift-card-divider" />

          <div className="gift-card-tracking">
            <span className="gift-card-tracking-no">
              {d.trackingNo}
            </span>
            <button
              type="button"
              className="gift-card-tracking-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? (
                <ChevronUp size={14} strokeWidth={2.4} />
              ) : (
                <ChevronDown size={14} strokeWidth={2.4} />
              )}
            </button>
          </div>

          <div className="gift-card-progress">
            <div
              className="gift-card-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="gift-card-stage">
            {STAGE_LABELS[d.stage]}
          </div>

          {expanded && (
            <div className="gift-card-history">
              {d.history.map((h, i) => (
                <div
                  key={i}
                  className="gift-card-history-row"
                >
                  <span className="gift-card-history-dot" />
                  <span className="gift-card-history-label">
                    {STAGE_LABELS[h.stage]}
                  </span>
                  <span className="gift-card-history-time">
                    {formatTime(h.at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="gift-card-divider" />

      <div className="gift-card-status">
        {g.status === "pending" && (
          <>
            <span>
              {d?.stage === "delivered"
                ? "等对方接收…"
                : "配送中…"}
            </span>
          </>
        )}
        {g.status === "accepted" && (
          <>
            <Check size={13} strokeWidth={3} />
            <span>已收下</span>
          </>
        )}
        {g.status === "rejected" && (
          <>
            <X size={13} strokeWidth={3} />
            <span>已退回 · 已退款</span>
          </>
        )}
      </div>

      {d?.rating && (
        <div className="gift-card-rating">
          <span className="gift-card-rating-stars">
            {"★".repeat(d.rating)}
            {"☆".repeat(5 - d.rating)}
          </span>
          {d.ratingComment && (
            <span className="gift-card-rating-comment">
              {d.ratingComment}
            </span>
          )}
        </div>
      )}

      {canRate && !showRating && (
        <button
          type="button"
          className="gift-card-rate-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowRating(true);
          }}
        >
          <Star size={13} strokeWidth={2.2} />
          <span>评价</span>
        </button>
      )}

      {showRating && (
        <div
          className="gift-card-rate-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gift-card-rate-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={
                  "gift-card-rate-star" +
                  (n <= ratingDraft ? " active" : "")
                }
                onClick={() => setRatingDraft(n)}
              >
                ★
              </button>
            ))}
          </div>
          <input
            type="text"
            className="gift-card-rate-input"
            value={commentDraft}
            onChange={(e) =>
              setCommentDraft(e.target.value)
            }
            placeholder="说点什么（可选）"
            maxLength={40}
          />
          <div className="gift-card-rate-actions">
            <button
              type="button"
              className="gift-card-rate-cancel"
              onClick={() => setShowRating(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="gift-card-rate-submit"
              onClick={() => {
                onRate?.(
                  message.id,
                  ratingDraft,
                  commentDraft.trim()
                );
                setShowRating(false);
              }}
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}