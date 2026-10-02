"use client";

import { pushMemory } from "@/lib/memoryStorage";
import type { Order } from "@/data/order";

type EventType =
  | "order-placed"
  | "gift-accepted"
  | "gift-rejected"
  | "role-gift-sent"
  | "role-gift-accepted"
  | "role-gift-rejected"
  | "delivered"
  | "reviewed";

/* ---------- 工具 ---------- */

function buyerLabel(id: "you" | "levi" | "erwin"): string {
  if (id === "you") return "你";
  if (id === "levi") return "Levi";
  return "Erwin";
}

function receiverLabel(
  id: "you" | "levi" | "erwin"
): string {
  if (id === "you") return "你";
  if (id === "levi") return "Levi";
  return "Erwin";
}

function itemSummary(order: Order): string {
  const first = order.items[0];
  if (!first) return "商品";
  if (order.items.length > 1) {
    return `${first.productName} 等 ${order.items.length} 件`;
  }
  return first.productName;
}

/* ---------- 通用写入口 ---------- */

function push(
  order: Order,
  type: EventType,
  title: string,
  preview: string,
  timestamp?: number
) {
  pushMemory({
    sourceApp: "shop",
    sourceId: `${order.id}::${type}`,
    timestamp: timestamp ?? Date.now(),
    type: "milestone",
    title,
    preview,
    meta: {
      orderId: order.id,
      kind: order.kind,
      buyerId: order.buyerId,
      receiverId: order.receiverId,
      isGift: order.isGift,
      totalPrice: order.totalPrice,
      items: order.items.map((it) => ({
        name: it.productName,
        quantity: it.quantity,
        price: it.price,
      })),
    },
  });
}

/* ---------- 各事件 ---------- */

export function memoryOrderPlaced(order: Order): void {
  const buyer = buyerLabel(order.buyerId);
  const receiver = receiverLabel(order.receiverId);
  const summary = itemSummary(order);

  if (order.isGift && order.buyerId === "you") {
    push(
      order,
      "order-placed",
      `你给 ${receiver} 买了 ${summary}`,
      `¥${order.totalPrice}`
    );
  } else if (order.isGift && order.receiverId === "you") {
    push(
      order,
      "role-gift-sent",
      `${buyer} 送了你 ${summary}`,
      `¥${order.totalPrice}`
    );
  } else {
    push(
      order,
      "order-placed",
      `你买了 ${summary}`,
      `¥${order.totalPrice}`
    );
  }
}

export function memoryGiftAccepted(order: Order): void {
  const receiver = receiverLabel(order.receiverId);
  push(
    order,
    "gift-accepted",
    `${receiver} 收下了你的礼物`,
    itemSummary(order)
  );
}

export function memoryGiftRejected(order: Order): void {
  const receiver = receiverLabel(order.receiverId);
  push(
    order,
    "gift-rejected",
    `${receiver} 拒绝了你的礼物`,
    itemSummary(order)
  );
}

export function memoryRoleGiftAccepted(order: Order): void {
  const buyer = buyerLabel(order.buyerId);
  push(
    order,
    "role-gift-accepted",
    `你收下了 ${buyer} 的礼物`,
    itemSummary(order)
  );
}

export function memoryRoleGiftRejected(order: Order): void {
  const buyer = buyerLabel(order.buyerId);
  push(
    order,
    "role-gift-rejected",
    `你拒绝了 ${buyer} 的礼物`,
    itemSummary(order)
  );
}

export function memoryOrderDelivered(order: Order): void {
  push(
    order,
    "delivered",
    `${itemSummary(order)} 已送达`,
    `¥${order.totalPrice}`,
    order.deliveredAt ?? Date.now()
  );
}

export function memoryOrderReviewed(
  order: Order,
  rating: number,
  comment: string
): void {
  const stars = "★".repeat(rating);
  push(
    order,
    "reviewed",
    `你评价了 ${itemSummary(order)}`,
    `${stars}${comment ? " · " + comment : ""}`
  );
}