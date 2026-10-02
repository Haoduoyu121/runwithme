"use client";

import {
  DEFAULT_SHOPS,
  DEFAULT_PRODUCTS,
  DEFAULT_CARTS,
  type Shop,
  type ShopProduct,
  type Cart,
  type ShopOwnerId,
} from "@/data/shopV2";

const SHOPS_KEY = "runwithme_shop_v2_shops";
const PRODUCTS_KEY = "runwithme_shop_v2_products";
const CARTS_KEY = "runwithme_shop_v2_carts";

const EVT = "runwithme:shop-v2-updated";

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

/* ---------- Shops ---------- */

export function loadShops(): Shop[] {
  if (typeof window === "undefined") return [...DEFAULT_SHOPS];
  try {
    const raw = window.localStorage.getItem(SHOPS_KEY);
    if (!raw) return [...DEFAULT_SHOPS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_SHOPS];
    return parsed.length > 0 ? parsed : [...DEFAULT_SHOPS];
  } catch {
    return [...DEFAULT_SHOPS];
  }
}

export function saveShops(list: Shop[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SHOPS_KEY,
      JSON.stringify(list)
    );
    emit();
  } catch (e) {
    console.error("保存店铺失败:", e);
  }
}

/* ---------- Products ---------- */

export function loadProducts(): ShopProduct[] {
  if (typeof window === "undefined")
    return [...DEFAULT_PRODUCTS];
  try {
    const raw = window.localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return [...DEFAULT_PRODUCTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PRODUCTS];
    return parsed.length > 0
      ? parsed
      : [...DEFAULT_PRODUCTS];
  } catch {
    return [...DEFAULT_PRODUCTS];
  }
}

export function saveProducts(list: ShopProduct[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PRODUCTS_KEY,
      JSON.stringify(list)
    );
    emit();
  } catch (e) {
    console.error("保存商品失败:", e);
  }
}

/* ---------- Carts ---------- */

export function loadCarts(): Cart[] {
  if (typeof window === "undefined")
    return JSON.parse(JSON.stringify(DEFAULT_CARTS));
  try {
    const raw = window.localStorage.getItem(CARTS_KEY);
    if (!raw)
      return JSON.parse(JSON.stringify(DEFAULT_CARTS));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return JSON.parse(JSON.stringify(DEFAULT_CARTS));
    return parsed;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CARTS));
  }
}

export function saveCarts(list: Cart[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CARTS_KEY,
      JSON.stringify(list)
    );
    emit();
  } catch (e) {
    console.error("保存购物车失败:", e);
  }
}

export function getCart(ownerId: ShopOwnerId): Cart {
  const carts = loadCarts();
  return (
    carts.find((c) => c.ownerId === ownerId) ?? {
      ownerId,
      items: [],
    }
  );
}

export function setCart(cart: Cart): void {
  const carts = loadCarts();
  const next = carts.filter(
    (c) => c.ownerId !== cart.ownerId
  );
  next.push(cart);
  saveCarts(next);
}

/* ---------- 便捷 ---------- */

export function loadShopsByOwner(
  ownerId: ShopOwnerId,
  kind?: "goods" | "food"
): Shop[] {
  return loadShops().filter(
    (s) =>
      s.enabled &&
      s.ownerId === ownerId &&
      (!kind || s.kind === kind)
  );
}

export function loadProductsByShop(
  shopId: string
): ShopProduct[] {
  return loadProducts().filter(
    (p) => p.enabled && p.shopId === shopId
  );
}

export function loadProductsByOwner(
  ownerId: ShopOwnerId,
  kind?: "goods" | "food"
): ShopProduct[] {
  const shopIds = new Set(
    loadShops()
      .filter(
        (s) =>
          s.ownerId === ownerId &&
          (!kind || s.kind === kind)
      )
      .map((s) => s.id)
  );
  return loadProducts().filter(
    (p) => p.enabled && shopIds.has(p.shopId)
  );
}

export function resetShopV2(): void {
  saveShops([...DEFAULT_SHOPS]);
  saveProducts([...DEFAULT_PRODUCTS]);
  saveCarts(
    JSON.parse(JSON.stringify(DEFAULT_CARTS))
  );
}

export const SHOP_V2_EVENT = EVT;

/* =========================================================
   商品 / 店铺 / 订单 增删改
   ========================================================= */

export function upsertProduct(p: ShopProduct): void {
  const list = loadProducts();
  const idx = list.findIndex((x) => x.id === p.id);
  const next =
    idx >= 0
      ? list.map((x) => (x.id === p.id ? p : x))
      : [...list, p];
  saveProducts(next);
}

export function deleteProduct(id: string): void {
  saveProducts(
    loadProducts().filter((p) => p.id !== id)
  );
}

export function upsertShop(s: Shop): void {
  const list = loadShops();
  const idx = list.findIndex((x) => x.id === s.id);
  const next =
    idx >= 0
      ? list.map((x) => (x.id === s.id ? s : x))
      : [...list, s];
  saveShops(next);
}

export function deleteShop(id: string): void {
  saveShops(loadShops().filter((s) => s.id !== id));
  /* 顺便删掉该店铺的所有商品 */
  saveProducts(
    loadProducts().filter((p) => p.shopId !== id)
  );
}