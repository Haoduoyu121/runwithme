"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

import type { ShopKind } from "@/data/shopV2";
import {
  draftToProduct,
  draftToShop,
  generateShopBundle,
  type GeneratedShopBundle,
} from "@/lib/aiProductGenerator";
import {
  upsertProduct,
  upsertShop,
} from "@/lib/shopV2Storage";

type Props = {
  kind: ShopKind;
  ownerId: "you" | "levi" | "erwin";
  onClose: () => void;
  onConfirm: () => void;
};

export default function AiGenerateSheet({
  kind,
  ownerId,
  onClose,
  onConfirm,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(6);
  const [priceMin, setPriceMin] = useState(20);
  const [priceMax, setPriceMax] = useState(200);

  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] =
    useState<GeneratedShopBundle | null>(null);
  const [err, setErr] = useState("");

  async function handleGenerate() {
    if (!prompt.trim()) {
      window.alert("请填写需求描述");
      return;
    }
    setLoading(true);
    setErr("");
    setBundle(null);
    try {
      const b = await generateShopBundle({
        kind,
        prompt: prompt.trim(),
        productCount: count,
        priceMin,
        priceMax,
      });
      if (b.products.length === 0) {
        setErr("AI 没返回有效商品，请重试");
      } else {
        setBundle(b);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!bundle) return;
    const shop = draftToShop(bundle.shop, kind, ownerId);
    upsertShop(shop);
    for (const p of bundle.products) {
      upsertProduct(draftToProduct(p, kind, shop.id));
    }
    onConfirm();
    onClose();
  }

  function removeDraft(idx: number) {
    if (!bundle) return;
    setBundle({
      ...bundle,
      products: bundle.products.filter((_, i) => i !== idx),
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
        style={{ maxHeight: "92vh" }}
      >
        <header className="shopv2-sheet-header">
          <span>✦ AI 生成店铺 + 商品</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        {!bundle ? (
          <>
            <div className="shopv2-addr-field">
              <div className="shopv2-addr-label">
                想要什么（关键词 / 描述）
              </div>
              <textarea
                className="shopv2-addr-textarea"
                value={prompt}
                onChange={(e) =>
                  setPrompt(e.target.value)
                }
                placeholder={
                  kind === "food"
                    ? "比如：深夜能送到的热食，适合加班"
                    : "比如：适合秋天的家居用品，温柔简约"
                }
                rows={3}
                maxLength={200}
              />
              <div className="potato-hint">
                提示词可在 生姜土豆 → 通用 → AI 提示词
                里修改
              </div>
            </div>

            <div className="shopv2-addr-row">
              <div
                className="shopv2-addr-field"
                style={{ flex: 1 }}
              >
                <div className="shopv2-addr-label">商品数</div>
                <input
                  type="number"
                  className="shopv2-addr-input"
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.max(
                        1,
                        Math.min(
                          12,
                          Number(e.target.value) || 1
                        )
                      )
                    )
                  }
                  min={1}
                  max={12}
                />
              </div>
              <div
                className="shopv2-addr-field"
                style={{ flex: 1 }}
              >
                <div className="shopv2-addr-label">
                  价格下限
                </div>
                <input
                  type="number"
                  className="shopv2-addr-input"
                  value={priceMin}
                  onChange={(e) =>
                    setPriceMin(
                      Number(e.target.value) || 1
                    )
                  }
                />
              </div>
              <div
                className="shopv2-addr-field"
                style={{ flex: 1 }}
              >
                <div className="shopv2-addr-label">
                  价格上限
                </div>
                <input
                  type="number"
                  className="shopv2-addr-input"
                  value={priceMax}
                  onChange={(e) =>
                    setPriceMax(
                      Number(e.target.value) || 1
                    )
                  }
                />
              </div>
            </div>

            {err && (
              <div
                style={{
                  fontSize: 12,
                  color: "#ff3b30",
                  padding: 8,
                  lineHeight: 1.5,
                }}
              >
                {err}
              </div>
            )}

            <button
              type="button"
              className="shopv2-addr-btn primary"
              onClick={handleGenerate}
              disabled={loading}
              style={
                loading
                  ? { opacity: 0.5, cursor: "wait" }
                  : undefined
              }
            >
              <Sparkles
                size={14}
                strokeWidth={2.4}
                style={{
                  display: "inline",
                  marginRight: 6,
                  verticalAlign: -2,
                }}
              />
              {loading ? "生成中…" : "生成"}
            </button>
          </>
        ) : (
          <>
            {/* 店铺 */}
            <div className="shopv2-ai-shop">
              <div className="shopv2-ai-shop-emoji">
                {bundle.shop.emoji}
              </div>
              <div className="shopv2-ai-shop-info">
                <div className="shopv2-ai-shop-name">
                  {bundle.shop.name}
                </div>
                <div className="shopv2-ai-shop-desc">
                  {bundle.shop.description}
                </div>
                <div className="shopv2-ai-shop-meta">
                  {bundle.shop.category}
                  {bundle.shop.tags.length > 0 && " · "}
                  {bundle.shop.tags.join(" · ")}
                </div>
              </div>
            </div>

            <div className="shopv2-addr-label">
              商品（{bundle.products.length}，可逐条删除）
            </div>

            <div className="shopv2-ai-list">
              {bundle.products.map((d, i) => (
                <div key={i} className="shopv2-ai-item">
                  <div className="shopv2-ai-item-emoji">
                    {d.emoji}
                  </div>
                  <div className="shopv2-ai-item-info">
                    <div className="shopv2-ai-item-name">
                      {d.name}
                    </div>
                    <div className="shopv2-ai-item-desc">
                      {d.description}
                    </div>
                    <div className="shopv2-ai-item-meta">
                      ¥{d.price} · {d.category}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shopv2-ai-item-del"
                    onClick={() => removeDraft(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="shopv2-addr-actions">
              <button
                type="button"
                className="shopv2-addr-btn"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  color: "#333",
                }}
                onClick={handleGenerate}
                disabled={loading}
              >
                重新生成
              </button>
              <button
                type="button"
                className="shopv2-addr-btn primary"
                disabled={bundle.products.length === 0}
                onClick={handleConfirm}
                style={
                  bundle.products.length === 0
                    ? { opacity: 0.4 }
                    : undefined
                }
              >
                加入商城
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}