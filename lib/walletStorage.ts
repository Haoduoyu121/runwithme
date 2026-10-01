"use client";

import {
  DEFAULT_WALLET,
  DEFAULT_ROLE_INITIAL_BALANCE,
  type WalletData,
  type WalletEntry,
  type WalletOwner,
  type SavingGoal,
} from "@/data/wallet";

function getKey(owner: WalletOwner): string {
  if (owner === "user") return "runwithme_wallet_v1";
  return `runwithme_wallet_${owner.toLowerCase()}_v1`;
}

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

function defaultFor(owner: WalletOwner): WalletData {
  if (owner === "user") return { ...DEFAULT_WALLET };
  return {
    initialBalance: DEFAULT_ROLE_INITIAL_BALANCE,
    currency: DEFAULT_WALLET.currency,
    entries: [],
    goals: [],
  };
}

export function loadWallet(
  owner: WalletOwner = "user"
): WalletData {
  if (typeof window === "undefined") {
    return defaultFor(owner);
  }
  const key = getKey(owner);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultFor(owner);

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaultFor(owner);
    }

    const p = parsed as Partial<WalletData>;

    return {
      initialBalance:
        typeof p.initialBalance === "number" &&
        Number.isFinite(p.initialBalance)
          ? p.initialBalance
          : defaultFor(owner).initialBalance,
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
    return defaultFor(owner);
  }
}

export function saveWallet(
  data: WalletData,
  owner: WalletOwner = "user"
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getKey(owner),
      JSON.stringify(data)
    );
    window.dispatchEvent(
      new CustomEvent("runwithme:wallet-updated", {
        detail: { owner },
      })
    );
  } catch (e) {
    console.error("保存钱包失败:", e);
  }
}