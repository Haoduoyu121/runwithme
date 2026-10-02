/* =========================================================
   Runwithme · 购物
   ========================================================= */

export type ShopCategory = "goods" | "food";
export type ShopOwner = "You" | "Levi" | "Erwin";

export type ShopItem = {
  id: string;
  category: ShopCategory;
  name: string;
  emoji: string;
  price: number;
  enabled: boolean;
  custom: boolean;
};

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  /* 商场（goods） */
  {
    id: "shop-g-001",
    category: "goods",
    name: "围巾",
    emoji: "🧣",
    price: 88,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-002",
    category: "goods",
    name: "手账本",
    emoji: "📓",
    price: 45,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-003",
    category: "goods",
    name: "杯子",
    emoji: "☕",
    price: 60,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-004",
    category: "goods",
    name: "香薰",
    emoji: "🕯️",
    price: 128,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-005",
    category: "goods",
    name: "小夜灯",
    emoji: "💡",
    price: 55,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-006",
    category: "goods",
    name: "唱片",
    emoji: "💿",
    price: 168,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-007",
    category: "goods",
    name: "钢笔",
    emoji: "🖋️",
    price: 220,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-008",
    category: "goods",
    name: "手串",
    emoji: "📿",
    price: 78,
    enabled: true,
    custom: false,
  },

  /* 外卖（food）——第三批用，先放着 */
  {
    id: "shop-f-001",
    category: "food",
    name: "拉面",
    emoji: "🍜",
    price: 32,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-002",
    category: "food",
    name: "奶茶",
    emoji: "🧋",
    price: 18,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-003",
    category: "food",
    name: "炸鸡",
    emoji: "🍗",
    price: 42,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-004",
    category: "food",
    name: "寿司",
    emoji: "🍣",
    price: 68,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-005",
    category: "food",
    name: "蛋糕",
    emoji: "🍰",
    price: 38,
    enabled: true,
    custom: false,
  },
];

export function createShopItemId(): string {
  return `shopitem-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}