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

import { loadWallet, saveWallet } from "@/lib/walletStorage";
import { createOrderId, type Order } from "@/data/order";
import { upsertOrder } from "@/lib/orderStorage";
import { loadSystemSettings } from "@/lib/systemStorage";
import {
  loadCardPool,
  pickFromPool,
} from "@/lib/cardPoolsStorage";

import type {
  Shop,
  ShopOwnerId,
  ShopProduct,
} from "@/data/shopV2";

import {
  loadProducts,
  loadShops,
  upsertProduct,
  upsertShop,
} from "@/lib/shopV2Storage";

import {
  draftToProduct,
  draftToShop,
  generateShopBundle,
} from "@/lib/aiProductGenerator";

function pickNote(owner: "Levi" | "Erwin"): string {
  const pool = loadCardPool("roleGiftNote");
  return pickFromPool(pool, owner) ?? "";
}

type Deps = {
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
};

type RoleOwner = "Levi" | "Erwin";

/* ------------------------------------------------------- */

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
  /* AI 分支 */
  if (Math.random() < aiChance) {
    try {
      const prompts = loadSystemSettings().aiPrompts;
      const rolePrompt =
        owner === "Levi"
          ? prompts.roleLevi
          : prompts.roleErwin;

      const bundle = await generateShopBundle({
        kind,
        prompt: rolePrompt,
        productCount: 3,
        priceMin: Math.max(1, Math.floor(amountMin)),
        priceMax: Math.max(
          Math.floor(amountMin) + 1,
          Math.floor(amountMax)
        ),
      });

      const ownerKey: ShopOwnerId =
        owner === "Levi" ? "levi" : "erwin";
      const shopId = `shop-${ownerKey}-ai`;

      /* 首次 → 建角色 AI 店铺 */
      let shop: Shop | undefined = loadShops().find(
        (s) => s.id === shopId
      );
      if (!shop) {
        const generated = draftToShop(
          bundle.shop,
          kind,
          ownerKey
        );
        shop = { ...generated, id: shopId };
        upsertShop(shop);
      }

      /* 商品全部落库 */
      const created: ShopProduct[] = [];
      for (const p of bundle.products) {
        const sp = draftToProduct(p, kind, shopId);
        upsertProduct(sp);
        created.push(sp);
      }

      if (created.length === 0) {
        throw new Error("AI 未返回商品");
      }

      const pick =
        created[Math.floor(Math.random() * created.length)];

      return {
        productId: pick.id,
        productName: pick.name,
        productEmoji: pick.emoji,
        price: pick.price,
      };
    } catch (e) {
      console.warn(
        "角色 AI 生成失败，回退到池子:",
        e
      );
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

/* ------------------------------------------------------- */

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

  const roleWallet = loadWallet(owner);
  const balance = computeBalance(roleWallet);
  if (balance < cfg.amountMin) return false;

  const amountMax = Math.min(balance, cfg.amountMax);
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

  /* 建订单 */
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
    addressId: null,
    status: "active",
    logistics: [],
    review: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    giftStatus: "pending",
  };
  upsertOrder(order);

  /* 发消息 */
  deps.addMessage(
    {
      id: createMessageId(),
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
        note: pickNote(owner),
        status: "pending",
      },
    },
    { threadId }
  );

  return true;
}