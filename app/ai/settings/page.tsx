"use client";

import { useEffect, useState } from "react";
import {
  loadConfig,
  saveConfig,
  fetchModels,
  type AiApiConfig,
} from "@/lib/ai/apiClient";

export default function AiSettingsPage() {
  const [cfg, setCfg] = useState<AiApiConfig>({
    baseUrl: "",
    apiKey: "",
    model: "",
  });
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  function save() {
    saveConfig(cfg);
    setMsg("已保存");
    setTimeout(() => setMsg(""), 2000);
  }

  async function pullModels() {
    if (!cfg.baseUrl || !cfg.apiKey) {
      setMsg("请先填写 Base URL 和 API Key");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const list = await fetchModels(cfg.baseUrl, cfg.apiKey);
      setModels(list);
      setMsg(`拉取到 ${list.length} 个模型`);
    } catch (e) {
      setMsg(
        "拉取失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-settings-page">
      <div className="ai-section">
        <div className="ai-section-title">API 配置</div>

        <div className="ai-field">
          <label className="ai-field-label">
            Base URL（OpenAI 兼容）
          </label>
          <input
            className="ai-input"
            placeholder="https://your-newapi.example.com/v1"
            value={cfg.baseUrl}
            onChange={(e) =>
              setCfg({ ...cfg, baseUrl: e.target.value })
            }
          />
        </div>

        <div className="ai-field">
          <label className="ai-field-label">API Key</label>
          <input
            className="ai-input"
            type="password"
            placeholder="sk-..."
            value={cfg.apiKey}
            onChange={(e) =>
              setCfg({ ...cfg, apiKey: e.target.value })
            }
          />
        </div>

        <div className="ai-field">
          <label className="ai-field-label">模型</label>
          <input
            className="ai-input"
            placeholder="例如 gpt-4o-mini"
            value={cfg.model}
            onChange={(e) =>
              setCfg({ ...cfg, model: e.target.value })
            }
          />
        </div>

        <div
          style={{ display: "flex", gap: 8, marginTop: 12 }}
        >
          <button
            className="ai-btn"
            onClick={pullModels}
            disabled={loading}
          >
            {loading ? "拉取中…" : "拉取模型列表"}
          </button>
          <button
            className="ai-btn primary"
            onClick={save}
            style={{ flex: 1 }}
          >
            保存
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              opacity: 0.75,
            }}
          >
            {msg}
          </div>
        )}

        {models.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="ai-field-label">
              可选模型（点击填入）
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {models.map((m) => (
                <button
                  key={m}
                  className={
                    "ai-btn" +
                    (cfg.model === m ? " primary" : "")
                  }
                  style={{
                    height: 32,
                    padding: "0 12px",
                    fontSize: 12,
                  }}
                  onClick={() =>
                    setCfg({ ...cfg, model: m })
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}