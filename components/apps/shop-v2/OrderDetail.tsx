"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Star,
  Trash2,
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

/**
 * 监听全局收藏事件，转发给 CollectionContext。
 * 因为 OrderDetail 不在 CollectionProvider 的同一棵 React 树
 * （Shop 是独立 App），用事件桥接。
 */
function useShopCollectBridge() {
  useEffect(() => {
    function onCollect(e: Event) {
      const d = (
        e as CustomEvent<{
          orderId: string;
          title: string;
          preview: string;
        }>
      ).detail;
      if (!d?.orderId) return;
      void import("@/lib/collectionStorage").then(
        async ({ createCollectionId, loadCollections, saveCollections }) => {
          const list = loadCollections();
          if (
            list.some(
              (it) =>
                it.source === "shop" &&
                it.sourceId === d.orderId
            )
          ) {
            window.alert("这条订单已经收藏过了");
            return;
          }
          const item = {
            id: createCollectionId(),
            owner: "user" as const,
            source: "shop" as const,
            sourceId: d.orderId,
            content: d.title,
            note: "",
            tags: [],
            createdAt: Date.now(),
            originalAt: Date.now(),
            sender: null,
            meta: { preview: d.preview },
          };
          saveCollections([item, ...list]);
          window.alert("已收藏到 Collection");
        }
      );
    }
    window.addEventListener(
      "runwithme:collect-shop-order",
      onCollect
    );
    return () => {
      window.removeEventListener(
        "runwithme:collect-shop-order",
        onCollect
      );
    };
  }, []);
}

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
  useShopCollectBridge();
  const [order, setOrder] = useState<Order | null>(null);
  const [showRate, setShowRate] = useState(false);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    const speed =
      loadSystemSettings().shopDelivery.speed || 5;

    let deliveredNotified = false;

    const reload = () => {
      advanceAllOrders(speed);
      const o = loadOrders().find((x) => x.id === orderId);
      setOrder(o ?? null);

      /* 送达事件写 Memory（只写一次） */
      if (
        o &&
        !deliveredNotified &&
        (o.status === "delivered" ||
          o.status === "reviewed")
      ) {
        deliveredNotified = true;
        void import("@/lib/shopMemory").then(
          ({ memoryOrderDelivered }) => {
            memoryOrderDelivered(o);
          }
        );
      }
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
    !!order.review && order.status === "reviewed";

  /* 礼物待接受 */
  const isGiftPending =
    order.giftStatus === "pending" &&
    order.logistics.length === 0;

  /* 礼物被拒 */
  const isGiftRejected = order.giftStatus === "rejected";

  /* 已送达且未评价 → 可评价 */
  const canReview =
    order.buyerId === "you" &&
    !isGiftPending &&
    !isGiftRejected &&
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
        <div className="shopv2-topbar-actions">
          <button
            type="button"
            className="shopv2-topbar-iconbtn"
            onClick={() => {
              void import("@/lib/shopMemory").then(
                async () => {
                  const { useCollection: _u } =
                    await import("@/lib/CollectionContext");
                  /* 用 window 事件避免 hook 依赖 */
                  try {
                    window.dispatchEvent(
                      new CustomEvent(
                        "runwithme:collect-shop-order",
                        {
                          detail: {
                            orderId: order.id,
                            title: `订单：${
                              order.items[0]?.productName ??
                              "商品"
                            }`,
                            preview: `${order.shopName} · ¥${order.totalPrice}`,
                          },
                        }
                      )
                    );
                  } catch {}
                }
              );
            }}
            aria-label="收藏订单"
          >
            <Star size={20} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="shopv2-topbar-iconbtn"
            onClick={() => {
              if (
                window.confirm(
                  "删除这个订单？不影响已扣除的钱（除非是待接受的礼物）"
                )
              ) {
                void import("@/lib/orderStorage").then(
                  ({ deleteOrder }) => {
                    deleteOrder(order.id);
                    onBack();
                  }
                );
              }
            }}
            aria-label="删除订单"
          >
            <Trash2 size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <div className="shopv2-scroll">
        {/* 状态 */}
        <div
          className={
            "shopv2-order-detail-status" +
            (isGiftRejected ? " is-cancelled" : "")
          }
        >
          <div className="shopv2-order-detail-status-label">
            {isGiftRejected
              ? "礼物已被拒绝 · 已退款"
              : isGiftPending
                ? "等待对方接受"
                : order.status === "reviewed"
                  ? "已完成"
                  : order.status === "cancelled"
                    ? "已取消"
                    : stageLabel(order.kind, stage)}
          </div>
          {isGiftPending && (
            <div className="shopv2-order-detail-status-hint">
              对方在 Chat 里接受后才会开始发货
            </div>
          )}
          {order.status === "active" &&
            !isGiftPending && (
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
            const toppingText =
              it.selectedToppings &&
              it.selectedToppings.length > 0
                ? `加料：${it.selectedToppings.join(
                    "、"
                  )}`
                : "";
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
                  {toppingText && (
                    <div className="shopv2-order-detail-item-spec">
                      {toppingText}
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

        {/* 订单信息 */}
        <div className="shopv2-order-detail-block">
          <div className="shopv2-order-detail-block-title">
            订单信息
          </div>
          <div className="shopv2-order-detail-info-row">
            <span className="shopv2-order-detail-info-label">
              买家
            </span>
            <span className="shopv2-order-detail-info-value">
              {order.buyerId === "you"
                ? "你"
                : order.buyerId === "levi"
                  ? "Levi"
                  : "Erwin"}
            </span>
          </div>
          <div className="shopv2-order-detail-info-row">
            <span className="shopv2-order-detail-info-label">
              收件人
            </span>
            <span className="shopv2-order-detail-info-value">
              {order.receiverId === "you"
                ? "你"
                : order.receiverId === "levi"
                  ? "Levi"
                  : "Erwin"}
            </span>
          </div>
          {order.isGift && (
            <div className="shopv2-order-detail-info-row">
              <span className="shopv2-order-detail-info-label">
                类型
              </span>
              <span className="shopv2-order-detail-info-value">
                礼物
              </span>
            </div>
          )}
        </div>

        {/* 收货信息 */}
        {order.addressId && (
          <AddressBlock addressId={order.addressId} />
        )}

        {/* 物流时间线 */}
        {order.logistics.length > 0 && (
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
        )}

        {/* 评价（已评价时） */}
        {order.review && (
          <div className="shopv2-order-detail-block">
            <div className="shopv2-order-detail-block-title">
              {!order.review.authorId ||
              order.review.authorId === "you"
                ? "我的评价"
                : order.review.authorId === "levi"
                  ? "Levi 的评价"
                  : "Erwin 的评价"}
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
                let reviewed: typeof order | null = null;
                const next = list.map((o) => {
                  if (o.id !== order.id) return o;
                  const updated = {
                    ...o,
                    status: "reviewed" as const,
                    review: {
                      rating: ratingDraft,
                      comment: commentDraft.trim(),
                      createdAt: Date.now(),
                    },
                  };
                  reviewed = updated;
                  return updated;
                });
                saveOrders(next);
                setShowRate(false);
                onReviewed();

                if (reviewed) {
                  void import("@/lib/shopMemory").then(
                    ({ memoryOrderReviewed }) => {
                      memoryOrderReviewed(
                        reviewed!,
                        ratingDraft,
                        commentDraft.trim()
                      );
                    }
                  );
                }
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

function AddressBlock({ addressId }: { addressId: string }) {
  const [addr, setAddr] = useState<import("@/data/address").Address | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { loadAddresses } = await import("@/lib/addressStorage");
      if (cancelled) return;
      setAddr(loadAddresses().find((a) => a.id === addressId) ?? null);
    })();
    return () => { cancelled = true; };
  }, [addressId]);

  if (!addr) return null;

  return (
    <div className="shopv2-order-detail-block">
      <div className="shopv2-order-detail-block-title">
        收货信息
      </div>
      <div className="shopv2-addr-item-name">
        {addr.name}
        {addr.phone && (
          <span className="shopv2-addr-item-phone">
            {addr.phone}
          </span>
        )}
        {addr.isDefault && (
          <span className="shopv2-addr-item-default">默认</span>
        )}
      </div>
      <div className="shopv2-addr-item-detail">
        {addr.city}
        {addr.district ? " · " + addr.district : ""}
        {addr.detail ? " " + addr.detail : ""}
      </div>
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