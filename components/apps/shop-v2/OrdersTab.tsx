"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

import type { Order } from "@/data/order";
import {
  stageLabel,
  STAGE_ORDER,
} from "@/data/order";
import type {
  ShopProduct,
  ShopOwnerId,
} from "@/data/shopV2";

import {
  loadOrdersByOwner,
  currentStage,
  stageProgress,
  advanceAllOrders,
  ORDER_EVENT,
} from "@/lib/orderStorage";

import { loadSystemSettings } from "@/lib/systemStorage";

type Props = {
  ownerId: ShopOwnerId;
  products: ShopProduct[];
  imageUrls: Record<string, string>;
  onOpenOrder: (orderId: string) => void;
};

export default function OrdersTab({
  ownerId,
  products,
  imageUrls,
  onOpenOrder,
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const speed =
      loadSystemSettings().shopDelivery.speed || 5;

    const reload = () => {
      advanceAllOrders(speed);
      setOrders(loadOrdersByOwner(ownerId));
    };

    reload();

    /* 定时推进 */
    const timer = window.setInterval(() => {
      advanceAllOrders(speed);
      setOrders(loadOrdersByOwner(ownerId));
    }, 3000);

    window.addEventListener(ORDER_EVENT, reload);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ORDER_EVENT, reload);
    };
  }, [ownerId]);

  const productMap = new Map(
    products.map((p) => [p.id, p])
  );

  if (orders.length === 0) {
    return (
      <div className="shopv2-scroll">
        <div className="shopv2-empty">
          <ShoppingBag
            size={40}
            strokeWidth={1.4}
            className="shopv2-empty-icon"
          />
          <div className="shopv2-empty-title">
            还没有订单
          </div>
          <div className="shopv2-empty-desc">
            去逛逛，买点什么吧
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shopv2-scroll">
      <div className="shopv2-orders-list">
        {orders.map((o) => {
          const stage = currentStage(o);
          const progress = stageProgress(o);
          const firstItem = o.items[0];
          const product = firstItem
            ? productMap.get(firstItem.productId)
            : null;
          const imgUrl =
            product?.imageId
              ? imageUrls[product.imageId]
              : null;

          return (
            <button
              key={o.id}
              type="button"
              className="shopv2-order-card"
              onClick={() => onOpenOrder(o.id)}
            >
              <div className="shopv2-order-card-head">
                <span className="shopv2-order-card-shop">
                  {o.shopName}
                </span>
                <span
                  className={
                    "shopv2-order-card-status" +
                    (o.status === "delivered" ||
                    o.status === "reviewed"
                      ? " is-delivered"
                      : "")
                  }
                >
                  {o.status === "reviewed"
                    ? "已评价"
                    : stageLabel(o.kind, stage)}
                </span>
              </div>

              <div className="shopv2-order-card-body">
                <div className="shopv2-order-card-image">
                  {imgUrl ? (
                    <img src={imgUrl} alt="" />
                  ) : (
                    <span className="shopv2-order-card-emoji">
                      {firstItem?.productEmoji ?? "🎁"}
                    </span>
                  )}
                </div>
                <div className="shopv2-order-card-info">
                  <div className="shopv2-order-card-name">
                    {firstItem?.productName ?? "商品"}
                    {o.items.length > 1 &&
                      ` 等 ${o.items.length} 件`}
                  </div>
                  <div className="shopv2-order-card-receiver">
                    收件人：
                    {o.receiverId === "you"
                      ? "我"
                      : o.receiverId === "levi"
                        ? "Levi"
                        : "Erwin"}
                  </div>
                </div>
                <div className="shopv2-order-card-total">
                  ¥{o.totalPrice}
                </div>
              </div>

              {o.status === "active" && (
                <div className="shopv2-order-card-progress">
                  <div
                    className="shopv2-order-card-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {o.status === "active" && (
                <div className="shopv2-order-card-hint">
                  {stageLabel(o.kind, stage)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ height: 40 }} />
    </div>
  );
}