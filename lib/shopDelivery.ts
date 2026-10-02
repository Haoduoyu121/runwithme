"use client";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
  type DeliveryStage,
  type ThreadId,
} from "@/data/chat";

import {
  computeBalance,
  createWalletEntryId,
  type WalletEntry,
} from "@/data/wallet";

import {
  loadWallet,
  saveWallet,
} from "@/lib/walletStorage";

import type { ShopItem } from "@/data/shop";
import { loadSystemSettings } from "@/lib/systemStorage";

/* ------------------------------------------------------- */

type StageSpec = {
  stage: DeliveryStage;
  /** 基础延迟（毫秒），实际 = delayMs / speed */
  delayMs: number;
};

const GOODS_STAGES: StageSpec[] = [
  { stage: "shipped", delayMs: 15000 },
  { stage: "in-transit", delayMs: 30000 },
  { stage: "delivering", delayMs: 30000 },
  { stage: "delivered", delayMs: 15000 },
];

const FOOD_STAGES: StageSpec[] = [
  { stage: "accepted", delayMs: 10000 },
  { stage: "picked", delayMs: 15000 },
  { stage: "delivering", delayMs: 20000 },
  { stage: "delivered", delayMs: 10000 },
];

const ACCEPT_LINES = ["收下了", "谢谢", "我很喜欢"];
const REJECT_LINES = ["不用了", "先不要", "心意收到了"];

function pickLine(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function generateTrackingNo(prefix: string): string {
  let n = "";
  for (let i = 0; i < 10; i++) {
    n += Math.floor(Math.random() * 10);
  }
  return `${prefix}${n}`;
}

/* ------------------------------------------------------- */

export type SendGiftResult =
  | { ok: true }
  | { ok: false; reason: "insufficient" | "invalid" };

type Deps = {
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
};

export async function sendGiftToRole(
  params: {
    item: ShopItem;
    receiver: "Levi" | "Erwin";
    note: string;
    threadId: ThreadId;
  } & Deps
): Promise<SendGiftResult> {
  const {
    item,
    receiver,
    note,
    threadId,
    addMessage,
    updateThreadMessages,
  } = params;

  if (!Number.isFinite(item.price) || item.price <= 0) {
    return { ok: false, reason: "invalid" };
  }

  const userWallet = loadWallet("user");
  const balance = computeBalance(userWallet);
  if (balance < item.price) {
    return { ok: false, reason: "insufficient" };
  }

  /* 扣款 */
  const outEntry: WalletEntry = {
    id: createWalletEntryId(),
    type: "expense",
    amount: item.price,
    note: `${
      item.category === "food" ? "点外卖" : "买礼物"
    } ${item.name} 送给 ${receiver}`,
    timestamp: Date.now(),
  };
  saveWallet(
    {
      ...userWallet,
      entries: [outEntry, ...userWallet.entries],
    },
    "user"
  );

  /* 生成消息 */
  const messageId = createMessageId();
  const trackingNo = generateTrackingNo(
    item.category === "food" ? "MT" : "SF"
  );

  const giftMessage: ChatMessage = {
    id: messageId,
    sender: "You",
    type: "gift",
    timestamp: Date.now(),
    gift: {
      itemId: item.id,
      itemName: item.name,
      itemEmoji: item.emoji,
      price: item.price,
      category: item.category,
      buyer: "You",
      receiver: receiver as ChatSender,
      note,
      status: "pending",
      delivery: {
        stage: "placed",
        trackingNo,
        history: [{ stage: "placed", at: Date.now() }],
      },
    },
  };
  addMessage(giftMessage, { threadId });

  /* 调度阶段 */
  scheduleStages(messageId, threadId, item.category, {
    addMessage,
    updateThreadMessages,
  });

  return { ok: true };
}

/* ------------------------------------------------------- */

function applyStage(
  messageId: string,
  threadId: ThreadId,
  stage: DeliveryStage,
  deps: Deps
): void {
  deps.updateThreadMessages(threadId, (prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.gift?.delivery) return m;
      if (m.gift.delivery.stage === stage) return m;
      return {
        ...m,
        gift: {
          ...m.gift,
          delivery: {
            ...m.gift.delivery,
            stage,
            history: [
              ...m.gift.delivery.history,
              { stage, at: Date.now() },
            ],
          },
        },
      };
    })
  );
}

