"use client";

import {
  loadConfig,
  streamChat,
} from "@/lib/ai/apiClient";

import {
  createProductId,
  type ShopProduct,
  type ShopKind,
} from "@/data/shopV2";

export type GeneratedProductDraft = {
  name: string;
  description: string;
  emoji: string;
  price: number;
  category: string;
  tags: string[];
};

export type GenerateProductsOptions = {
  kind: ShopKind;
  prompt: string;
  count: number;
  priceMin: number;
  priceMax: number;
};

/**
 * 调用 AI 生成商品候选列表。
 * 返回结构化草稿（未落库，需要用户确认）。
 */
export async function generateProducts(
  opts: GenerateProductsOptions
): Promise<GeneratedProductDraft[]> {
  const cfg = loadConfig();
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
    throw new Error(
      "未配置 AI（去 Beyond → 设置里填 API）"
    );
  }

  const kindLabel =
    opts.kind === "food" ? "外卖 / 餐饮" : "商城";

  const system = `你是一个虚构电商系统的商品生成器。
输出严格的 JSON，不要任何解释或 Markdown 代码块。
格式：
{
  "products": [
    {
      "name": "商品名",
      "description": "一句话描述",
      "emoji": "单个 emoji",
      "price": 数字（整数或一位小数）,
      "category": "分类（中文 2-4 字）",
      "tags": ["标签1", "标签2"]
    }
  ]
}

要求：
- 所有商品都是虚构的，不要出现真实品牌 / 真实公司
- 价格必须在 ${opts.priceMin}～${opts.priceMax} 之间
- 每个商品必须有一个 emoji 作为视觉
- 分类从这些里挑：${
    opts.kind === "food"
      ? "奶茶,咖啡,汉堡,日料,甜品,火锅,小吃"
      : "服饰,家居,食品,数码,文具,美妆,宠物,杂货,礼物"
  }`;

  const user = `类型：${kindLabel}
需求：${opts.prompt}
数量：${opts.count}
价格区间：${opts.priceMin}～${opts.priceMax}`;

  let buf = "";
  const stream = streamChat(
    cfg,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.9, stream: true }
  );

  for await (const chunk of stream) {
    buf += chunk;
  }

  /* 尝试解析 JSON */
  const json = extractJson(buf);
  if (!json) throw new Error("AI 返回内容不是有效 JSON");

  const arr = Array.isArray(json.products)
    ? json.products
    : [];

  const out: GeneratedProductDraft[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const x = item as Record<string, unknown>;
    const name =
      typeof x.name === "string" ? x.name.trim() : "";
    if (!name) continue;
    const price = Number(x.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    out.push({
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
    if (out.length >= opts.count) break;
  }

  return out;
}

/**
 * 从 AI 输出里挖 JSON（容忍 ```json 包裹、多余文本）
 */
function extractJson(text: string): Record<string, unknown> | null {
  const t = text.trim();

  /* 直接是 JSON */
  try {
    const p = JSON.parse(t);
    if (p && typeof p === "object") return p;
  } catch {}

  /* 从 ``` 里提取 */
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      const p = JSON.parse(fence[1].trim());
      if (p && typeof p === "object") return p;
    } catch {}
  }

  /* 找第一个 { 到最后一个 } */
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

/**
 * 把草稿转成 ShopProduct（准备落库）
 */
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