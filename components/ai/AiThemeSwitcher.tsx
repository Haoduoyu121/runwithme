"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  THEMES,
  loadTheme,
  saveTheme,
  loadCustom,
  saveCustom,
  type AiThemeId,
  type CustomVars,
} from "@/lib/ai/theme";

const FONTS: { id: string; label: string; value: string }[] = [
  {
    id: "serif",
    label: "宋体",
    value: '"Songti SC", "Noto Serif SC", Georgia, serif',
  },
  {
    id: "sans",
    label: "黑体",
    value:
      '-apple-system, "PingFang SC", "Helvetica Neue", sans-serif',
  },
  {
    id: "mono",
    label: "等宽",
    value: '"SF Mono", Menlo, Consolas, monospace',
  },
];

export default function AiThemeSwitcher({
  onClose,
}: {
  onClose: () => void;
}) {
  const [themeId, setThemeId] = useState<AiThemeId>("library");
  const [custom, setCustom] = useState<CustomVars>({});

  useEffect(() => {
    setThemeId(loadTheme());
    setCustom(loadCustom());
  }, []);

  function pick(id: AiThemeId) {
    setThemeId(id);
    saveTheme(id);
    window.dispatchEvent(new Event("ai-theme-update"));
  }

  function patchCustom(p: Partial<CustomVars>) {
    const next = { ...custom, ...p };
    setCustom(next);
    saveCustom(next);
    window.dispatchEvent(new Event("ai-theme-update"));
  }

  function resetCustom() {
    saveCustom({});
    setCustom({});
    window.dispatchEvent(new Event("ai-theme-update"));
  }

  return (
    <div className="ai-theme-backdrop" onClick={onClose}>
      <div
        className="ai-theme-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            className="ai-theme-title"
            style={{ flex: 1, marginBottom: 0 }}
          >
            外观
          </div>
          <button
            className="ai-icon-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="ai-theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={
                "ai-theme-card" +
                (themeId === t.id ? " active" : "")
              }
              onClick={() => pick(t.id)}
            >
              <div
                className="ai-theme-swatch"
                style={{
                  background: `linear-gradient(135deg, ${t.swatch[0]} 0%, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%, ${t.swatch[1]} 100%)`,
                }}
              />
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                {t.desc}
              </div>
            </button>
          ))}
        </div>

        <div className="ai-theme-title">微调</div>

        <div className="ai-field">
          <label className="ai-field-label">主色</label>
          <input
            type="color"
            className="ai-input"
            style={{ padding: 4, height: 40 }}
            value={custom.accent || "#8b6b3d"}
            onChange={(e) =>
              patchCustom({ accent: e.target.value })
            }
          />
        </div>

        <div className="ai-field">
          <label className="ai-field-label">背景色</label>
          <input
            type="color"
            className="ai-input"
            style={{ padding: 4, height: 40 }}
            value={custom.bg || "#f4ecd8"}
            onChange={(e) => patchCustom({ bg: e.target.value })}
          />
        </div>

        <div className="ai-field">
          <label className="ai-field-label">字体</label>
          <div style={{ display: "flex", gap: 8 }}>
            {FONTS.map((f) => (
              <button
                key={f.id}
                className={
                  "ai-btn" +
                  (custom.font === f.value ? " primary" : "")
                }
                style={{ flex: 1, height: 38, fontSize: 13 }}
                onClick={() => patchCustom({ font: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ai-field">
          <label className="ai-field-label">
            圆角 {custom.radius || "默认"}
          </label>
          <input
            type="range"
            min={0}
            max={24}
            value={parseInt(custom.radius || "6", 10)}
            onChange={(e) =>
              patchCustom({ radius: `${e.target.value}px` })
            }
            style={{ width: "100%" }}
          />
        </div>

        <button
          className="ai-btn"
          style={{ width: "100%", marginTop: 8 }}
          onClick={resetCustom}
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}