"use client";

import {
  DEFAULT_SHOP_ITEMS,
  defaultGroupFor,
  type ShopItem,
  type ShopCategory,
} from "@/data/shop";

const KEY = "runwithme_shop_items_v1";

function isValidItem(v: unknown): v is ShopItem {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    (x.category === "goods" || x.category === "food") &&
    typeof x.name === "string" &&
    typeof x.price === "number" &&
    Number.isFinite(x.price)
  );
}

/** 归一化：老数据没有 group 的补一个 */
function normalize(item: ShopItem): ShopItem {
  return {
    ...item,
    group:
      typeof item.group === "string" && item.group.length > 0
        ? item.group
        : defaultGroupFor(item.category),
  };
}

export function loadShopItems(): ShopItem[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_SHOP_ITEMS];
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_SHOP_ITEMS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SHOP_ITEMS];
    const list = parsed.filter(isValidItem).map(normalize);
    return list.length > 0 ? list : [...DEFAULT_SHOP_ITEMS];
  } catch {
    return [...DEFAULT_SHOP_ITEMS];
  }
}

export function saveShopItems(items: ShopItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error("保存商品失败:", e);
  }
}

export function loadShopItemsByCategory(
  category: ShopCategory
): ShopItem[] {
  return loadShopItems().filter(
    (i) => i.category === category && i.enabled
  );
}

export function resetShopItems(): ShopItem[] {
  const d = [...DEFAULT_SHOP_ITEMS];
  saveShopItems(d);
  return d;
}