function scheduleStages(
  messageId: string,
  threadId: ThreadId,
  category: "goods" | "food",
  deps: Deps
): void {
  const speed =
    loadSystemSettings().shopDelivery.speed || 5;
  const stages =
    category === "goods" ? GOODS_STAGES : FOOD_STAGES;

  let cumMs = 0;
  for (const s of stages) {
    cumMs += s.delayMs / speed;
    const delay = cumMs;
    const stage = s.stage;
    window.setTimeout(() => {
      applyStage(messageId, threadId, stage, deps);
      if (stage === "delivered") {
        window.setTimeout(
          () => resolveGift(messageId, threadId, deps),
          Math.max(400, 1500 / speed)
        );
      }
    }, delay);
  }
}

function resolveGift(
  messageId: string,
  threadId: ThreadId,
  deps: Deps
): void {
  const accepted = Math.random() < 0.75;
  const finalStage: DeliveryStage = accepted
    ? "signed"
    : "returned";

  let receiver: "Levi" | "Erwin" | null = null;
  let price = 0;
  let itemName = "";

  deps.updateThreadMessages(threadId, (prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.gift) return m;
      if (m.gift.status !== "pending") return m;
      receiver = m.gift.receiver as "Levi" | "Erwin";
      price = m.gift.price;
      itemName = m.gift.itemName;
      return {
        ...m,
        gift: {
          ...m.gift,
          status: accepted ? "accepted" : "rejected",
          resolvedAt: Date.now(),
          delivery: m.gift.delivery
            ? {
                ...m.gift.delivery,
                stage: finalStage,
                history: [
                  ...m.gift.delivery.history,
                  { stage: finalStage, at: Date.now() },
                ],
              }
            : undefined,
        },
      };
    })
  );

  /* 拒绝 → 退款 */
  if (!accepted && receiver && price > 0) {
    const w = loadWallet("user");
    const refund: WalletEntry = {
      id: createWalletEntryId(),
      type: "income",
      amount: price,
      note: `${receiver} 退回了 ${itemName}`,
      timestamp: Date.now(),
    };
    saveWallet(
      { ...w, entries: [refund, ...w.entries] },
      "user"
    );
  }

  /* 角色回复 */
  deps.addMessage(
    {
      id: createMessageId(),
      sender: (receiver ?? "Levi") as ChatSender,
      type: "text",
      text: accepted
        ? pickLine(ACCEPT_LINES)
        : pickLine(REJECT_LINES),
      timestamp: Date.now(),
    },
    { threadId }
  );
}

/* ------------------------------------------------------- */

/**
 * 用户给快递/外卖评价。
 */
export function rateGift(
  messageId: string,
  threadId: ThreadId,
  rating: number,
  comment: string,
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void
): void {
  updateThreadMessages(threadId, (prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.gift?.delivery) return m;
      if (m.gift.delivery.rating) return m;
      return {
        ...m,
        gift: {
          ...m.gift,
          delivery: {
            ...m.gift.delivery,
            rating,
            ratingComment: comment,
            ratedAt: Date.now(),
          },
        },
      };
    })
  );
}

/* ------------------------------------------------------- */

export const STAGE_LABELS: Record<DeliveryStage, string> = {
  placed: "已下单",
  accepted: "商家已接单",
  shipped: "商家已发货",
  picked: "骑手已取餐",
  "in-transit": "运输中",
  delivering: "派送中",
  delivered: "已送达",
  signed: "已签收",
  returned: "已退回",
};

export function stageProgress(
  category: "goods" | "food",
  stage: DeliveryStage
): number {
  const order: DeliveryStage[] =
    category === "goods"
      ? [
          "placed",
          "shipped",
          "in-transit",
          "delivering",
          "delivered",
        ]
      : [
          "placed",
          "accepted",
          "picked",
          "delivering",
          "delivered",
        ];

  if (stage === "signed" || stage === "returned") return 100;
  const idx = order.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (order.length - 1)) * 100);
}