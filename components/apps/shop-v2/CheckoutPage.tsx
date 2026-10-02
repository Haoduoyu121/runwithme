"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, MapPin, Plus } from "lucide-react";

import type { Address } from "@/data/address";
import {
  loadAddressesByOwner,
  getDefaultAddress,
} from "@/lib/addressStorage";

import {
  calcProductUnitPrice,
  type Cart,
  type ShopProduct,
  type ShopOwnerId,
} from "@/data/shopV2";

import AddressPickerSheet from "./AddressPickerSheet";

type Props = {
  cart: Cart;
  products: ShopProduct[];
  shopsMap: Record<string, string>;
  imageUrls: Record<string, string>;
  onBack: () => void;
  onConfirm: (params: {
    addressId: string | null;
    buyerId: ShopOwnerId;
    receiverId: ShopOwnerId;
    isGift: boolean;
  }) => void;
};

type ReceiverChoice = "you" | "levi" | "erwin";

export default function CheckoutPage({
  cart,
  products,
  imageUrls,
  onBack,
  onConfirm,
}: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(null);
  const [showAddressPicker, setShowAddressPicker] =
    useState(false);
  const [receiver, setReceiver] =
    useState<ReceiverChoice>("you");

  useEffect(() => {
    if (receiver !== "you") {
      /* 送角色：不用地址 */
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }
    const list = loadAddressesByOwner("you");
    setAddresses(list);
    const def = getDefaultAddress("you");
    setSelectedAddressId(def?.id ?? null);
  }, [receiver]);

  const productMap = new Map(
    products.map((p) => [p.id, p])
  );

  const total = cart.items.reduce((sum, it) => {
    const p = productMap.get(it.productId);
    if (!p) return sum;
    return (
      sum +
      calcProductUnitPrice(p, it.selectedToppings) *
        it.quantity
    );
  }, 0);

  const selectedAddress = addresses.find(
    (a) => a.id === selectedAddressId
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
        <div className="shopv2-topbar-title">确认订单</div>
        <div className="shopv2-topbar-spacer" />
      </header>

      <div className="shopv2-scroll">
        <div className="shopv2-checkout-block">
          <div className="shopv2-checkout-block-title">
            送给谁
          </div>
          <div className="shopv2-checkout-receiver-row">
            {(
              [
                { v: "you" as const, label: "我自己" },
                { v: "levi" as const, label: "Levi" },
                { v: "erwin" as const, label: "Erwin" },
              ]
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                className={
                  "shopv2-checkout-receiver" +
                  (receiver === opt.v ? " active" : "")
                }
                onClick={() => setReceiver(opt.v)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {receiver !== "you" && (
            <div className="shopv2-checkout-hint">
              对方会收到一条"礼物请求"，接受后才会发货
            </div>
          )}
        </div>

        <div className="shopv2-checkout-block">
          <div className="shopv2-checkout-block-header">
            <div className="shopv2-checkout-block-title">
              收货地址
            </div>
            {receiver === "you" && (
              <button
                type="button"
                className="shopv2-checkout-add-addr"
                onClick={() => setShowAddressPicker(true)}
              >
                <MapPin size={14} strokeWidth={2.4} />
                <span>切换</span>
              </button>
            )}
          </div>

          {receiver !== "you" ? (
            <div className="shopv2-checkout-hint">
              收件方会在接受礼物后提供自己的地址
            </div>
          ) : selectedAddress ? (
            <div className="shopv2-checkout-addr">
              <div className="shopv2-checkout-addr-name">
                <span>{selectedAddress.name}</span>
                {selectedAddress.phone && (
                  <span className="shopv2-checkout-addr-phone">
                    {selectedAddress.phone}
                  </span>
                )}
                {selectedAddress.isDefault && (
                  <span className="shopv2-checkout-addr-default">
                    默认
                  </span>
                )}
              </div>
              <div className="shopv2-checkout-addr-detail">
                {selectedAddress.city}
                {selectedAddress.district
                  ? " · " + selectedAddress.district
                  : ""}
                {selectedAddress.city ||
                selectedAddress.district
                  ? " "
                  : ""}
                {selectedAddress.detail}
              </div>
            </div>
          ) : (
            <div className="shopv2-checkout-empty-addr">
              <div>还没有地址</div>
              <button
                type="button"
                className="shopv2-checkout-add-btn"
                onClick={() =>
                  setShowAddressPicker(true)
                }
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>新建地址</span>
              </button>
            </div>
          )}
        </div>

        <div className="shopv2-checkout-block">
          <div className="shopv2-checkout-block-title">
            商品清单
          </div>
          <div className="shopv2-checkout-items">
            {cart.items.map((it) => {
              const p = productMap.get(it.productId);
              if (!p) return null;
              const imgUrl = p.imageId
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
              const unitPrice = calcProductUnitPrice(
                p,
                it.selectedToppings
              );
              return (
                <div
                  key={it.id}
                  className="shopv2-checkout-item"
                >
                  <div className="shopv2-checkout-item-image">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" />
                    ) : (
                      <span className="shopv2-checkout-item-emoji">
                        {p.emoji}
                      </span>
                    )}
                  </div>
                  <div className="shopv2-checkout-item-info">
                    <div className="shopv2-checkout-item-name">
                      {p.name}
                    </div>
                    {specText && (
                      <div className="shopv2-checkout-item-spec">
                        {specText}
                      </div>
                    )}
                    {toppingText && (
                      <div className="shopv2-checkout-item-spec">
                        {toppingText}
                      </div>
                    )}
                    <div className="shopv2-checkout-item-price">
                      ¥{unitPrice} × {it.quantity}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 100 }} />
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
          disabled={
            receiver === "you" && !selectedAddressId
          }
          onClick={() => {
            if (receiver === "you" && !selectedAddressId) {
              window.alert("请先选择收货地址");
              return;
            }
            onConfirm({
              addressId:
                receiver === "you"
                  ? selectedAddressId
                  : null,
              buyerId: "you",
              receiverId: receiver,
              isGift: receiver !== "you",
            });
          }}
          style={
            receiver === "you" && !selectedAddressId
              ? { opacity: 0.4, cursor: "not-allowed" }
              : undefined
          }
        >
          提交订单
        </button>
      </div>

      {showAddressPicker && (
        <AddressPickerSheet
          ownerId={receiver}
          addresses={addresses}
          selectedId={selectedAddressId}
          onClose={() => setShowAddressPicker(false)}
          onPick={(id) => {
            setSelectedAddressId(id);
            setShowAddressPicker(false);
          }}
        />
      )}
    </div>
  );
}