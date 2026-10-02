"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  X,
} from "lucide-react";

import type { ChatMessage } from "@/data/chat";
import { formatMoney } from "@/data/wallet";
import type { Order } from "@/data/order";
import {
  loadOrders,
  currentStage,
  ORDER_EVENT,
} from "@/lib/orderStorage";
import {
  stageLabel,
  type OrderStage,
} from "@/data/order";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
  onOpenOrder?: (orderId: string) => void;
  /** 用户接受角色礼物 */
  onAccept?: () => void;
  /** 用户拒绝角色礼物 */
  onReject?: () => void;
};

export default function GiftCard({
  message,
  names,
  onOpenOrder,
  onAccept,
  onReject,
}: Props) {
  const g = message.gift;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!g?.orderId) {
      setOrder(null);
      return;
    }
    const reload = () => {
      const list = loadOrders();
      setOrder(
        list.find((o) => o.id === g.orderId) ?? null
      );
    };
    reload();
    window.addEventListener(ORDER_EVENT, reload);
    return () => {
      window.removeEventListener(ORDER_EVENT, reload);
    };
  }, [g?.orderId]);

  if (!g) return null;

  const toName =
    g.receiver === "Levi"
      ? names.levi
      : g.receiver === "Erwin"
        ? names.erwin
        : g.receiver === "You"
          ? names.you
          : g.receiver;

  const fromName =
    g.buyer === "Levi"
      ? names.levi
      : g.buyer === "Erwin"
        ? names.erwin
        : names.you;

  const isOutgoing = g.buyer === "You";
  const isFood = g.category === "food";

  const title = isOutgoing
    ? `送给 ${toName} 的${isFood ? "外卖" : "礼物"}`
    : `${fromName} 送的${isFood ? "外卖" : "礼物"}`;

  const orderStage: OrderStage | null =
    order && order.logistics.length > 0
      ? currentStage(order)
      : null;

  const finalStatus =
    order?.status === "cancelled"
      ? "rejected"
      : g.status;

  /* 可响应：用户是收件人 + pending */
  const canRespond =
    !isOutgoing &&
    g.receiver === "You" &&
    finalStatus === "pending" &&
    !!onAccept &&
    !!onReject;

  return (
    <div
      className={
        "gift-card" +
        (finalStatus === "accepted"
          ? " is-accepted"
          : "") +
        (finalStatus === "rejected"
          ? " is-rejected"
          : "")
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
        {finalStatus === "pending" && !canRespond && (
          <span>等待 {toName} 接受…</span>
        )}
        {finalStatus === "pending" && canRespond && (
          <span>等待你接受</span>
        )}
        {finalStatus === "accepted" && orderStage && (
          <>
            <Check size={13} strokeWidth={3} />
            <span>
              {stageLabel(order?.kind ?? "goods", orderStage)}
            </span>
          </>
        )}
        {finalStatus === "accepted" && !orderStage && (
          <>
            <Check size={13} strokeWidth={3} />
            <span>已接受</span>
          </>
        )}
        {finalStatus === "rejected" && (
          <>
            <X size={13} strokeWidth={3} />
            <span>已拒绝 · 已退款</span>
          </>
        )}
      </div>

      {canRespond && (
        <div className="gift-card-actions">
          <button
            type="button"
            className="gift-card-btn reject"
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
          >
            <X size={14} strokeWidth={2.6} />
            <span>拒绝</span>
          </button>
          <button
            type="button"
            className="gift-card-btn accept"
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
          >
            <Check size={14} strokeWidth={2.6} />
            <span>接受</span>
          </button>
        </div>
      )}

      {order && onOpenOrder && (
        <button
          type="button"
          className="gift-card-view-order"
          onClick={(e) => {
            e.stopPropagation();
            onOpenOrder(order.id);
          }}
        >
          <span>查看订单</span>
          <ArrowRight size={13} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}