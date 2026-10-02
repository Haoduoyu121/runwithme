/* =========================================================
   Runwithme · 购物
   ========================================================= */

export type ShopCategory = "goods" | "food";

export type ShopItem = {
  id: string;
  category: ShopCategory;
  /** 二级分类（如"日用品"） */
  group: string;
  name: string;
  emoji: string;
  /** IDB 里的图片 id（可选） */
  imageId?: string;
  price: number;
  enabled: boolean;
  custom: boolean;
};

/* ---------- 分组（预设） ---------- */

export const GOODS_GROUPS = [
  "日用品",
  "服饰",
  "食品",
  "数码",
  "书籍",
  "其他",
];

export const FOOD_GROUPS = [
  "主食",
  "快餐",
  "饮品",
  "甜点",
  "宵夜",
];

export const DEFAULT_GOODS_GROUP = "其他";
export const DEFAULT_FOOD_GROUP = "主食";

export function groupsFor(category: ShopCategory): string[] {
  return category === "goods"
    ? [...GOODS_GROUPS]
    : [...FOOD_GROUPS];
}

export function defaultGroupFor(
  category: ShopCategory
): string {
  return category === "goods"
    ? DEFAULT_GOODS_GROUP
    : DEFAULT_FOOD_GROUP;
}

/* ---------- 默认商品 ---------- */

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  /* 商场 */
  {
    id: "shop-g-001",
    category: "goods",
    group: "服饰",
    name: "围巾",
    emoji: "🧣",
    price: 88,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-002",
    category: "goods",
    group: "日用品",
    name: "手账本",
    emoji: "📓",
    price: 45,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-003",
    category: "goods",
    group: "日用品",
    name: "杯子",
    emoji: "☕",
    price: 60,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-004",
    category: "goods",
    group: "日用品",
    name: "香薰",
    emoji: "🕯️",
    price: 128,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-005",
    category: "goods",
    group: "日用品",
    name: "小夜灯",
    emoji: "💡",
    price: 55,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-006",
    category: "goods",
    group: "其他",
    name: "唱片",
    emoji: "💿",
    price: 168,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-007",
    category: "goods",
    group: "书籍",
    name: "钢笔",
    emoji: "🖋️",
    price: 220,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-g-008",
    category: "goods",
    group: "服饰",
    name: "手串",
    emoji: "📿",
    price: 78,
    enabled: true,
    custom: false,
  },

  /* 外卖 */
  {
    id: "shop-f-001",
    category: "food",
    group: "主食",
    name: "拉面",
    emoji: "🍜",
    price: 32,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-002",
    category: "food",
    group: "饮品",
    name: "奶茶",
    emoji: "🧋",
    price: 18,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-003",
    category: "food",
    group: "快餐",
    name: "炸鸡",
    emoji: "🍗",
    price: 42,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-004",
    category: "food",
    group: "主食",
    name: "寿司",
    emoji: "🍣",
    price: 68,
    enabled: true,
    custom: false,
  },
  {
    id: "shop-f-005",
    category: "food",
    group: "甜点",
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