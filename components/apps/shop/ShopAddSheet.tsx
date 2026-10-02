"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createShopItemId,
  type ShopItem,
  type ShopCategory,
} from "@/data/shop";

type Props = {
  category: ShopCategory;
  onClose: () => void;
  onSave: (item: ShopItem) => void;
};

export default function ShopAddSheet({
  category,
  onClose,
  onSave,
}: Props) {
  const [emoji, setEmoji] = useState("🎁");
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");

  function handleSave() {
    const price = parseFloat(priceStr);
    if (!name.trim()) {
      window.alert("请输入商品名");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      window.alert("请输入有效价格");
      return;
    }
    onSave({
      id: createShopItemId(),
      category,
      name: name.trim(),
      emoji: emoji.trim() || "🎁",
      price,
      enabled: true,
      custom: true,
    });
  }

  return (
    <div
      className="wallet-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="wallet-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="wallet-sheet-header">
          <span>添加商品</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="shop-add-emoji-pick">
          {[
            "🎁",
            "🌹",
            "🧸",
            "🍰",
            "☕",
            "👕",
            "📚",
            "💍",
            "🍜",
            "🧋",
            "🍗",
            "🍣",
          ].map((e) => (
            <button
              key={e}
              type="button"
              className={
                "shop-add-emoji-btn" +
                (emoji === e ? " active" : "")
              }
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            Emoji（也可以手输）
          </div>
          <input
            type="text"
            className="wallet-sheet-input"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{ fontSize: 22, textAlign: "center" }}
          />
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">名称</div>
          <input
            type="text"
            className="wallet-sheet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="比如：围巾"
            maxLength={20}
            autoFocus
          />
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">价格</div>
          <div className="wallet-sheet-amount-wrap">
            <span className="wallet-sheet-currency">¥</span>
            <input
              type="number"
              inputMode="decimal"
              className="wallet-sheet-amount"
              value={priceStr}
              onChange={(e) =>
                setPriceStr(e.target.value)
              }
              placeholder="0"
            />
          </div>
        </div>

        <div className="wallet-sheet-actions">
          <button
            type="button"
            className="wallet-sheet-btn primary"
            onClick={handleSave}
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}