"use client";

import {
  Search,
} from "lucide-react";

import type {
  Shop,
  ShopProduct,
  ShopKind,
  ShopOwnerId,
} from "@/data/shopV2";

type Props = {
  kind: ShopKind;
  ownerId: ShopOwnerId;
  shops: Shop[];
  products: ShopProduct[];
  imageUrls: Record<string, string>;
  searchText: string;
  onSearchChange: (v: string) => void;
  onOpenShop: (shopId: string) => void;
  onOpenProduct: (productId: string) => void;
};

export default function ShopHome({
  kind,
  ownerId,
  shops,
  products,
  imageUrls,
  searchText,
  onSearchChange,
  onOpenShop,
  onOpenProduct,
}: Props) {
  /* 搜索过滤 */
  const q = searchText.trim().toLowerCase();
  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : products;

  /* 推荐商品（前 6 个） */
  const recommend = filteredProducts.slice(0, 6);

  return (
    <div className="shopv2-scroll shopv2-scroll-main">
      {/* 搜索框 */}
      <div className="shopv2-search">
        <Search
          size={16}
          strokeWidth={2.4}
          className="shopv2-search-icon"
        />
        <input
          type="text"
          className="shopv2-search-input"
          value={searchText}
          onChange={(e) =>
            onSearchChange(e.target.value)
          }
          placeholder={
            kind === "food"
              ? "搜索店铺 / 食物"
              : "搜索商品 / 店铺"
          }
        />
      </div>

      {/* 店铺行 */}
      {shops.length > 0 && (
        <>
          <div className="shopv2-section-title">
            推荐店铺
          </div>
          <div className="shopv2-shop-row">
            {shops.slice(0, 8).map((s) => (
              <button
                key={s.id}
                type="button"
                className="shopv2-shop-chip"
                onClick={() => onOpenShop(s.id)}
              >
                <div className="shopv2-shop-chip-logo">
                  {s.logoId && imageUrls[s.logoId] ? (
                    <img
                      src={imageUrls[s.logoId]}
                      alt={s.name}
                    />
                  ) : (
                    <span>{s.emoji}</span>
                  )}
                </div>
                <span className="shopv2-shop-chip-name">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 商品网格 */}
      <div className="shopv2-section-title">
        {q ? `搜索结果（${recommend.length}）` : "今日推荐"}
      </div>

      {recommend.length === 0 ? (
        <div className="shopv2-empty">
          <div className="shopv2-empty-title">
            {q ? "没有找到相关商品" : "还没有商品"}
          </div>
        </div>
      ) : (
        <div className="shopv2-product-grid">
          {recommend.map((p) => {
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
  );
}