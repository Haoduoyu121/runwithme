"use client";

import {
  computeBalance,
  createWalletEntryId,
  type WalletEntry,
  type WalletOwner,
} from "@/data/wallet";

import { loadWallet, saveWallet } from "@/lib/walletStorage";
import { loadSystemSettings } from "@/lib/systemStorage";

const EXPENSE_NOTES = [
  "买咖啡",
  "午餐",
  "打车",
  "买菜",
  "买书",
  "看电影",
  "订阅服务",
  "请客",
  "加油",
];

const INCOME_NOTES = ["工资", "项目分红", "利息"];

const EXPENSE_AMOUNTS = [8, 15, 25, 38, 52, 88, 128];
const INCOME_AMOUNTS = [500, 1000, 2000, 3000];

export function tryRoleAutoBookkeeping(
  owner: WalletOwner
): boolean {
  if (owner === "user") return false;

  const cfg = loadSystemSettings().roleBookkeeping;
  if (!cfg.enabled) return false;

  const wallet = loadWallet(owner);
  const balance = computeBalance(wallet);

  const isExpense = Math.random() < 0.7;

  let entry: WalletEntry;

  if (isExpense) {
    const base =
      EXPENSE_AMOUNTS[
        Math.floor(Math.random() * EXPENSE_AMOUNTS.length)
      ];
    /* 加随机小数，更真实 */
    const amount =
      Math.round((base + Math.random() * 10) * 100) / 100;
    if (balance < amount) return false;

    entry = {
      id: createWalletEntryId(),
      type: "expense",
      amount,
      note:
        EXPENSE_NOTES[
          Math.floor(Math.random() * EXPENSE_NOTES.length)
        ],
      timestamp: Date.now(),
    };
  } else {
    const amount =
      INCOME_AMOUNTS[
        Math.floor(Math.random() * INCOME_AMOUNTS.length)
      ];
    entry = {
      id: createWalletEntryId(),
      type: "income",
      amount,
      note:
        INCOME_NOTES[
          Math.floor(Math.random() * INCOME_NOTES.length)
        ],
      timestamp: Date.now(),
    };
  }

  saveWallet(
    {
      ...wallet,
      entries: [entry, ...wallet.entries],
    },
    owner
  );

  return true;
}