"use client";

import { Check, X } from "lucide-react";

import type { ChatMessage } from "@/data/chat";
import { formatMoney } from "@/data/wallet";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
};

export default function GiftCard({
  message,
  names,
}: Props) {
  const g = message.gift;
  if (!g) return null;

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

      <div className="gift-card-divider" />

      <div className="gift-card-status">
        {g.status === "pending" && <span>等待回应…</span>}
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
    </div>
  );
}