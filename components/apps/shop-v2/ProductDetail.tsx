"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Image as ImageIcon,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";

import type { ShopProduct } from "@/data/shopV2";

type Props = {
  product: ShopProduct;
  shopName: string;
  imageUrl?: string | null;
  onBack: () => void;
  onAddToCart: (
    specSelections: Record<string, string>,
    quantity: number
  ) => void;
};

export default function ProductDetail({
  product,
  shopName,
  imageUrl,
  onBack,
  onAddToCart,
}: Props) {
  /* 默认选规格第一项 */
  const [selections, setSelections] = useState<
    Record<string, string>
  >(() => {
    const init: Record<string, string> = {};
    for (const sp of product.specs) {
      if (sp.options.length > 0) {
        init[sp.name] = sp.options[0];
      }
    }
    return init;
  });
  const [qty, setQty] = useState(1);

  const total = useMemo(
    () => product.price * qty,
    [product.price, qty]
  );

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
        <div className="shopv2-topbar-title">商品详情</div>
        <div className="shopv2-topbar-spacer" />
      </header>

      <div className="shopv2-scroll">
        {/* 商品图 */}
        <div className="shopv2-product-hero">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <span className="shopv2-product-hero-emoji">
              {product.emoji}
            </span>
          )}
        </div>

        {/* 价格块 */}
        <div className="shopv2-product-price-block">
          <div className="shopv2-product-price">
            <span className="shopv2-product-price-current">
              ¥{product.price}
            </span>
            {product.originalPrice &&
              product.originalPrice > product.price && (
                <span className="shopv2-product-price-original">
                  ¥{product.originalPrice}
                </span>
              )}
          </div>
          <div className="shopv2-product-name">
            {product.name}
          </div>
          {product.description && (
            <div className="shopv2-product-desc">
              {product.description}
            </div>
          )}
          <div className="shopv2-product-meta">
            <span>{shopName}</span>
            <span>·</span>
            <span>⭐ {product.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* 规格 */}
        {product.specs.map((sp) => (
          <div
            key={sp.name}
            className="shopv2-product-spec"
          >
            <div className="shopv2-product-spec-title">
              {sp.name}
            </div>
            <div className="shopv2-product-spec-options">
              {sp.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={
                    "shopv2-spec-chip" +
                    (selections[sp.name] === opt
                      ? " active"
                      : "")
                  }
                  onClick={() =>
                    setSelections((prev) => ({
                      ...prev,
                      [sp.name]: opt,
                    }))
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 数量 */}
        <div className="shopv2-product-spec">
          <div className="shopv2-product-spec-title">
            数量
          </div>
          <div className="shopv2-qty">
            <button
              type="button"
              className="shopv2-qty-btn"
              onClick={() =>
                setQty((q) => Math.max(1, q - 1))
              }
            >
              <Minus size={14} strokeWidth={2.6} />
            </button>
            <span className="shopv2-qty-num">{qty}</span>
            <button
              type="button"
              className="shopv2-qty-btn"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
            >
              <Plus size={14} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {/* 标签 */}
        {product.tags.length > 0 && (
          <div className="shopv2-product-tags">
            {product.tags.map((t) => (
              <span key={t} className="shopv2-tag">
                {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ height: 90 }} />
      </div>

      {/* 底部操作栏 */}
      <div className="shopv2-bottom-bar">
        <div className="shopv2-bottom-total">
          <span className="shopv2-bottom-total-label">
            合计
          </span>
          <span className="shopv2-bottom-total-amount">
            ¥{total}
          </span>
        </div>
        <button
          type="button"
          className="shopv2-bottom-btn primary"
          onClick={() => onAddToCart(selections, qty)}
        >
          <ShoppingCart size={16} strokeWidth={2.4} />
          <span>加入购物车</span>
        </button>
      </div>
    </div>
  );
}