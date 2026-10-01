"use client";

import {
  createMessageId,
  type ChatMessage,
  type ThreadId,
} from "@/data/chat";

import {
  computeBalance,
  createWalletEntryId,
  type WalletEntry,
} from "@/data/wallet";

import { loadWallet, saveWallet } from "@/lib/walletStorage";
import { loadSystemSettings } from "@/lib/systemStorage";

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pickSender(): "Levi" | "Erwin" {
  const cfg = loadSystemSettings().roleRedPacket;
  if (cfg.targetMode === "levi") return "Levi";
  if (cfg.targetMode === "erwin") return "Erwin";
  return Math.random() < 0.5 ? "Levi" : "Erwin";
}

const NOTES = [
  "给你的",
  "买点喜欢的",
  "辛苦了",
  "拿去花吧",
  "一点心意",
  "收下吧",
];

function pickNote(): string {
  if (Math.random() < 0.5) return "";
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}

/**
 * 尝试让角色发一个红包给用户。
 * 会扣角色钱包、生成红包消息（不自动领取）。
 * 返回 true = 发出。
 */
export function tryRoleSendRedPacket(params: {
  threadId: ThreadId;
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
}): boolean {
  const { threadId, addMessage } = params;

  const cfg = loadSystemSettings().roleRedPacket;
  if (!cfg.enabled) return false;

  const sender = pickSender();

  const roleWallet = loadWallet(sender);
  const balance = computeBalance(roleWallet);

  /* 计算金额 */
  let amount: number;
  if (
    cfg.specialAmounts.length > 0 &&
    Math.random() < cfg.specialChance
  ) {
    amount =
      cfg.specialAmounts[
        Math.floor(Math.random() * cfg.specialAmounts.length)
      ];
  } else {
    amount =
      randomInt(cfg.amountMin * 100, cfg.amountMax * 100) /
      100;
  }

  if (amount <= 0) return false;
  if (balance < amount) return false;

  /* 扣角色钱包 */
  const roleEntry: WalletEntry = {
    id: createWalletEntryId(),
    type: "redpacket-out",
    amount,
    note: "给你发红包",
    timestamp: Date.now(),
  };
  saveWallet(
    {
      ...roleWallet,
      entries: [roleEntry, ...roleWallet.entries],
    },
    sender
  );

  /* 生成红包消息 */
  addMessage(
    {
      id: createMessageId(),
      sender,
      type: "redpacket",
      timestamp: Date.now(),
      redpacket: {
        amount,
        from: sender,
        to: "You",
        claimed: false,
        note: pickNote(),
      },
    },
    { threadId }
  );

  return true;
}