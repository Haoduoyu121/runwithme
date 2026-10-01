"use client";

import {
  DEFAULT_WALLET,
  type WalletData,
  type WalletEntry,
  type SavingGoal,
} from "@/data/wallet";

const WALLET_KEY = "runwithme_wallet_v1";

function isValidEntry(v: unknown): v is WalletEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.type === "string" &&
    typeof e.amount === "number" &&
    Number.isFinite(e.amount) &&
    typeof e.timestamp === "number"
  );
}

function isValidGoal(v: unknown): v is SavingGoal {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    typeof g.targetAmount === "number" &&
    Number.isFinite(g.targetAmount)
  );
}

export function loadWallet(): WalletData {
  if (typeof window === "undefined") {
    return { ...DEFAULT_WALLET };
  }
  try {
    const raw = window.localStorage.getItem(WALLET_KEY);
    if (!raw) return { ...DEFAULT_WALLET };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_WALLET };
    }

    const p = parsed as Partial<WalletData>;

    return {
      initialBalance:
        typeof p.initialBalance === "number" &&
        Number.isFinite(p.initialBalance)
          ? p.initialBalance
          : DEFAULT_WALLET.initialBalance,
      currency:
        typeof p.currency === "string" && p.currency.length > 0
          ? p.currency
          : DEFAULT_WALLET.currency,
      entries: Array.isArray(p.entries)
        ? p.entries.filter(isValidEntry)
        : [],
      goals: Array.isArray(p.goals)
        ? p.goals.filter(isValidGoal)
        : [],
    };
  } catch {
    return { ...DEFAULT_WALLET };
  }
}

export function saveWallet(data: WalletData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WALLET_KEY,
      JSON.stringify(data)
    );
    window.dispatchEvent(
      new Event("runwithme:wallet-updated")
    );
  } catch (e) {
    console.error("保存钱包失败:", e);
  }
}