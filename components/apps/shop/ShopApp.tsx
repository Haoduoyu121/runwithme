"use client";

import { useEffect, useMemo, useState } from "react";

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

import { getShopImage } from "@/lib/shopItemImages";

import ShopAddSheet from "./ShopAddSheet";
import ShopSendSheet from "./ShopSendSheet";

type Props = {
  onBack: () => void;
  /** 下单回调（由父层处理，含 threadId） */
  onSendGift?: (
    item: ShopItem,
    receiver: "Levi" | "Erwin",
    threadId: import("@/data/chat").ThreadId,
    note: string
  ) => void;
};

export default function ShopApp({
  onBack,
  onSendGift,
}: Props) {
  const [tab, setTab] = useState<ShopCategory>("goods");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [imageUrls, setImageUrls] = useState<
    Record<string, string>
  >({});
  const [showAdd, setShowAdd] = useState(false);
  const [sendTarget, setSendTarget] =
    useState<ShopItem | null>(null);
  const [manage, setManage] = useState(false);

  useEffect(() => {
    setItems(loadShopItems());
  }, []);

  /* 加载图片预览 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const it of items) {
        if (!it.imageId) continue;
        try {
          const blob = await getShopImage(it.imageId);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[it.id] = url;
        } catch (e) {
          console.error("加载商品图失败:", it.imageId, e);
        }
      }
      if (!cancelled) setImageUrls(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [items]);

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

  /* 按 group 分组 */
  const visibleGrouped = useMemo(() => {
    const visible = items.filter(
      (i) => i.category === tab && i.enabled
    );
    const map = new Map<string, ShopItem[]>();
    for (const it of visible) {
      const g = it.group || "其他";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    }
    return Array.from(map.entries());
  }, [items, tab]);

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

        {visibleGrouped.length === 0 ? (
          <div className="shop-empty">
            <div className="shop-empty-title">
              还没有商品
            </div>
            <div className="shop-empty-desc">
              点右上角 ⚙︎ 进入管理，添加商品
            </div>
          </div>
        ) : (
          visibleGrouped.map(([group, list]) => (
            <div key={group} className="shop-group">
              <div className="shop-group-title">
                {group}
              </div>
              <div className="shop-grid">
                {list.map((it) => {
                  const url = imageUrls[it.id];
                  return (
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
                      <div className="shop-item-image">
                        {url ? (
                          <img src={url} alt="" />
                        ) : (
                          <span className="shop-item-emoji">
                            {it.emoji}
                          </span>
                        )}
                      </div>
                      <div className="shop-item-name">
                        {it.name}
                      </div>
                      <div className="shop-item-price">
                        ¥{it.price}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
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
          names={{ levi: "Levi", erwin: "Erwin" }}
          imageUrl={imageUrls[sendTarget.id] ?? null}
          onClose={() => setSendTarget(null)}
          onConfirm={({ receiver, threadId, note }) => {
            if (onSendGift) {
              onSendGift(
                sendTarget,
                receiver,
                threadId,
                note
              );
            } else {
              window.alert("当前不支持下单");
            }
            setSendTarget(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}