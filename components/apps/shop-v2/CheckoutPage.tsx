"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  MapPin,
  Plus,
} from "lucide-react";

import type { Address } from "@/data/address";
import {
  loadAddressesByOwner,
  getDefaultAddress,
  upsertAddress,
} from "@/lib/addressStorage";

import type {
  Cart,
  ShopProduct,
  ShopOwnerId,
} from "@/data/shopV2";

import AddressSheet from "./AddressSheet";

type Props = {
  cart: Cart;
  products: ShopProduct[];
  shopsMap: Record<string, string>; // shopId → shopName
  imageUrls: Record<string, string>;
  onBack: () => void;
  onConfirm: (params: {
    addressId: string;
    buyerId: ShopOwnerId;
    receiverId: ShopOwnerId;
    isGift: boolean;
  }) => void;
};

type ReceiverChoice = "you" | "levi" | "erwin";

export default function CheckoutPage({
  cart,
  products,
  shopsMap,
  imageUrls,
  onBack,
  onConfirm,
}: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState<string | null>(null);
  const [showAddressPicker, setShowAddressPicker] =
    useState(false);
  const [editingAddress, setEditingAddress] =
    useState<Address | null>(null);
  const [receiver, setReceiver] =
    useState<ReceiverChoice>("you");

  const buyerId: ShopOwnerId = "you";

  /* 加载地址（送给自己 → 用户地址；送角色 → 角色地址） */
  useEffect(() => {
    const ownerId: ShopOwnerId = receiver;
    const list = loadAddressesByOwner(ownerId);
    setAddresses(list);

    const def = getDefaultAddress(ownerId);
    setSelectedAddressId(def?.id ?? null);
  }, [receiver]);

  const productMap = new Map(
    products.map((p) => [p.id, p])
  );

  const total = cart.items.reduce((sum, it) => {
    const p = productMap.get(it.productId);
    return sum + (p ? p.price * it.quantity : 0);
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
        {/* 收货对象 */}
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

        {/* 地址 */}
        <div className="shopv2-checkout-block">
          <div className="shopv2-checkout-block-header">
            <div className="shopv2-checkout-block-title">
              收货地址
            </div>
            <button
              type="button"
              className="shopv2-checkout-add-addr"
              onClick={() => setShowAddressPicker(true)}
            >
              <MapPin size={14} strokeWidth={2.4} />
              <span>切换</span>
            </button>
          </div>

          {selectedAddress ? (
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
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressPicker(false);
                  /* 直接打开新建 sheet */
                  setShowAddressPicker(true);
                }}
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>新建地址</span>
              </button>
            </div>
          )}
        </div>

        {/* 商品清单 */}
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
                    <div className="shopv2-checkout-item-price">
                      ¥{p.price} × {it.quantity}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* 底部结算 */}
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
          disabled={!selectedAddressId}
          onClick={() => {
            if (!selectedAddressId) {
              window.alert("请先选择收货地址");
              return;
            }
            onConfirm({
              addressId: selectedAddressId,
              buyerId,
              receiverId: receiver,
              isGift: receiver !== "you",
            });
          }}
          style={
            !selectedAddressId
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
          onNew={() => {
            setEditingAddress(null);
            setShowAddressPicker(false);
          }}
          onEdit={(a) => {
            setEditingAddress(a);
            setShowAddressPicker(false);
          }}
        />
      )}

      {editingAddress !== null || showAddressPicker === false && !addresses.length ? null : null}

      {/* 编辑 / 新建地址 */}
      {editingAddress !== null && (
        <AddressSheet
          ownerId={receiver}
          address={editingAddress}
          onClose={() => setEditingAddress(null)}
          onSave={(addr) => {
            upsertAddress(addr);
            const list = loadAddressesByOwner(receiver);
            setAddresses(list);
            setSelectedAddressId(addr.id);
            setEditingAddress(null);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   地址选择 sheet
   ========================================================= */

function AddressPickerSheet({
  ownerId,
  addresses,
  selectedId,
  onClose,
  onPick,
  onNew,
  onEdit,
}: {
  ownerId: ShopOwnerId;
  addresses: Address[];
  selectedId: string | null;
  onClose: () => void;
  onPick: (id: string) => void;
  onNew: () => void;
  onEdit: (a: Address) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] =
    useState<Address | null>(null);

  return (
    <>
      <div
        className="shopv2-sheet-backdrop"
        onClick={onClose}
      >
        <div
          className="shopv2-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="shopv2-sheet-header">
            <span>选择收货地址</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
            >
              ✕
            </button>
          </header>

          {addresses.length === 0 ? (
            <div className="shopv2-empty">
              <div className="shopv2-empty-title">
                还没有地址
              </div>
            </div>
          ) : (
            <div className="shopv2-addr-list">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={
                    "shopv2-addr-item" +
                    (selectedId === a.id ? " active" : "")
                  }
                  onClick={() => onPick(a.id)}
                >
                  <div className="shopv2-addr-item-main">
                    <div className="shopv2-addr-item-name">
                      {a.name}
                      {a.phone && (
                        <span className="shopv2-addr-item-phone">
                          {a.phone}
                        </span>
                      )}
                      {a.isDefault && (
                        <span className="shopv2-addr-item-default">
                          默认
                        </span>
                      )}
                    </div>
                    <div className="shopv2-addr-item-detail">
                      {a.city}
                      {a.district
                        ? " · " + a.district
                        : ""}
                      {a.detail ? " " + a.detail : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shopv2-addr-item-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTarget(a);
                    }}
                  >
                    编辑
                  </button>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="shopv2-addr-new"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} strokeWidth={2.6} />
            <span>新建地址</span>
          </button>
        </div>
      </div>

      {showNew && (
        <AddressSheet
          ownerId={ownerId}
          address={null}
          onClose={() => setShowNew(false)}
          onSave={(addr) => {
            upsertAddress(addr);
            setShowNew(false);
            onPick(addr.id);
          }}
        />
      )}

      {editTarget && (
        <AddressSheet
          ownerId={ownerId}
          address={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(addr) => {
            upsertAddress(addr);
            setEditTarget(null);
            onPick(addr.id);
          }}
        />
      )}
    </>
  );
}