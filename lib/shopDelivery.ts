"use client";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
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

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

const ACCEPT_LINES = ["收下了", "谢谢", "我很喜欢"];
const REJECT_LINES = ["不用了", "先不要", "心意收到了"];

function pickLine(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export type SendGiftResult =
  | { ok: true }
  | { ok: false; reason: "insufficient" | "invalid" };

/**
 * 用户买商品送角色。
 * - 扣用户钱包
 * - 生成 gift 消息
 * - 角色延迟 → 接受 / 拒绝 → 拒绝时退款
 */
export async function sendGiftToRole(params: {
  item: ShopItem;
  receiver: "Levi" | "Erwin";
  note: string;
  threadId: ThreadId;
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
}): Promise<SendGiftResult> {
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

  /* 检查用户余额 */
  const userWallet = loadWallet("user");
  const balance = computeBalance(userWallet);
  if (balance < item.price) {
    return { ok: false, reason: "insufficient" };
  }

  /* 扣用户钱包 */
  const outEntry: WalletEntry = {
    id: createWalletEntryId(),
    type: "expense",
    amount: item.price,
    note: `买 ${item.name} 送给 ${receiver}`,
    timestamp: Date.now(),
  };
  saveWallet(
    {
      ...userWallet,
      entries: [outEntry, ...userWallet.entries],
    },
    "user"
  );

  /* 生成礼物消息 */
  const messageId = createMessageId();
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
    },
  };
  addMessage(giftMessage, { threadId });

  /* 延迟 → 角色决定 */
  const cfg = loadSystemSettings().avatarSwitch;
  /* 复用"考虑时间"作为礼物的考虑时间 */
  const minMs = cfg.requestDelayMin * 1000;
  const maxMs = cfg.requestDelayMax * 1000;
  const delay = randomInt(minMs, maxMs);

  window.setTimeout(() => {
    /* 从设置里读"接受概率"（复用 requestChance） */
    const cfgNow = loadSystemSettings();
    /* 礼物接受概率：先固定 0.75，将来可加设置 */
    const accepted = Math.random() < 0.75;

    if (accepted) {
      updateThreadMessages(threadId, (prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.gift) return m;
          return {
            ...m,
            gift: {
              ...m.gift,
              status: "accepted",
              resolvedAt: Date.now(),
            },
          };
        })
      );

      addMessage(
        {
          id: createMessageId(),
          sender: receiver as ChatSender,
          type: "text",
          text: pickLine(ACCEPT_LINES),
          timestamp: Date.now(),
        },
        { threadId }
      );
    } else {
      /* 拒绝 → 更新消息状态 */
      updateThreadMessages(threadId, (prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.gift) return m;
          return {
            ...m,
            gift: {
              ...m.gift,
              status: "rejected",
              resolvedAt: Date.now(),
            },
          };
        })
      );

      /* 退款回用户钱包 */
      const w = loadWallet("user");
      const refund: WalletEntry = {
        id: createWalletEntryId(),
        type: "income",
        amount: item.price,
        note: `${receiver} 退回了 ${item.name}`,
        timestamp: Date.now(),
      };
      saveWallet(
        {
          ...w,
          entries: [refund, ...w.entries],
        },
        "user"
      );

      addMessage(
        {
          id: createMessageId(),
          sender: receiver as ChatSender,
          type: "text",
          text: pickLine(REJECT_LINES),
          timestamp: Date.now(),
        },
        { threadId }
      );
    }
  }, delay);

  return { ok: true };
}