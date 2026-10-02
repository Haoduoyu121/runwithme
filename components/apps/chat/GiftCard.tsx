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
};

export default function GiftCard({
  message,
  names,
  onOpenOrder,
}: Props) {
  const g = message.gift;
  const [order, setOrder] = useState<Order | null>(null);

  /* 如果关联了订单，订阅订单变化 */
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

  const isOutgoing = g.buyer === "You";
  const isFood = g.category === "food";

  const title = isOutgoing
    ? `送给 ${toName} 的${isFood ? "外卖" : "礼物"}`
    : `${g.buyer} 送的${isFood ? "外卖" : "礼物"}`;

  /* 订单状态优先 */
  const orderStage: OrderStage | null =
    order && order.logistics.length > 0
      ? currentStage(order)
      : null;

  /* 最终状态 */
  const finalStatus =
    order?.status === "cancelled"
      ? "rejected"
      : g.status;

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

      {/* 状态 */}
      <div className="gift-card-status">
        {finalStatus === "pending" && (
          <span>等待 {toName} 接受…</span>
        )}
        {finalStatus === "accepted" && orderStage && (
          <>
            <Check size={13} strokeWidth={3} />
            <span>{stageLabel(order?.kind ?? "goods", orderStage)}</span>
          </>
        )}
        {finalStatus === "accepted" && !orderStage && (
          <>
            <Check size={13} strokeWidth={3} />
            <span>已收下</span>
          </>
        )}
        {finalStatus === "rejected" && (
          <>
            <X size={13} strokeWidth={3} />
            <span>已拒绝 · 已退款</span>
          </>
        )}
      </div>

      {/* 查看订单按钮 */}
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