"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ChevronLeft,
  ShoppingBag,
  ShoppingCart,
  Utensils,
} from "lucide-react";

import type {
  Cart,
  ShopKind,
  ShopOwnerId,
  ShopProduct,
  Shop,
} from "@/data/shopV2";

import {
  createCartItemId,
  calcProductUnitPrice,
} from "@/data/shopV2";
import { createOrderId } from "@/data/order";

import {
  loadShops,
  loadProducts,
  getCart,
  setCart,
  loadShopsByOwner,
  loadProductsByOwner,
  SHOP_V2_EVENT,
} from "@/lib/shopV2Storage";

import { getShopV2Image } from "@/lib/shopV2Images";
import { loadSystemSettings } from "@/lib/systemStorage";

import type { Order } from "@/data/order";
import { upsertOrder } from "@/lib/orderStorage";

import { useChat } from "@/lib/ChatContext";

import ShopHome from "./ShopHome";
import ShopDetail from "./ShopDetail";
import ProductDetail from "./ProductDetail";
import CartSheet from "./CartSheet";
import CheckoutPage from "./CheckoutPage";
import OrdersTab from "./OrdersTab";
import OrderDetail from "./OrderDetail";

type Props = { onBack: () => void };

type TopTab = "shopping" | "food" | "orders";
type View =
  | { kind: "home" }
  | { kind: "shop"; shopId: string }
  | { kind: "product"; productId: string }
  | { kind: "checkout" }
  | { kind: "order"; orderId: string };

