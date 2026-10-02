"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

import {
  createShopItemId,
  defaultGroupFor,
  groupsFor,
  type ShopItem,
  type ShopCategory,
} from "@/data/shop";

import { saveShopImage } from "@/lib/shopItemImages";
import { compressImage } from "@/lib/imageCompress";

type Props = {
  category: ShopCategory;
  onClose: () => void;
  onSave: (item: ShopItem) => void;
};

const EMOJI_PRESETS = [
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
];

export default function ShopAddSheet({
  category,
  onClose,
  onSave,
}: Props) {
  const [emoji, setEmoji] = useState("🎁");
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [group, setGroup] = useState(
    defaultGroupFor(category)
  );
  const [imageBlob, setImageBlob] = useState<Blob | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<
    string | null
  >(null);

  const groups = groupsFor(category);

  async function handlePickImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    const compressed = await compressImage(file, 800, 0.85);
    setImageBlob(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  async function handleSave() {
    const price = parseFloat(priceStr);
    if (!name.trim()) {
      window.alert("请输入商品名");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      window.alert("请输入有效价格");
      return;
    }

    const id = createShopItemId();
    let imageId: string | undefined;

    if (imageBlob) {
      imageId = `shopimg-${id}`;
      await saveShopImage(imageId, imageBlob);
    }

    onSave({
      id,
      category,
      group,
      name: name.trim(),
      emoji: emoji.trim() || "🎁",
      imageId,
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

        {/* 图片上传 */}
        <div className="shop-add-image-row">
          <label className="shop-add-image-preview">
            {imagePreview ? (
              <img src={imagePreview} alt="" />
            ) : (
              <div className="shop-add-image-placeholder">
                <ImagePlus size={24} strokeWidth={1.8} />
                <span>上传图片</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="ios-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePickImage(file);
                e.target.value = "";
              }}
            />
          </label>

          <div className="shop-add-image-hint">
            <div>不传图片时，用 emoji 当占位</div>
            {imagePreview && (
              <button
                type="button"
                className="shop-add-image-clear"
                onClick={() => {
                  setImageBlob(null);
                  if (imagePreview)
                    URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                }}
              >
                移除图片
              </button>
            )}
          </div>
        </div>

        {/* 分类 */}
        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">分类</div>
          <div className="shop-add-group-wrap">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                className={
                  "shop-add-group-chip" +
                  (group === g ? " active" : "")
                }
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji */}
        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            Emoji（也可以手输）
          </div>
          <div className="shop-add-emoji-pick">
            {EMOJI_PRESETS.map((e) => (
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
          <input
            type="text"
            className="wallet-sheet-input"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{
              fontSize: 22,
              textAlign: "center",
              marginTop: 8,
            }}
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
            onClick={() => void handleSave()}
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}