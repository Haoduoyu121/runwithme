/* =========================================================
   Runwithme · Shop v2
   完整店铺 / 商品 / 规格 / 购物车
   ========================================================= */

export type ShopKind = "goods" | "food";
export type ShopOwnerId = "you" | "levi" | "erwin";

export type ProductSpec = {
  name: string;      // "颜色"
  options: string[]; // ["米白", "粉色"]
};

export type ProductTopping = {
  name: string;      // "珍珠"
  price: number;     // 3
};

export type ProductReview = {
  id: string;
  authorId: ShopOwnerId;
  rating: number;
  content: string;
  createdAt: number;
  generated: boolean;
};

export type ShopProduct = {
  id: string;
  shopId: string;
  kind: ShopKind;
  name: string;
  description: string;
  category: string;
  emoji: string;
  imageId?: string;
  price: number;
  originalPrice?: number;
  specs: ProductSpec[];
  /** ★ 加料（多选） */
  toppings?: ProductTopping[];
  tags: string[];
  rating: number;
  reviews: ProductReview[];
  enabled: boolean;
  custom: boolean;
  createdAt: number;
};

export type Shop = {
  id: string;
  kind: ShopKind;
  ownerId: ShopOwnerId;
  name: string;
  description: string;
  category: string;
  emoji: string;
  logoId?: string;
  bannerId?: string;
  rating: number;
  deliveryTime: string;
  tags: string[];
  enabled: boolean;
  custom: boolean;
  createdAt: number;
};

export type CartItem = {
  id: string;
  productId: string;
  specSelections: Record<string, string>;
  /** ★ 选中的加料 name */
  selectedToppings?: string[];
  quantity: number;
  addedAt: number;
};

export type Cart = {
  ownerId: ShopOwnerId;
  items: CartItem[];
};

/* ---------- 分类预设 ---------- */

export const GOODS_CATEGORIES = [
  "服饰",
  "家居",
  "食品",
  "数码",
  "文具",
  "美妆",
  "宠物",
  "杂货",
  "礼物",
];

export const FOOD_CATEGORIES = [
  "奶茶",
  "咖啡",
  "汉堡",
  "日料",
  "甜品",
  "火锅",
  "小吃",
];

export function categoriesFor(kind: ShopKind): string[] {
  return kind === "goods"
    ? [...GOODS_CATEGORIES]
    : [...FOOD_CATEGORIES];
}

/* ---------- ID ---------- */

