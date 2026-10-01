"use client";

import {
  DEFAULT_WALLET_EVAL_POOL,
  type WalletEvalOwner,
  type WalletEvalPool,
} from "@/data/walletEvaluation";

const KEY = "runwithme_wallet_eval_pool_v1";

export function loadWalletEvalPool(): WalletEvalPool {
  if (typeof window === "undefined") {
    return { ...DEFAULT_WALLET_EVAL_POOL };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_WALLET_EVAL_POOL };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_WALLET_EVAL_POOL };
    }
    const p = parsed as Partial<WalletEvalPool>;
    return {
      Levi:
        Array.isArray(p.Levi) &&
        p.Levi.every((x) => typeof x === "string")
          ? p.Levi
          : [...DEFAULT_WALLET_EVAL_POOL.Levi],
      Erwin:
        Array.isArray(p.Erwin) &&
        p.Erwin.every((x) => typeof x === "string")
          ? p.Erwin
          : [...DEFAULT_WALLET_EVAL_POOL.Erwin],
    };
  } catch {
    return { ...DEFAULT_WALLET_EVAL_POOL };
  }
}

export function saveWalletEvalPool(
  pool: WalletEvalPool
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pool));
    window.dispatchEvent(
      new Event("runwithme:wallet-eval-pool-updated")
    );
  } catch (e) {
    console.error("保存钱包评价卡池失败:", e);
  }
}

export function resetWalletEvalPool(): WalletEvalPool {
  const d = JSON.parse(
    JSON.stringify(DEFAULT_WALLET_EVAL_POOL)
  ) as WalletEvalPool;
  saveWalletEvalPool(d);
  return d;
}

export function pickEvalText(
  pool: WalletEvalPool,
  owner: WalletEvalOwner
): string | null {
  const list = pool[owner].filter(
    (t) => t.trim().length > 0
  );
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}