"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  Plus,
  Sparkles,
} from "lucide-react";

import type {
  Shop,
  ShopProduct,
  ShopKind,
} from "@/data/shopV2";

import {
  loadShops,
  loadProducts,
  upsertProduct,
  deleteProduct,
  upsertShop,
  deleteShop,
  SHOP_V2_EVENT,
} from "@/lib/shopV2Storage";

import ProductEditorSheet from "./ProductEditorSheet";
import ShopEditorSheet from "./ShopEditorSheet";
import AiGenerateSheet from "./AiGenerateSheet";

type Props = {
  kind: ShopKind;
  onBack: () => void;
};

type Tab = "products" | "shops";

export default function ManagePage({ kind, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("products");
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>(
    []
  );

  const [editProduct, setEditProduct] =
    useState<ShopProduct | null>(null);
  const [newProductShopId, setNewProductShopId] =
    useState<string | null>(null);
  const [editShop, setEditShop] = useState<Shop | null>(
    null
  );
  const [showNewShop, setShowNewShop] = useState(false);
  const [showAi, setShowAi] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => {
      setShops(
        loadShops().filter((s) => s.kind === kind)
      );
      setProducts(
        loadProducts().filter((p) => p.kind === kind)
      );
    };
    reload();
    window.addEventListener(SHOP_V2_EVENT, reload);
    return () => {
      window.removeEventListener(SHOP_V2_EVENT, reload);
    };
  }, [kind]);

  const shopNameOf = (id: string) =>
    shops.find((s) => s.id === id)?.name ?? "（已删除）";

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
        <div className="shopv2-topbar-title">管理</div>
        <div className="shopv2-topbar-spacer" />
      </header>

      <div className="shopv2-top-tabs">
        <button
          type="button"
          className={
            "shopv2-top-tab" +
            (tab === "products" ? " active" : "")
          }
          onClick={() => setTab("products")}
        >
          商品（{products.length}）
        </button>
        <button
          type="button"
          className={
            "shopv2-top-tab" +
            (tab === "shops" ? " active" : "")
          }
          onClick={() => setTab("shops")}
        >
          店铺（{shops.length}）
        </button>
      </div>

      <div className="shopv2-scroll">
        {tab === "products" ? (
          <>
            <div className="shopv2-manage-bar">
              <button
                type="button"
                className="shopv2-manage-btn"
                onClick={() => {
                  if (shops.length === 0) {
                    window.alert("先去店铺 tab 建一个店铺");
                    return;
                  }
                  setNewProductShopId(shops[0].id);
                }}
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>手加商品</span>
              </button>
              <button
                type="button"
                className="shopv2-manage-btn primary"
                onClick={() => {
                  if (shops.length === 0) {
                    window.alert("先去店铺 tab 建一个店铺");
                    return;
                  }
                  setShowAi(shops[0].id);
                }}
              >
                <Sparkles size={14} strokeWidth={2.6} />
                <span>AI 生成</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="shopv2-empty">
                <div className="shopv2-empty-title">
                  还没有商品
                </div>
              </div>
            ) : (
              <div className="shopv2-manage-list">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="shopv2-manage-row"
                    onClick={() => setEditProduct(p)}
                  >
                    <div className="shopv2-manage-row-emoji">
                      {p.emoji}
                    </div>
                    <div className="shopv2-manage-row-info">
                      <div className="shopv2-manage-row-name">
                        {p.name}
                      </div>
                      <div className="shopv2-manage-row-sub">
                        {shopNameOf(p.shopId)} · ¥
                        {p.price}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="shopv2-manage-bar">
              <button
                type="button"
                className="shopv2-manage-btn"
                onClick={() => setShowNewShop(true)}
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>新建店铺</span>
              </button>
            </div>

            {shops.length === 0 ? (
              <div className="shopv2-empty">
                <div className="shopv2-empty-title">
                  还没有店铺
                </div>
              </div>
            ) : (
              <div className="shopv2-manage-list">
                {shops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="shopv2-manage-row"
                    onClick={() => setEditShop(s)}
                  >
                    <div className="shopv2-manage-row-emoji">
                      {s.emoji}
                    </div>
                    <div className="shopv2-manage-row-info">
                      <div className="shopv2-manage-row-name">
                        {s.name}
                      </div>
                      <div className="shopv2-manage-row-sub">
                        {s.category} · ⭐{" "}
                        {s.rating.toFixed(1)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ height: 40 }} />
      </div>

      {editProduct && (
        <ProductEditorSheet
          kind={kind}
          shopId={editProduct.shopId}
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={(p) => {
            upsertProduct(p);
            setEditProduct(null);
          }}
          onDelete={() => {
            deleteProduct(editProduct.id);
            setEditProduct(null);
          }}
        />
      )}

      {newProductShopId && (
        <ProductEditorSheet
          kind={kind}
          shopId={newProductShopId}
          product={null}
          onClose={() => setNewProductShopId(null)}
          onSave={(p) => {
            upsertProduct(p);
            setNewProductShopId(null);
          }}
        />
      )}

      {editShop && (
        <ShopEditorSheet
          kind={kind}
          shop={editShop}
          onClose={() => setEditShop(null)}
          onSave={(s) => {
            upsertShop(s);
            setEditShop(null);
          }}
          onDelete={() => {
            deleteShop(editShop.id);
            setEditShop(null);
          }}
        />
      )}

      {showNewShop && (
        <ShopEditorSheet
          kind={kind}
          shop={null}
          onClose={() => setShowNewShop(false)}
          onSave={(s) => {
            upsertShop(s);
            setShowNewShop(false);
          }}
        />
      )}

      {showAi && (
        <AiGenerateSheet
          kind={kind}
          shopId={showAi}
          onClose={() => setShowAi(null)}
          onConfirm={(list) => {
            for (const p of list) upsertProduct(p);
          }}
        />
      )}
    </div>
  );
}