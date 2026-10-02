import type {
  ShopKind,
  ShopOwnerId,
} from "./shopV2";

export type OrderStage =
  | "placed"
  | "accepted"
  | "preparing"
  | "shipped"
  | "in-transit"
  | "out-for-delivery"
  | "delivered";

export type OrderStatus =
  | "active"      // 进行中（含物流推进）
  | "delivered"   // 已送达
  | "reviewed"    // 已评价
  | "cancelled";  // 已取消

export type OrderItem = {
  productId: string;
  productName: string;
  productEmoji: string;
  productImageId?: string;
  specSelections: Record<string, string>;
  /** ★ 选中的加料 */
  selectedToppings?: string[];
  quantity: number;
  price: number;
};

export type LogisticsEvent = {
  stage: OrderStage;
  at: number;
};

export type OrderReview = {
  /** 谁写的评价（旧数据无此字段 → 视为 you） */
  authorId?: "you" | "levi" | "erwin";
  rating: number;
  comment: string;
  createdAt: number;
};

export type Order = {
  id: string;
  kind: ShopKind;
  buyerId: ShopOwnerId;
  receiverId: ShopOwnerId;
  isGift: boolean;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  totalPrice: number;
  addressId: string | null;
  /** 角色接受礼物时，从角色地址池抽的地址文本 */
  addressText?: string;
  status: OrderStatus;
  logistics: LogisticsEvent[];
  review: OrderReview | null;
  createdAt: number;
  updatedAt: number;
  deliveredAt?: number;
  /** 送礼场景：角色接受或拒绝 */
  giftStatus?: "pending" | "accepted" | "rejected";
};

export function createOrderId(): string {
  return `order-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* ---------- 阶段顺序 & 标签 ---------- */

export const STAGE_ORDER: OrderStage[] = [
  "placed",
  "accepted",
  "preparing",
  "shipped",
  "in-transit",
  "out-for-delivery",
  "delivered",
];

/** 各阶段的相对延迟（秒，从 createdAt 起算） */
export const STAGE_DELAYS: Record<
  ShopKind,
  Record<OrderStage, number>
> = {
  goods: {
    placed: 0,
    accepted: 10,
    preparing: 25,
    shipped: 50,
    "in-transit": 90,
    "out-for-delivery": 150,
    delivered: 190,
  },
  food: {
    placed: 0,
    accepted: 8,
    preparing: 20,
    shipped: 40,
    "in-transit": 70,
    "out-for-delivery": 100,
    delivered: 130,
  },
};

export const STAGE_LABELS: Record<
  ShopKind,
  Record<OrderStage, string>
> = {
  goods: {
    placed: "已下单",
    accepted: "商家已接单",
    preparing: "商家备货中",
    shipped: "已发货",
    "in-transit": "运输中",
    "out-for-delivery": "派送中",
    delivered: "已送达",
  },
  food: {
    placed: "已下单",
    accepted: "商家已接单",
    preparing: "制作中",
    shipped: "骑手已取餐",
    "in-transit": "配送中",
    "out-for-delivery": "即将送达",
    delivered: "已送达",
  },
};

export function stageLabel(
  kind: ShopKind,
  stage: OrderStage
): string {
  return STAGE_LABELS[kind][stage];
}