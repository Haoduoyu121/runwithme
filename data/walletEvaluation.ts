/* =========================================================
   Runwithme · 钱包评价卡池
   ========================================================= */

export type WalletEvalOwner = "Levi" | "Erwin";

export type WalletEvalPool = Record<WalletEvalOwner, string[]>;

export const DEFAULT_WALLET_EVAL_POOL: WalletEvalPool = {
  Levi: [
    "又花钱了。",
    "记一下也好。",
    "你自己看着办。",
    "手头还剩多少？",
    "花之前不想想？",
  ],
  Erwin: [
    "记下来了。",
    "这次花在哪了？",
    "心里有数就好。",
    "别忘了存钱的目标。",
    "偶尔放松也是必要的。",
  ],
};