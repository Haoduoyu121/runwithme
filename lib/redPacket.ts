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
  type WalletOwner,
} from "@/data/wallet";

import {
  loadWallet,
  saveWallet,
} from "@/lib/walletStorage";

export type RedPacketTarget = "Levi" | "Erwin";

export type SendRedPacketResult =
  | { ok: true; sent: number }
  | { ok: false; reason: "insufficient" | "invalid" };

/** 角色领取延迟（毫秒） */
const CLAIM_DELAY_MIN_MS = 3000;
const CLAIM_DELAY_MAX_MS = 10000;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * 用户给一个 / 多个角色发红包。
 * 每个目标金额相同（= amount）。
 * 会从用户钱包扣除 amount × targets.length。
 */
export async function sendRedPacketToRoles(params: {
  targets: RedPacketTarget[];
  amount: number;
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
}): Promise<SendRedPacketResult> {
  const {
    targets,
    amount,
    note,
    threadId,
    addMessage,
    updateThreadMessages,
  } = params;

  if (targets.length === 0) {
    return { ok: false, reason: "invalid" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid" };
  }

  const total = amount * targets.length;
  const userWallet = loadWallet("user");
  const balance = computeBalance(userWallet);
  if (balance < total) {
    return { ok: false, reason: "insufficient" };
  }

  /* 1. 从用户钱包扣除 */
  const newEntries: WalletEntry[] = [];
  for (const t of targets) {
    newEntries.push({
      id: createWalletEntryId(),
      type: "redpacket-out",
      amount,
      note: `给 ${t} 发红包${note ? "：" + note : ""}`,
      timestamp: Date.now(),
    });
  }
  const userNext = {
    ...userWallet,
    entries: [...newEntries, ...userWallet.entries],
  };
  saveWallet(userNext, "user");

  /* 2. 为每个目标生成红包消息 */
  for (const t of targets) {
    const messageId = createMessageId();
    const msg: ChatMessage = {
      id: messageId,
      sender: "You",
      type: "redpacket",
      timestamp: Date.now(),
      redpacket: {
        amount,
        from: "You",
        to: t as ChatSender,
        claimed: false,
        note,
      },
    };
    addMessage(msg, { threadId });

    /* 3. 延迟后角色"领取" */
    const delay = randomInt(
      CLAIM_DELAY_MIN_MS,
      CLAIM_DELAY_MAX_MS
    );
    window.setTimeout(() => {
      claimByRole({
        messageId,
        owner: t,
        amount,
        note,
        threadId,
        updateThreadMessages,
      });
    }, delay);
  }

  return { ok: true, sent: targets.length };
}

/* ------------------------------------------------------- */

function claimByRole(params: {
  messageId: string;
  owner: WalletOwner;
  amount: number;
  note: string;
  threadId: ThreadId;
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
}) {
  const {
    messageId,
    owner,
    amount,
    note,
    threadId,
    updateThreadMessages,
  } = params;

  /* 更新消息的 claimed 状态 */
  updateThreadMessages(threadId, (prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.redpacket) return m;
      if (m.redpacket.claimed) return m;
      return {
        ...m,
        redpacket: {
          ...m.redpacket,
          claimed: true,
          claimedAt: Date.now(),
        },
      };
    })
  );

  /* 加到角色钱包 */
  const roleWallet = loadWallet(owner);
  const roleEntry: WalletEntry = {
    id: createWalletEntryId(),
    type: "redpacket-in",
    amount,
    note: `收到你的红包${note ? "：" + note : ""}`,
    timestamp: Date.now(),
  };
  const next = {
    ...roleWallet,
    entries: [roleEntry, ...roleWallet.entries],
  };
  saveWallet(next, owner);
}