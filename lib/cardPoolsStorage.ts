"use client";

export type CardPoolId =
  | "walletEval"
  | "roleOrderReview"
  | "roleGiftNote"
  | "roleAddress";

export type CardPoolOwner = "Levi" | "Erwin";
export type CardPool = Record<CardPoolOwner, string[]>;

export const CARD_POOL_KEYS: Record<CardPoolId, string> = {
  walletEval: "runwithme_wallet_eval_pool_v1",
  roleOrderReview: "runwithme_role_order_review_v1",
  roleGiftNote: "runwithme_role_gift_note_v1",
  roleAddress: "runwithme_role_address_pool_v1",
};

export const CARD_POOL_LABELS: Record<CardPoolId, string> = {
  walletEval: "花钱评价",
  roleOrderReview: "收礼评价",
  roleGiftNote: "送礼备注",
  roleAddress: "角色地址",
};

export const CARD_POOL_HINTS: Record<CardPoolId, string> = {
  walletEval: "你记支出时，监督角色偶尔评价一句。",
  roleOrderReview: "角色收到你的礼物、签收时会评价。",
  roleGiftNote: "角色主动给你买礼物 / 点外卖时的留言。",
  roleAddress: "角色送礼时用的备选地址（后续功能预留）。",
};

export const DEFAULT_POOLS: Record<CardPoolId, CardPool> = {
  walletEval: {
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
  },
  roleOrderReview: {
    Levi: [
      "收下了。谢谢。",
      "……还可以。",
      "下次不用买。",
      "挺暖的。",
      "知道了。",
    ],
    Erwin: [
      "谢谢，我很喜欢。",
      "你挑的，很好。",
      "收下了，辛苦了。",
      "很有心。",
      "下次一起用。",
    ],
  },
  roleGiftNote: {
    Levi: [
      "看到这个，觉得你会喜欢。",
      "随手买的。",
      "不要多想。",
      "给你。",
    ],
    Erwin: [
      "想到你了。",
      "应该会喜欢吧。",
      "给你的小东西。",
      "看到就想起你。",
    ],
  },
  roleAddress: {
    Levi: ["调查兵团宿舍 · 三楼", "旧宅 · 城区东侧"],
    Erwin: ["调查兵团本部 · 办公室", "书房 · 街角咖啡馆楼上"],
  },
};

export function loadCardPool(id: CardPoolId): CardPool {
  if (typeof window === "undefined") {
    return JSON.parse(JSON.stringify(DEFAULT_POOLS[id]));
  }
  const key = CARD_POOL_KEYS[id];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw)
      return JSON.parse(JSON.stringify(DEFAULT_POOLS[id]));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return JSON.parse(JSON.stringify(DEFAULT_POOLS[id]));
    }
    const p = parsed as Partial<CardPool>;
    return {
      Levi:
        Array.isArray(p.Levi) &&
        p.Levi.every((x) => typeof x === "string")
          ? p.Levi
          : [...DEFAULT_POOLS[id].Levi],
      Erwin:
        Array.isArray(p.Erwin) &&
        p.Erwin.every((x) => typeof x === "string")
          ? p.Erwin
          : [...DEFAULT_POOLS[id].Erwin],
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_POOLS[id]));
  }
}

export function saveCardPool(
  id: CardPoolId,
  pool: CardPool
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CARD_POOL_KEYS[id],
      JSON.stringify(pool)
    );
  } catch (e) {
    console.error("保存卡池失败:", e);
  }
}

export function resetCardPool(id: CardPoolId): CardPool {
  const d = JSON.parse(
    JSON.stringify(DEFAULT_POOLS[id])
  ) as CardPool;
  saveCardPool(id, d);
  return d;
}

export function pickFromPool(
  pool: CardPool,
  owner: CardPoolOwner
): string | null {
  const list = pool[owner].filter(
    (t) => t.trim().length > 0
  );
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}