export function createShopId(): string {
  return `shop-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function createProductId(): string {
  return `prod-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function createCartItemId(): string {
  return `cart-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/**
 * 计算单个商品（含加料）的单价
 */
export function calcProductUnitPrice(
  product: ShopProduct,
  selectedToppings: string[] | undefined
): number {
  let price = product.price;
  if (product.toppings && selectedToppings) {
    for (const name of selectedToppings) {
      const t = product.toppings.find((x) => x.name === name);
      if (t) price += t.price;
    }
  }
  return price;
}

/* ---------- 默认数据 ---------- */

export const DEFAULT_SHOPS: Shop[] = [
  {
    id: "shop-default-1",
    kind: "goods",
    ownerId: "you",
    name: "午后杂货铺",
    description: "日常生活里的小东西。",
    category: "杂货",
    emoji: "🏠",
    rating: 4.9,
    deliveryTime: "1-3 天",
    tags: ["温柔", "日常"],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "shop-default-2",
    kind: "goods",
    ownerId: "you",
    name: "暖冬衣橱",
    description: "一点点温度，一点点陪伴。",
    category: "服饰",
    emoji: "🧣",
    rating: 4.8,
    deliveryTime: "1-2 天",
    tags: ["保暖", "舒适"],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "shop-default-3",
    kind: "food",
    ownerId: "you",
    name: "手作茶饮",
    description: "给今天一点甜。",
    category: "奶茶",
    emoji: "🧋",
    rating: 4.9,
    deliveryTime: "30 分钟",
    tags: ["现制", "热饮"],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
];

export const DEFAULT_PRODUCTS: ShopProduct[] = [
  {
    id: "prod-default-1",
    shopId: "shop-default-1",
    kind: "goods",
    name: "柔软羊毛毯",
    description:
      "很软，很暖。适合窝在沙发上看书。",
    category: "家居",
    emoji: "🧶",
    price: 129,
    originalPrice: 199,
    specs: [
      { name: "颜色", options: ["米白", "粉色", "灰色"] },
      { name: "尺寸", options: ["130×180", "150×200"] },
    ],
    tags: ["保暖", "柔软"],
    rating: 4.8,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-2",
    shopId: "shop-default-1",
    kind: "goods",
    name: "陶瓷杯",
    description: "握在手里刚好。",
    category: "家居",
    emoji: "☕",
    price: 39,
    specs: [
      { name: "颜色", options: ["米白", "青灰", "奶咖"] },
    ],
    tags: ["日常"],
    rating: 4.9,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-3",
    shopId: "shop-default-1",
    kind: "goods",
    name: "猫咪钥匙扣",
    description: "小小一只，挂在包上。",
    category: "礼物",
    emoji: "🐱",
    price: 25,
    specs: [
      { name: "款式", options: ["白猫", "橘猫", "黑猫"] },
    ],
    tags: ["可爱"],
    rating: 5.0,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-4",
    shopId: "shop-default-1",
    kind: "goods",
    name: "木质香薰灯",
    description: "暖光，安静的味道。",
    category: "家居",
    emoji: "🕯️",
    price: 189,
    specs: [
      { name: "香型", options: ["雪松", "白茶", "无香"] },
    ],
    tags: ["香氛", "放松"],
    rating: 4.7,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-5",
    shopId: "shop-default-2",
    kind: "goods",
    name: "针织围巾",
    description: "厚厚一圈，冬天会很暖。",
    category: "服饰",
    emoji: "🧣",
    price: 88,
    specs: [
      { name: "颜色", options: ["奶白", "燕麦", "深灰"] },
    ],
    tags: ["保暖", "柔软"],
    rating: 4.9,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-6",
    shopId: "shop-default-2",
    kind: "goods",
    name: "针织手套",
    description: "手指可以碰触屏。",
    category: "服饰",
    emoji: "🧤",
    price: 45,
    specs: [
      { name: "颜色", options: ["奶白", "深灰"] },
    ],
    tags: ["保暖"],
    rating: 4.8,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-7",
    shopId: "shop-default-3",
    kind: "food",
    name: "多肉葡萄",
    description: "整颗葡萄果肉。",
    category: "奶茶",
    emoji: "🍇",
    price: 25,
    specs: [
      { name: "冰量", options: ["正常冰", "少冰", "去冰"] },
      { name: "糖度", options: ["正常", "少糖", "无糖"] },
    ],
    toppings: [
      { name: "珍珠", price: 3 },
      { name: "芋圆", price: 4 },
      { name: "椰果", price: 3 },
      { name: "奶盖", price: 5 },
    ],
    tags: ["果茶"],
    rating: 4.9,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
  {
    id: "prod-default-8",
    shopId: "shop-default-3",
    kind: "food",
    name: "芝芝莓莓",
    description: "芝士奶盖 + 草莓果茶。",
    category: "奶茶",
    emoji: "🍓",
    price: 32,
    specs: [
      { name: "冰量", options: ["正常冰", "少冰", "去冰"] },
      { name: "糖度", options: ["正常", "少糖", "无糖"] },
    ],
    toppings: [
      { name: "珍珠", price: 3 },
      { name: "芋圆", price: 4 },
      { name: "椰果", price: 3 },
    ],
    tags: ["芝士", "果茶"],
    rating: 4.8,
    reviews: [],
    enabled: true,
    custom: false,
    createdAt: Date.now(),
  },
];

export const DEFAULT_CARTS: Cart[] = [
  { ownerId: "you", items: [] },
  { ownerId: "levi", items: [] },
  { ownerId: "erwin", items: [] },
];