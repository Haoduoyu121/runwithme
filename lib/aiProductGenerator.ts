"use client";

import { loadConfig, streamChat } from "@/lib/ai/apiClient";
import {
  createProductId,
  createShopId,
  type ShopKind,
  type ShopProduct,
  type Shop,
} from "@/data/shopV2";
import { loadSystemSettings } from "@/lib/systemStorage";

export type GeneratedProductDraft = {
  name: string;
  description: string;
  emoji: string;
  price: number;
  category: string;
  tags: string[];
};

export type GeneratedShopDraft = {
  name: string;
  description: string;
  emoji: string;
  category: string;
  tags: string[];
};

export type GeneratedShopBundle = {
  shop: GeneratedShopDraft;
  products: GeneratedProductDraft[];
};

export type GenerateShopBundleOptions = {
  kind: ShopKind;
  prompt: string;
  productCount: number;
  priceMin: number;
  priceMax: number;
};

/* ------------------------------------------------------- */

export async function generateShopBundle(
  opts: GenerateShopBundleOptions
): Promise<GeneratedShopBundle> {
  const cfg = loadConfig();
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
    throw new Error(
      "未配置 AI（去 Beyond → 设置里填 API）"
    );
  }

  const prompts = loadSystemSettings().aiPrompts;
  const systemText = prompts.productSystem
    .replace(/\{priceMin\}/g, String(opts.priceMin))
    .replace(/\{priceMax\}/g, String(opts.priceMax));

  const kindLabel =
    opts.kind === "food" ? "外卖 / 餐饮" : "商城";

  const user = `类型：${kindLabel}
需求：${opts.prompt}
商品数量：${opts.productCount}
价格区间：${opts.priceMin}～${opts.priceMax}`;

  let buf = "";
  const stream = streamChat(
    cfg,
    [
      { role: "system", content: systemText },
      { role: "user", content: user },
    ],
    { temperature: 0.9, stream: true }
  );
  for await (const chunk of stream) buf += chunk;

  const json = extractJson(buf);
  if (!json) throw new Error("AI 返回内容不是有效 JSON");

  const shopRaw = json.shop;
  if (!shopRaw || typeof shopRaw !== "object") {
    throw new Error("AI 没有返回店铺信息");
  }
  const s = shopRaw as Record<string, unknown>;
  const shop: GeneratedShopDraft = {
    name:
      typeof s.name === "string" && s.name.trim()
        ? s.name.trim()
        : "AI 小店",
    description:
      typeof s.description === "string"
        ? s.description.trim()
        : "",
    emoji:
      typeof s.emoji === "string" && s.emoji.length > 0
        ? s.emoji
        : "🏠",
    category:
      typeof s.category === "string"
        ? s.category.trim()
        : "杂货",
    tags:
      Array.isArray(s.tags) &&
      s.tags.every((t) => typeof t === "string")
        ? (s.tags as string[])
        : [],
  };

  const arr = Array.isArray(json.products)
    ? json.products
    : [];
  const products: GeneratedProductDraft[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    const name =
      typeof x.name === "string" ? x.name.trim() : "";
    if (!name) continue;
    const price = Number(x.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    products.push({
      name,
      description:
        typeof x.description === "string"
          ? x.description.trim()
          : "",
      emoji:
        typeof x.emoji === "string" && x.emoji.length > 0
          ? x.emoji
          : "🎁",
      price,
      category:
        typeof x.category === "string"
          ? x.category.trim()
          : "其他",
      tags:
        Array.isArray(x.tags) &&
        x.tags.every((t) => typeof t === "string")
          ? (x.tags as string[])
          : [],
    });
    if (products.length >= opts.productCount) break;
  }

  return { shop, products };
}

/* ------------------------------------------------------- */

export function draftToProduct(
  draft: GeneratedProductDraft,
  kind: ShopKind,
  shopId: string
): ShopProduct {
  return {
    id: createProductId(),
    shopId,
    kind,
    name: draft.name,
    description: draft.description,
    category: draft.category,
    emoji: draft.emoji,
    price: draft.price,
    specs: [],
    tags: draft.tags,
    rating: 4.5 + Math.random() * 0.5,
    reviews: [],
    enabled: true,
    custom: true,
    createdAt: Date.now(),
  };
}

export function draftToShop(
  draft: GeneratedShopDraft,
  kind: ShopKind,
  ownerId: "you" | "levi" | "erwin"
): Shop {
  return {
    id: createShopId(),
    kind,
    ownerId,
    name: draft.name,
    description: draft.description,
    category: draft.category,
    emoji: draft.emoji,
    rating: 4.8,
    deliveryTime: kind === "food" ? "30 分钟" : "1-3 天",
    tags: draft.tags,
    enabled: true,
    custom: true,
    createdAt: Date.now(),
  };
}

/* ------------------------------------------------------- */

function extractJson(
  text: string
): Record<string, unknown> | null {
  const t = text.trim();
  try {
    const p = JSON.parse(t);
    if (p && typeof p === "object") return p;
  } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      const p = JSON.parse(fence[1].trim());
      if (p && typeof p === "object") return p;
    } catch {}
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      const p = JSON.parse(t.slice(first, last + 1));
      if (p && typeof p === "object") return p;
    } catch {}
  }
  return null;
}