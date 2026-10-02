"use client";

import {
  Check,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import {
  calcProductUnitPrice,
  type Cart,
  type ShopProduct,
} from "@/data/shopV2";

type Props = {
  cart: Cart;
  products: ShopProduct[];
  imageUrls: Record<string, string>;
  onClose: () => void;
  onToggleSelect: (itemId: string) => void;
  onChangeQty: (itemId: string, delta: number) => void;
  onDelete: (itemId: string) => void;
  onCheckout: () => void;
};

export default function CartSheet({
  cart,
  products,
  imageUrls,
  onClose,
  onToggleSelect,
  onChangeQty,
  onDelete,
  onCheckout,
}: Props) {
  const productMap = new Map(products.map((p) => [p.id, p]));

  const total = cart.items.reduce((sum, it) => {
    const p = productMap.get(it.productId);
    if (!p) return sum;
    return (
      sum +
      calcProductUnitPrice(p, it.selectedToppings) *
        it.quantity
    );
  }, 0);

  return (
    <div
      className="shopv2-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="shopv2-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shopv2-sheet-header">
          <span>购物车</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="shopv2-empty">
            <ShoppingBag
              size={40}
              strokeWidth={1.4}
              className="shopv2-empty-icon"
            />
            <div className="shopv2-empty-title">
              购物车还是空的
            </div>
            <div className="shopv2-empty-desc">
              去逛逛，挑点什么吧
            </div>
          </div>
        ) : (
          <div className="shopv2-cart-list">
            {cart.items.map((item) => {
              const p = productMap.get(item.productId);
              if (!p) return null;
              const imgUrl = p.imageId
                ? imageUrls[p.imageId]
                : null;
              const specText = Object.entries(
                item.specSelections
              )
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ");
              const toppingText =
                item.selectedToppings &&
                item.selectedToppings.length > 0
                  ? `加料：${item.selectedToppings.join(
                      "、"
                    )}`
                  : "";
              const unitPrice = calcProductUnitPrice(
                p,
                item.selectedToppings
              );

              return (
                <div
                  key={item.id}
                  className="shopv2-cart-item"
                >
                  <button
                    type="button"
                    className="shopv2-cart-check"
                    onClick={() => onToggleSelect(item.id)}
                  >
                    {item.quantity > 0 && (
                      <Check
                        size={12}
                        strokeWidth={3}
                      />
                    )}
                  </button>

                  <div className="shopv2-cart-image">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" />
                    ) : (
                      <span className="shopv2-cart-emoji">
                        {p.emoji}
                      </span>
                    )}
                  </div>

                  <div className="shopv2-cart-info">
                    <div className="shopv2-cart-name">
                      {p.name}
                    </div>
                    {specText && (
                      <div className="shopv2-cart-spec">
                        {specText}
                      </div>
                    )}
                    {toppingText && (
                      <div className="shopv2-cart-spec">
                        {toppingText}
                      </div>
                    )}
                    <div className="shopv2-cart-price">
                      ¥{unitPrice}
                    </div>
                  </div>

                  <div className="shopv2-cart-right">
                    <button
                      type="button"
                      className="shopv2-cart-delete"
                      onClick={() => onDelete(item.id)}
                      aria-label="删除"
                    >
                      <Trash2
                        size={14}
                        strokeWidth={2.2}
                      />
                    </button>
                    <div className="shopv2-qty small">
                      <button
                        type="button"
                        className="shopv2-qty-btn small"
                        onClick={() =>
                          onChangeQty(item.id, -1)
                        }
                      >
                        −
                      </button>
                      <span className="shopv2-qty-num small">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="shopv2-qty-btn small"
                        onClick={() =>
                          onChangeQty(item.id, 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="shopv2-cart-bottom">
          <div className="shopv2-cart-total">
            <span className="shopv2-cart-total-label">
              合计
            </span>
            <span className="shopv2-cart-total-amount">
              ¥{total}
            </span>
          </div>
          <button
            type="button"
            className="shopv2-cart-checkout"
            disabled={cart.items.length === 0}
            onClick={onCheckout}
          >
            结算
          </button>
        </div>
      </div>
    </div>
  );
}