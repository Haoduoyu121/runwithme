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

import {
  createOrderId,
  type Order,
} from "@/data/order";

import { upsertOrder } from "@/lib/orderStorage";
import { loadSystemSettings } from "@/lib/systemStorage";
import { loadProducts } from "@/lib/shopV2Storage";

import {
  generateProducts,
  type GeneratedProductDraft,
} from "@/lib/aiProductGenerator";

/* =========================================================
   角色主动送礼
   ========================================================= */

const ROLE_GIFT_NOTES = [
  "看到这个，觉得你会喜欢。",
  "随手买的。",
  "不要多想。",
  "给你。",
  "",
];

function pickNote(): string {
  return ROLE_GIFT_NOTES[
    Math.floor(Math.random() * ROLE_GIFT_NOTES.length)
  ];
}

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

type Deps = {
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
};

type RoleOwner = "Levi" | "Erwin";

/**
 * 生成一个商品快照（不落库），用于角色订单。
 * - AI 生成：使用 generateProducts 返回第一条
 * - 现有池挑：从 loadProducts 中随机挑一个
 */
async function buildRoleGiftItem(
  owner: RoleOwner,
  kind: "goods" | "food",
  amountMin: number,
  amountMax: number,
  aiChance: number
): Promise<{
  productId: string;
  productName: string;
  productEmoji: string;
  price: number;
} | null> {
  const cfg = loadSystemSettings().roleShopping;

  /* AI 分支 */
  if (Math.random() < aiChance) {
    try {
      const promptMap: Record<RoleOwner, string> = {
        Levi: "实用的、耐用的、克制的生活用品。不要花哨。",
        Erwin: "能让人感觉被照顾的小礼物。温和、有品味。",
      };
      const drafts = await generateProducts({
        kind,
        prompt: promptMap[owner],
        count: 1,
        priceMin: Math.max(1, Math.floor(amountMin)),
        priceMax: Math.max(
          Math.floor(amountMin) + 1,
          Math.floor(amountMax)
        ),
      });
      if (drafts.length > 0) {
        const d = drafts[0];
        return {
          productId: `role-ai-${Date.now()}`,
          productName: d.name,
          productEmoji: d.emoji,
          price: Math.round(d.price),
        };
      }
    } catch (e) {
      console.warn("角色 AI 生成商品失败，回退到池子:", e);
    }
  }

  /* 池子分支 */
  const products = loadProducts().filter(
    (p) =>
      p.enabled &&
      p.kind === kind &&
      p.price >= amountMin &&
      p.price <= amountMax
  );
  if (products.length === 0) return null;

  const p =
    products[Math.floor(Math.random() * products.length)];
  return {
    productId: p.id,
    productName: p.name,
    productEmoji: p.emoji,
    price: p.price,
  };
}

/**
 * 尝试让角色给用户送礼。
 * 返回 true = 发出了；false = 跳过。
 */
export async function tryRoleSendGift(
  owner: RoleOwner,
  threadId: ThreadId,
  deps: Deps
): Promise<boolean> {
  const cfg = loadSystemSettings().roleShopping;
  if (!cfg.enabled) return false;
  if (cfg.targetMode !== "random") {
    const wanted =
      cfg.targetMode === "levi" ? "Levi" : "Erwin";
    if (owner !== wanted) return false;
  }

  /* 角色钱包检查 */
  const roleWallet = loadWallet(owner);
  const balance = computeBalance(roleWallet);
  if (balance < cfg.amountMin) return false;

  const amountMax = Math.min(
    balance,
    cfg.amountMax
  );

  /* 随机选 kind */
  const kind: "goods" | "food" =
    Math.random() < 0.6 ? "goods" : "food";

  const item = await buildRoleGiftItem(
    owner,
    kind,
    cfg.amountMin,
    amountMax,
    cfg.aiChance
  );
  if (!item) return false;

  /* 扣角色钱包 */
  const entry: WalletEntry = {
    id: createWalletEntryId(),
    type: "expense",
    amount: item.price,
    note: `买 ${item.productName} 送给你`,
    timestamp: Date.now(),
  };
  saveWallet(
    {
      ...roleWallet,
      entries: [entry, ...roleWallet.entries],
    },
    owner
  );

  /* 创建订单（buyer=角色，receiver=user，等用户接受） */
  const order: Order = {
    id: createOrderId(),
    kind,
    buyerId: owner === "Levi" ? "levi" : "erwin",
    receiverId: "you",
    isGift: true,
    shopId: "",
    shopName:
      owner === "Levi" ? "Levi 的礼物" : "Erwin 的礼物",
    items: [
      {
        productId: item.productId,
        productName: item.productName,
        productEmoji: item.productEmoji,
        specSelections: {},
        quantity: 1,
        price: item.price,
      },
    ],
    totalPrice: item.price,
    addressId: null, /* 用户接受时才绑地址 */
    status: "active",
    logistics: [], /* 用户接受后才启动物流 */
    review: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    giftStatus: "pending",
  };

  upsertOrder(order);

  /* 发 Chat 消息 */
  const messageId = createMessageId();
  deps.addMessage(
    {
      id: messageId,
      sender: owner as ChatSender,
      type: "gift",
      timestamp: Date.now(),
      gift: {
        orderId: order.id,
        itemId: item.productId,
        itemName: item.productName,
        itemEmoji: item.productEmoji,
        price: item.price,
        category: kind,
        buyer: owner as ChatSender,
        receiver: "You",
        note: pickNote(),
        status: "pending",
      },
    },
    { threadId }
  );

  return true;
}