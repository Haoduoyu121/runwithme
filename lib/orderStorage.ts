"use client";

import {
  STAGE_ORDER,
  STAGE_DELAYS,
  type Order,
  type OrderStage,
  type LogisticsEvent,
} from "@/data/order";
import type { ShopOwnerId } from "@/data/shopV2";

const KEY = "runwithme_orders_v1";
const EVT = "runwithme:orders-updated";

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

export function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveOrders(list: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    emit();
  } catch (e) {
    console.error("保存订单失败:", e);
  }
}

export function upsertOrder(order: Order): void {
  const list = loadOrders();
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    list[idx] = order;
  } else {
    list.unshift(order);
  }
  saveOrders(list);
}

export function loadOrdersByOwner(
  ownerId: ShopOwnerId
): Order[] {
  return loadOrders().filter(
    (o) =>
      o.buyerId === ownerId || o.receiverId === ownerId
  );
}

/* ---------- 物流推进 ---------- */

function getStageDelays(
  kind: "goods" | "food",
  speed: number
): Record<OrderStage, number> {
  const base = STAGE_DELAYS[kind];
  const factor = speed > 0 ? speed : 1;
  const out = {} as Record<OrderStage, number>;
  for (const key of STAGE_ORDER) {
    out[key] = (base[key] * 1000) / factor;
  }
  return out;
}

/**
 * 按时间戳追赶物流。返回更新后的订单。
 * 只处理 status === "active" 的订单。
 */
export function advanceOrder(
  order: Order,
  speed: number
): Order {
  if (order.status !== "active") return order;

  const delays = getStageDelays(order.kind, speed);
  const elapsed = Date.now() - order.createdAt;

  /* 已到达的最高 stage */
  let maxStage: OrderStage = "placed";
  for (const s of STAGE_ORDER) {
    if (delays[s] <= elapsed) {
      maxStage = s;
    }
  }

  const currentStage = order.logistics.length > 0
    ? order.logistics[order.logistics.length - 1].stage
    : "placed";

  if (STAGE_ORDER.indexOf(maxStage) <= STAGE_ORDER.indexOf(currentStage)) {
    return order;
  }

  /* 补齐事件 */
  const newEvents: LogisticsEvent[] = [...order.logistics];
  const startIdx = STAGE_ORDER.indexOf(currentStage) + 1;
  const endIdx = STAGE_ORDER.indexOf(maxStage);

  for (let i = startIdx; i <= endIdx; i++) {
    const s = STAGE_ORDER[i];
    newEvents.push({
      stage: s,
      at: order.createdAt + delays[s],
    });
  }

  const delivered =
    maxStage === "delivered";

  return {
    ...order,
    logistics: newEvents,
    status: delivered ? "delivered" : order.status,
    deliveredAt: delivered
      ? order.createdAt + delays.delivered
      : order.deliveredAt,
    updatedAt: Date.now(),
  };
}

/**
 * 扫描所有订单，推进并保存有变化的。
 */
export function advanceAllOrders(speed: number): Order[] {
  const list = loadOrders();
  let changed = false;
  const next = list.map((o) => {
    const updated = advanceOrder(o, speed);
    if (updated !== o) changed = true;
    return updated;
  });
  if (changed) saveOrders(next);
  return next;
}

/* ---------- 当前 stage ---------- */

export function currentStage(order: Order): OrderStage {
  if (order.logistics.length === 0) return "placed";
  return order.logistics[order.logistics.length - 1].stage;
}

export function stageProgress(
  order: Order
): number {
  const cur = currentStage(order);
  const idx = STAGE_ORDER.indexOf(cur);
  if (idx < 0) return 0;
  return Math.round(
    (idx / (STAGE_ORDER.length - 1)) * 100
  );
}

export const ORDER_EVENT = EVT;