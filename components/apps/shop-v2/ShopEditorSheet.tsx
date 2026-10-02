"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createShopId,
  type Shop,
  type ShopKind,
} from "@/data/shopV2";

type Props = {
  kind: ShopKind;
  /** null = 新建 */
  shop: Shop | null;
  onClose: () => void;
  onSave: (s: Shop) => void;
  onDelete?: () => void;
};

export default function ShopEditorSheet({
  kind,
  shop,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState(shop?.name ?? "");
  const [emoji, setEmoji] = useState(shop?.emoji ?? "🏠");
  const [description, setDescription] = useState(
    shop?.description ?? ""
  );
  const [category, setCategory] = useState(
    shop?.category ?? ""
  );
  const [deliveryTime, setDeliveryTime] = useState(
    shop?.deliveryTime ?? "1-3 天"
  );
  const [tagsStr, setTagsStr] = useState(
    (shop?.tags ?? []).join(", ")
  );

  function handleSave() {
    if (!name.trim()) {
      window.alert("请输入店铺名");
      return;
    }
    onSave({
      id: shop?.id ?? createShopId(),
      kind: shop?.kind ?? kind,
      ownerId: shop?.ownerId ?? "you",
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || "杂货",
      emoji: emoji.trim() || "🏠",
      logoId: shop?.logoId,
      bannerId: shop?.bannerId,
      rating: shop?.rating ?? 4.9,
      deliveryTime: deliveryTime.trim() || "1-3 天",
      tags: tagsStr
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      enabled: shop?.enabled ?? true,
      custom: true,
      createdAt: shop?.createdAt ?? Date.now(),
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
          <span>{shop ? "编辑店铺" : "新建店铺"}</span>
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
            <div className="shopv2-addr-label">店名</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="比如：午后杂货铺"
              maxLength={30}
            />
          </div>
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">简介</div>
          <textarea
            className="shopv2-addr-textarea"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="一句话简介"
            rows={2}
            maxLength={80}
          />
        </div>

        <div className="shopv2-addr-row">
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">分类</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              placeholder="杂货 / 奶茶 / …"
              maxLength={12}
            />
          </div>
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">配送时间</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={deliveryTime}
              onChange={(e) =>
                setDeliveryTime(e.target.value)
              }
              placeholder="1-3 天 / 30 分钟"
              maxLength={20}
            />
          </div>
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
            placeholder="温柔, 日常"
          />
        </div>

        <div className="shopv2-addr-actions">
          {onDelete && (
            <button
              type="button"
              className="shopv2-addr-btn danger"
              onClick={() => {
                if (
                  window.confirm(
                    "删除这家店铺？（该店铺所有商品也会被删除）"
                  )
                )
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