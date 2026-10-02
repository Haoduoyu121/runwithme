"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  Plus,
  Settings2,
} from "lucide-react";

import type {
  ShopCategory,
  ShopItem,
} from "@/data/shop";

import {
  loadShopItems,
  saveShopItems,
  resetShopItems,
} from "@/lib/shopStorage";

import ShopAddSheet from "./ShopAddSheet";
import ShopSendSheet from "./ShopSendSheet";

type Props = {
  onBack: () => void;
  /** 由 ChatApp 传入——用于下单时发礼物消息 */
  onSendGift?: (
    item: ShopItem,
    receiver: "Levi" | "Erwin",
    note: string
  ) => void;
};

export default function ShopApp({
  onBack,
  onSendGift,
}: Props) {
  const [tab, setTab] = useState<ShopCategory>("goods");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [sendTarget, setSendTarget] =
    useState<ShopItem | null>(null);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    setItems(loadShopItems());
  }, []);

  function refresh() {
    setItems(loadShopItems());
  }

  function handleAdd(item: ShopItem) {
    const next = [...loadShopItems(), item];
    saveShopItems(next);
    setItems(next);
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    if (!window.confirm("删除这个商品？")) return;
    const next = loadShopItems().filter((i) => i.id !== id);
    saveShopItems(next);
    setItems(next);
  }

  function handleReset() {
    if (!window.confirm("恢复默认商品？（自定义商品会丢失）"))
      return;
    const d = resetShopItems();
    setItems(d);
  }

  const visible = items.filter(
    (i) => i.category === tab && i.enabled
  );

  return (
    <main className="phone-screen shop-app">
      <header className="shop-header">
        <button
          type="button"
          className="shop-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="shop-title">购物</div>
        <button
          type="button"
          className="shop-action"
          onClick={() => setManage((m) => !m)}
          aria-label="管理"
        >
          <Settings2 size={20} strokeWidth={2.2} />
        </button>
      </header>

      <div className="shop-tabs">
        <button
          type="button"
          className={tab === "goods" ? "active" : ""}
          onClick={() => setTab("goods")}
        >
          商场
        </button>
        <button
          type="button"
          className={tab === "food" ? "active" : ""}
          onClick={() => setTab("food")}
        >
          外卖
        </button>
      </div>

      <div className="shop-scroll">
        {manage && (
          <div className="shop-manage-bar">
            <button
              type="button"
              className="shop-manage-btn"
              onClick={() => setShowAdd(true)}
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>添加商品</span>
            </button>
            <button
              type="button"
              className="shop-manage-btn ghost"
              onClick={handleReset}
            >
              恢复默认
            </button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="shop-empty">
            <div className="shop-empty-title">
              还没有商品
            </div>
            <div className="shop-empty-desc">
              点右上角 ⚙︎ 进入管理，添加商品
            </div>
          </div>
        ) : (
          <div className="shop-grid">
            {visible.map((it) => (
              <button
                key={it.id}
                type="button"
                className="shop-item"
                onClick={() => {
                  if (manage) {
                    handleDelete(it.id);
                  } else {
                    setSendTarget(it);
                  }
                }}
              >
                <div className="shop-item-emoji">
                  {it.emoji}
                </div>
                <div className="shop-item-name">
                  {it.name}
                </div>
                <div className="shop-item-price">
                  ¥{it.price}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <ShopAddSheet
          category={tab}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}

      {sendTarget && (
        <ShopSendSheet
          item={sendTarget}
          lockedReceiver={null}
          names={{ levi: "Levi", erwin: "Erwin" }}
          onClose={() => setSendTarget(null)}
          onConfirm={({ receiver, note }) => {
            if (onSendGift) {
              onSendGift(sendTarget, receiver, note);
            } else {
              window.alert(
                "当前不支持下单（需要通过 Chat 打开购物 App）"
              );
            }
            setSendTarget(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}