export default function ShopV2App({ onBack }: Props) {
  const { sendShopGiftRequest } = useChat();
  const [topTab, setTopTab] = useState<TopTab>("shopping");
  const [ownerId, setOwnerId] =
    useState<ShopOwnerId>("you");
  const [view, setView] = useState<View>({ kind: "home" });
  const [searchText, setSearchText] = useState("");
  const [showCart, setShowCart] = useState(false);

  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>(
    []
  );
  const [cart, setCartState] = useState<Cart>({
    ownerId: "you",
    items: [],
  });
  const [imageUrls, setImageUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const reload = () => {
      setShops(loadShops());
      setProducts(loadProducts());
    };
    reload();
    window.addEventListener(SHOP_V2_EVENT, reload);
    return () => {
      window.removeEventListener(SHOP_V2_EVENT, reload);
    };
  }, []);

  useEffect(() => {
    setCartState(getCart(ownerId));
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const ids = new Set<string>();
      for (const s of shops) {
        if (s.logoId) ids.add(s.logoId);
        if (s.bannerId) ids.add(s.bannerId);
      }
      for (const p of products) {
        if (p.imageId) ids.add(p.imageId);
      }

      const next: Record<string, string> = {};
      for (const id of ids) {
        try {
          const blob = await getShopV2Image(id);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[id] = url;
        } catch {}
      }
      if (!cancelled) setImageUrls(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [shops, products]);

  const currentKind: ShopKind =
    topTab === "food" ? "food" : "goods";

  const visibleShops = useMemo(
    () => loadShopsByOwner(ownerId, currentKind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerId, currentKind, shops]
  );

  const visibleProducts = useMemo(
    () => loadProductsByOwner(ownerId, currentKind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownerId, currentKind, products]
  );

  function handleAddToCart(
    productId: string,
    specSelections: Record<string, string>,
    quantity: number,
    selectedToppings: string[]
  ) {
    const next: Cart = {
      ...cart,
      items: [
        ...cart.items,
        {
          id: createCartItemId(),
          productId,
          specSelections,
          selectedToppings:
            selectedToppings.length > 0
              ? selectedToppings
              : undefined,
          quantity,
          addedAt: Date.now(),
        },
      ],
    };
    setCart(next);
    setCartState(next);
    setView({ kind: "home" });
    setShowCart(true);
  }

  function handleChangeQty(itemId: string, delta: number) {
    const next: Cart = {
      ...cart,
      items: cart.items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              quantity: Math.max(1, it.quantity + delta),
            }
          : it
      ),
    };
    setCart(next);
    setCartState(next);
  }

  function handleDelete(itemId: string) {
    const next: Cart = {
      ...cart,
      items: cart.items.filter((it) => it.id !== itemId),
    };
    setCart(next);
    setCartState(next);
  }

  function shopNameOf(shopId: string): string {
    return shops.find((s) => s.id === shopId)?.name ?? "";
  }

  /* 提交订单 */
  function handleCheckoutConfirm(params: {
    addressId: string;
    buyerId: ShopOwnerId;
    receiverId: ShopOwnerId;
    isGift: boolean;
  }) {
    if (cart.items.length === 0) return;

    const productMap = new Map(
      products.map((p) => [p.id, p])
    );

    /* 找主店铺（取第一个商品的 shopId） */
    const firstProduct = productMap.get(
      cart.items[0].productId
    );
    const shopId = firstProduct?.shopId ?? "";
    const shopName = shopNameOf(shopId);

    const items = cart.items
      .map((it) => {
        const p = productMap.get(it.productId);
        if (!p) return null;
        const unitPrice = calcProductUnitPrice(
          p,
          it.selectedToppings
        );
        return {
          productId: p.id,
          productName: p.name,
          productEmoji: p.emoji,
          productImageId: p.imageId,
          specSelections: it.specSelections,
          selectedToppings: it.selectedToppings,
          quantity: it.quantity,
          price: unitPrice,
        };
      })
      .filter(
        (x): x is NonNullable<typeof x> => x !== null
      );

    const totalPrice = items.reduce(
      (s, it) => s + it.price * it.quantity,
      0
    );

    const order: Order = {
      id: createOrderId(),
      kind: currentKind,
      buyerId: params.buyerId,
      receiverId: params.receiverId,
      isGift: params.isGift,
      shopId,
      shopName,
      items,
      totalPrice,
      addressId: params.addressId,
      status: "active",
      logistics: [
        { stage: "placed", at: Date.now() },
      ],
      review: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    upsertOrder(order);

    /* 清空购物车 */
    const nextCart: Cart = { ...cart, items: [] };
    setCart(nextCart);
    setCartState(nextCart);

    /* 送礼 → 通知 Chat */
    if (
      params.isGift &&
      (params.receiverId === "levi" ||
        params.receiverId === "erwin")
    ) {
      void sendShopGiftRequest(order);
    }

    /* 跳订单详情 */
    setView({ kind: "order", orderId: order.id });
  }

  /* ---------- 二级视图 ---------- */

  if (view.kind === "order") {
    return (
      <main className="phone-screen shopv2-app">
        <OrderDetail
          orderId={view.orderId}
          products={products}
          imageUrls={imageUrls}
          onBack={() => setView({ kind: "home" })}
          onReviewed={() => {
            /* 保持不变，OrderDetail 会自己刷新 */
          }}
        />
      </main>
    );
  }

  if (view.kind === "checkout") {
    const shopsMap: Record<string, string> = {};
    for (const s of shops) shopsMap[s.id] = s.name;

    return (
      <main className="phone-screen shopv2-app">
        <CheckoutPage
          cart={cart}
          products={products}
          shopsMap={shopsMap}
          imageUrls={imageUrls}
          onBack={() => setView({ kind: "home" })}
          onConfirm={handleCheckoutConfirm}
        />
      </main>
    );
  }

  if (view.kind === "product") {
    const p = products.find((x) => x.id === view.productId);
    if (p) {
      const imgUrl = p.imageId
        ? imageUrls[p.imageId]
        : null;
      return (
        <main className="phone-screen shopv2-app">
          <ProductDetail
            product={p}
            shopName={shopNameOf(p.shopId)}
            imageUrl={imgUrl}
            onBack={() => setView({ kind: "home" })}
            onAddToCart={(selections, qty, toppings) =>
              handleAddToCart(
                p.id,
                selections,
                qty,
                toppings
              )
            }
          />
          {showCart && (
            <CartSheet
              cart={cart}
              products={products}
              imageUrls={imageUrls}
              onClose={() => setShowCart(false)}
              onToggleSelect={() => {}}
              onChangeQty={handleChangeQty}
              onDelete={handleDelete}
              onCheckout={() => {
                setShowCart(false);
                setView({ kind: "checkout" });
              }}
            />
          )}
        </main>
      );
    }
  }

  if (view.kind === "shop") {
    const s = shops.find((x) => x.id === view.shopId);
    if (s) {
      const shopProducts = products.filter(
        (p) => p.shopId === s.id && p.enabled
      );
      return (
        <main className="phone-screen shopv2-app">
          <ShopDetail
            shop={s}
            products={shopProducts}
            imageUrls={imageUrls}
            onBack={() => setView({ kind: "home" })}
            onOpenProduct={(pid) =>
              setView({ kind: "product", productId: pid })
            }
          />
          {showCart && (
            <CartSheet
              cart={cart}
              products={products}
              imageUrls={imageUrls}
              onClose={() => setShowCart(false)}
              onToggleSelect={() => {}}
              onChangeQty={handleChangeQty}
              onDelete={handleDelete}
              onCheckout={() => {
                setShowCart(false);
                setView({ kind: "checkout" });
              }}
            />
          )}
        </main>
      );
    }
  }

  /* ---------- 主视图 ---------- */

  const cartCount = cart.items.reduce(
    (s, it) => s + it.quantity,
    0
  );

  return (
    <main className="phone-screen shopv2-app">
      <header className="shopv2-topbar">
        <button
          type="button"
          className="shopv2-topbar-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="shopv2-topbar-title">购物</div>
        <button
          type="button"
          className="shopv2-topbar-cart"
          onClick={() => setShowCart(true)}
          aria-label="购物车"
        >
          <ShoppingCart size={22} strokeWidth={2.2} />
          {cartCount > 0 && (
            <span className="shopv2-cart-badge">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </header>

      <div className="shopv2-top-tabs">
        <button
          type="button"
          className={
            "shopv2-top-tab" +
            (topTab === "shopping" ? " active" : "")
          }
          onClick={() => {
            setTopTab("shopping");
            setView({ kind: "home" });
            setSearchText("");
          }}
        >
          <ShoppingBag size={16} strokeWidth={2.2} />
          <span>购物</span>
        </button>
        <button
          type="button"
          className={
            "shopv2-top-tab" +
            (topTab === "food" ? " active" : "")
          }
          onClick={() => {
            setTopTab("food");
            setView({ kind: "home" });
            setSearchText("");
          }}
        >
          <Utensils size={16} strokeWidth={2.2} />
          <span>外卖</span>
        </button>
        <button
          type="button"
          className={
            "shopv2-top-tab" +
            (topTab === "orders" ? " active" : "")
          }
          onClick={() => {
            setTopTab("orders");
            setView({ kind: "home" });
          }}
        >
          <span>订单</span>
        </button>
      </div>

      {topTab !== "orders" && (
        <div className="shopv2-owner-tabs">
          {(["you", "levi", "erwin"] as ShopOwnerId[]).map(
            (o) => {
              const label =
                o === "you"
                  ? "我"
                  : o === "levi"
                    ? "Levi"
                    : "Erwin";
              return (
                <button
                  key={o}
                  type="button"
                  className={
                    "shopv2-owner-tab" +
                    (ownerId === o ? " active" : "")
                  }
                  onClick={() => {
                    setOwnerId(o);
                    setView({ kind: "home" });
                  }}
                >
                  {label}
                </button>
              );
            }
          )}
        </div>
      )}

      {topTab === "orders" ? (
        <>
          <div className="shopv2-owner-tabs">
            {(["you", "levi", "erwin"] as ShopOwnerId[]).map(
              (o) => {
                const label =
                  o === "you"
                    ? "我"
                    : o === "levi"
                      ? "Levi"
                      : "Erwin";
                return (
                  <button
                    key={o}
                    type="button"
                    className={
                      "shopv2-owner-tab" +
                      (ownerId === o ? " active" : "")
                    }
                    onClick={() => setOwnerId(o)}
                  >
                    {label}
                  </button>
                );
              }
            )}
          </div>
          <OrdersTab
            ownerId={ownerId}
            products={products}
            imageUrls={imageUrls}
            onOpenOrder={(oid) =>
              setView({ kind: "order", orderId: oid })
            }
          />
        </>
      ) : ownerId !== "you" ? (
        <div className="shopv2-scroll">
          <div className="shopv2-empty">
            <div className="shopv2-empty-title">
              {ownerId === "levi" ? "Levi" : "Erwin"} 的
              {topTab === "food" ? "外卖" : "商城"}
            </div>
            <div className="shopv2-empty-desc">
              这个视角会展示角色浏览 / 购买过的商品。
              将在 AI 商品生成 + 角色意图那一批实现。
            </div>
          </div>
        </div>
      ) : (
        <ShopHome
          kind={currentKind}
          ownerId={ownerId}
          shops={visibleShops}
          products={visibleProducts}
          imageUrls={imageUrls}
          searchText={searchText}
          onSearchChange={setSearchText}
          onOpenShop={(sid) =>
            setView({ kind: "shop", shopId: sid })
          }
          onOpenProduct={(pid) =>
            setView({ kind: "product", productId: pid })
          }
        />
      )}

      {showCart && (
        <CartSheet
          cart={cart}
          products={products}
          imageUrls={imageUrls}
          onClose={() => setShowCart(false)}
          onToggleSelect={() => {}}
          onChangeQty={handleChangeQty}
          onDelete={handleDelete}
          onCheckout={() => {
            setShowCart(false);
            setView({ kind: "checkout" });
          }}
        />
      )}
    </main>
  );
}