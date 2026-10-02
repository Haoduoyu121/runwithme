"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";

import {
  calcProductUnitPrice,
  type ShopProduct,
} from "@/data/shopV2";

type Props = {
  product: ShopProduct;
  shopName: string;
  imageUrl?: string | null;
  onBack: () => void;
  onAddToCart: (
    specSelections: Record<string, string>,
    quantity: number,
    selectedToppings: string[]
  ) => void;
};

export default function ProductDetail({
  product,
  shopName,
  imageUrl,
  onBack,
  onAddToCart,
}: Props) {
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

  const [toppings, setToppings] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const unitPrice = useMemo(
    () => calcProductUnitPrice(product, toppings),
    [product, toppings]
  );

  const total = useMemo(
    () => unitPrice * qty,
    [unitPrice, qty]
  );

  function toggleTopping(name: string) {
    setToppings((prev) =>
      prev.includes(name)
        ? prev.filter((x) => x !== name)
        : [...prev, name]
    );
  }

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
        <div className="shopv2-product-hero">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <span className="shopv2-product-hero-emoji">
              {product.emoji}
            </span>
          )}
        </div>

        <div className="shopv2-product-price-block">
          <div className="shopv2-product-price">
            <span className="shopv2-product-price-current">
              ¥{unitPrice}
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

        {/* ★ 加料 */}
        {product.toppings && product.toppings.length > 0 && (
          <div className="shopv2-product-spec">
            <div className="shopv2-product-spec-title">
              加料（可多选）
            </div>
            <div className="shopv2-product-spec-options">
              {product.toppings.map((t) => {
                const active = toppings.includes(t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    className={
                      "shopv2-spec-chip" +
                      (active ? " active" : "")
                    }
                    onClick={() => toggleTopping(t.name)}
                  >
                    {t.name}
                    {t.price > 0 && (
                      <span className="shopv2-topping-price">
                        +¥{t.price}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
              onClick={() =>
                setQty((q) => Math.min(99, q + 1))
              }
            >
              <Plus size={14} strokeWidth={2.6} />
            </button>
          </div>
        </div>

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
          onClick={() =>
            onAddToCart(selections, qty, toppings)
          }
        >
          <ShoppingCart size={16} strokeWidth={2.4} />
          <span>加入购物车</span>
        </button>
      </div>
    </div>
  );
}