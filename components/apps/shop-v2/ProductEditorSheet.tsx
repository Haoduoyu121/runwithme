"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createProductId,
  type ShopProduct,
  type ShopKind,
} from "@/data/shopV2";

type Props = {
  kind: ShopKind;
  shopId: string;
  /** null = 新建 */
  product: ShopProduct | null;
  onClose: () => void;
  onSave: (p: ShopProduct) => void;
  onDelete?: () => void;
};

export default function ProductEditorSheet({
  kind,
  shopId,
  product,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "🎁");
  const [description, setDescription] = useState(
    product?.description ?? ""
  );
  const [category, setCategory] = useState(
    product?.category ?? ""
  );
  const [priceStr, setPriceStr] = useState(
    product?.price ? String(product.price) : ""
  );
  const [tagsStr, setTagsStr] = useState(
    (product?.tags ?? []).join(", ")
  );
  const [originalPriceStr, setOriginalPriceStr] = useState(
    product?.originalPrice
      ? String(product.originalPrice)
      : ""
  );

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
    const originalPrice = originalPriceStr
      ? parseFloat(originalPriceStr)
      : undefined;

    onSave({
      id: product?.id ?? createProductId(),
      shopId: product?.shopId ?? shopId,
      kind: product?.kind ?? kind,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || "其他",
      emoji: emoji.trim() || "🎁",
      imageId: product?.imageId,
      price,
      originalPrice:
        originalPrice && originalPrice > price
          ? originalPrice
          : undefined,
      specs: product?.specs ?? [],
      toppings: product?.toppings,
      tags: tagsStr
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      rating: product?.rating ?? 4.8,
      reviews: product?.reviews ?? [],
      enabled: product?.enabled ?? true,
      custom: true,
      createdAt: product?.createdAt ?? Date.now(),
    });
  }

  return (
    <div
      className="shopv2-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="shopv2-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shopv2-sheet-header">
          <span>{product ? "编辑商品" : "新建商品"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="shopv2-addr-row">
          <div className="shopv2-addr-field" style={{ width: 90 }}>
            <div className="shopv2-addr-label">Emoji</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              style={{ fontSize: 22, textAlign: "center" }}
            />
          </div>
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">名称</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="比如：围巾"
              maxLength={30}
            />
          </div>
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">描述</div>
          <textarea
            className="shopv2-addr-textarea"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="一句话描述"
            rows={2}
            maxLength={120}
          />
        </div>

        <div className="shopv2-addr-row">
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">价格</div>
            <input
              type="number"
              className="shopv2-addr-input"
              value={priceStr}
              onChange={(e) =>
                setPriceStr(e.target.value)
              }
              placeholder="0"
            />
          </div>
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">
              原价（可选）
            </div>
            <input
              type="number"
              className="shopv2-addr-input"
              value={originalPriceStr}
              onChange={(e) =>
                setOriginalPriceStr(e.target.value)
              }
              placeholder="划线价"
            />
          </div>
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">分类</div>
          <input
            type="text"
            className="shopv2-addr-input"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
            placeholder="服饰 / 奶茶 / …"
            maxLength={12}
          />
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">
            标签（逗号分隔）
          </div>
          <input
            type="text"
            className="shopv2-addr-input"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="可爱, 保暖"
          />
        </div>

        <div className="shopv2-addr-actions">
          {onDelete && (
            <button
              type="button"
              className="shopv2-addr-btn danger"
              onClick={() => {
                if (window.confirm("删除这个商品？"))
                  onDelete();
              }}
            >
              删除
            </button>
          )}
          <button
            type="button"
            className="shopv2-addr-btn primary"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}