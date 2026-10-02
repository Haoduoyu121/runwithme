"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Star,
} from "lucide-react";

import type { Order } from "@/data/order";
import {
  STAGE_ORDER,
  stageLabel,
} from "@/data/order";

import {
  loadOrders,
  currentStage,
  advanceAllOrders,
  ORDER_EVENT,
} from "@/lib/orderStorage";

import { loadSystemSettings } from "@/lib/systemStorage";

import type { ShopProduct } from "@/data/shopV2";

type Props = {
  orderId: string;
  products: ShopProduct[];
  imageUrls: Record<string, string>;
  onBack: () => void;
  onReviewed: () => void;
};

export default function OrderDetail({
  orderId,
  products,
  imageUrls,
  onBack,
  onReviewed,
}: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [showRate, setShowRate] = useState(false);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    const speed =
      loadSystemSettings().shopDelivery.speed || 5;

    const reload = () => {
      advanceAllOrders(speed);
      const o = loadOrders().find((x) => x.id === orderId);
      setOrder(o ?? null);
    };

    reload();
    const timer = window.setInterval(reload, 3000);
    window.addEventListener(ORDER_EVENT, reload);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ORDER_EVENT, reload);
    };
  }, [orderId]);

  if (!order) {
    return (
      <div className="shopv2-page">
        <header className="shopv2-topbar">
          <button
            type="button"
            className="shopv2-topbar-back"
            onClick={onBack}
          >
            <ChevronLeft size={26} strokeWidth={2.4} />
          </button>
          <div className="shopv2-topbar-title">订单详情</div>
          <div className="shopv2-topbar-spacer" />
        </header>
        <div className="shopv2-scroll">
          <div className="shopv2-empty">
            <div className="shopv2-empty-title">
              订单不存在
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stage = currentStage(order);
  const productMap = new Map(
    products.map((p) => [p.id, p])
  );

  const isReviewed =
    order.status === "reviewed" && order.review;

  /* 已送达且未评价 → 可评价 */
  const canReview =
    !isReviewed &&
    (stage === "delivered" ||
      order.status === "delivered");

  return (
    <div className="shopv2-page">
      <header className="shopv2-topbar">
        <button
          type="button"
          className="shopv2-topbar-back"
          onClick={onBack}
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="shopv2-topbar-title">订单详情</div>
        <div className="shopv2-topbar-spacer" />
      </header>

      <div className="shopv2-scroll">
        {/* 状态 */}
        <div className="shopv2-order-detail-status">
          <div className="shopv2-order-detail-status-label">
            {order.status === "reviewed"
              ? "已完成"
              : stageLabel(order.kind, stage)}
          </div>
          {order.status === "active" && (
            <div className="shopv2-order-detail-status-hint">
              物流进行中，稍后自动更新
            </div>
          )}
        </div>

        {/* 商品清单 */}
        <div className="shopv2-order-detail-block">
          <div className="shopv2-order-detail-block-title">
            商品清单
          </div>
          {order.items.map((it, idx) => {
            const p = productMap.get(it.productId);
            const imgUrl =
              it.productImageId
                ? imageUrls[it.productImageId]
                : p?.imageId
                  ? imageUrls[p.imageId]
                  : null;
            const specText = Object.entries(
              it.specSelections
            )
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ");
            return (
              <div
                key={idx}
                className="shopv2-order-detail-item"
              >
                <div className="shopv2-order-detail-item-image">
                  {imgUrl ? (
                    <img src={imgUrl} alt="" />
                  ) : (
                    <span className="shopv2-order-detail-item-emoji">
                      {it.productEmoji}
                    </span>
                  )}
                </div>
                <div className="shopv2-order-detail-item-info">
                  <div className="shopv2-order-detail-item-name">
                    {it.productName}
                  </div>
                  {specText && (
                    <div className="shopv2-order-detail-item-spec">
                      {specText}
                    </div>
                  )}
                  <div className="shopv2-order-detail-item-price">
                    ¥{it.price} × {it.quantity}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="shopv2-order-detail-total">
            <span>合计</span>
            <span className="shopv2-order-detail-total-amount">
              ¥{order.totalPrice}
            </span>
          </div>
        </div>

        {/* 物流时间线 */}
        <div className="shopv2-order-detail-block">
          <div className="shopv2-order-detail-block-title">
            物流信息
          </div>
          <div className="shopv2-logistics">
            {[...order.logistics].reverse().map((ev, i) => {
              const isLatest = i === 0;
              return (
                <div
                  key={i}
                  className={
                    "shopv2-logistics-row" +
                    (isLatest ? " is-latest" : "")
                  }
                >
                  <div className="shopv2-logistics-dot" />
                  <div className="shopv2-logistics-content">
                    <div className="shopv2-logistics-label">
                      {stageLabel(order.kind, ev.stage)}
                    </div>
                    <div className="shopv2-logistics-time">
                      {formatTime(ev.at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 评价（已评价时） */}
        {isReviewed && order.review && (
          <div className="shopv2-order-detail-block">
            <div className="shopv2-order-detail-block-title">
              我的评价
            </div>
            <div className="shopv2-order-detail-review">
              <div className="shopv2-order-detail-review-stars">
                {"★".repeat(order.review.rating)}
                {"☆".repeat(5 - order.review.rating)}
              </div>
              {order.review.comment && (
                <div className="shopv2-order-detail-review-comment">
                  {order.review.comment}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ height: canReview ? 100 : 40 }} />
      </div>

      {canReview && (
        <div className="shopv2-bottom-bar">
          <button
            type="button"
            className="shopv2-bottom-btn primary"
            onClick={() => setShowRate(true)}
          >
            <Star size={16} strokeWidth={2.4} />
            <span>评价订单</span>
          </button>
        </div>
      )}

      {showRate && (
        <div
          className="shopv2-sheet-backdrop"
          onClick={() => setShowRate(false)}
        >
          <div
            className="shopv2-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shopv2-sheet-header">
              <span>评价订单</span>
              <button
                type="button"
                onClick={() => setShowRate(false)}
              >
                ✕
              </button>
            </header>

            <div className="shopv2-rate-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={
                    "shopv2-rate-star" +
                    (n <= ratingDraft ? " active" : "")
                  }
                  onClick={() => setRatingDraft(n)}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              className="shopv2-rate-textarea"
              value={commentDraft}
              onChange={(e) =>
                setCommentDraft(e.target.value)
              }
              placeholder="说点什么…"
              maxLength={80}
              rows={3}
            />

            <button
              type="button"
              className="shopv2-rate-submit"
              onClick={async () => {
                const { loadOrders, saveOrders } =
                  await import("@/lib/orderStorage");
                const list = loadOrders();
                const next = list.map((o) =>
                  o.id === order.id
                    ? {
                        ...o,
                        status: "reviewed" as const,
                        review: {
                          rating: ratingDraft,
                          comment: commentDraft.trim(),
                          createdAt: Date.now(),
                        },
                      }
                    : o
                );
                saveOrders(next);
                setShowRate(false);
                onReviewed();
              }}
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}