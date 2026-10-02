"use client";

import { ChevronLeft } from "lucide-react";

import type {
  Shop,
  ShopProduct,
} from "@/data/shopV2";

type Props = {
  shop: Shop;
  products: ShopProduct[];
  imageUrls: Record<string, string>;
  onBack: () => void;
  onOpenProduct: (productId: string) => void;
};

export default function ShopDetail({
  shop,
  products,
  imageUrls,
  onBack,
  onOpenProduct,
}: Props) {
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
        <div className="shopv2-topbar-title">
          {shop.name}
        </div>
        <div className="shopv2-topbar-spacer" />
      </header>

      <div className="shopv2-scroll">
        {/* 店铺头 */}
        <div className="shopv2-shop-hero">
          <div className="shopv2-shop-logo">
            {shop.logoId && imageUrls[shop.logoId] ? (
              <img
                src={imageUrls[shop.logoId]}
                alt={shop.name}
              />
            ) : (
              <span>{shop.emoji}</span>
            )}
          </div>
          <div className="shopv2-shop-info">
            <div className="shopv2-shop-name">
              {shop.name}
            </div>
            <div className="shopv2-shop-desc">
              {shop.description}
            </div>
            <div className="shopv2-shop-meta">
              <span>⭐ {shop.rating.toFixed(1)}</span>
              <span>·</span>
              <span>{shop.deliveryTime}</span>
            </div>
          </div>
        </div>

        {/* 商品列表 */}
        <div className="shopv2-shop-products-title">
          全部商品（{products.length}）
        </div>

        {products.length === 0 ? (
          <div className="shopv2-empty">
            <div className="shopv2-empty-title">
              这家店还没有商品
            </div>
          </div>
        ) : (
          <div className="shopv2-product-grid">
            {products.map((p) => {
              const imgUrl = p.imageId
                ? imageUrls[p.imageId]
                : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="shopv2-product-card"
                  onClick={() => onOpenProduct(p.id)}
                >
                  <div className="shopv2-product-card-image">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" />
                    ) : (
                      <span className="shopv2-product-card-emoji">
                        {p.emoji}
                      </span>
                    )}
                  </div>
                  <div className="shopv2-product-card-name">
                    {p.name}
                  </div>
                  <div className="shopv2-product-card-price">
                    ¥{p.price}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}