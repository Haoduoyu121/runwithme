"use client";

import { useEffect, useState } from "react";
import {
  loadConfig,
  saveConfig,
  fetchModels,
  type AiApiConfig,
} from "@/lib/ai/apiClient";
import {
  loadPersona,
  savePersona,
  type UserPersona,
} from "@/lib/ai/userProfile";

export default function AiSettingsPage() {
  const [cfg, setCfg] = useState<AiApiConfig>({
    baseUrl: "",
    apiKey: "",
    model: "",
  });
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [persona, setPersona] = useState<UserPersona>({
    name: "你",
    description: "",
  });
  const [personaMsg, setPersonaMsg] = useState("");

  useEffect(() => {
    setCfg(loadConfig());
    setPersona(loadPersona());
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

  function savePersonaClick() {
    savePersona({
      name: persona.name.trim() || "你",
      description: persona.description,
    });
    setPersonaMsg("已保存");
    setTimeout(() => setPersonaMsg(""), 2000);
  }

  return (
    <div className="ai-settings-page">
      {/* API */}
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

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
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

      {/* Persona */}
      <div className="ai-section">
        <div className="ai-section-title">
          用户信息（Persona）
        </div>

        <div className="ai-field">
          <label className="ai-field-label">
            名字（替换 {"{{user}}"}）
          </label>
          <input
            className="ai-input"
            placeholder="你"
            value={persona.name}
            onChange={(e) =>
              setPersona({
                ...persona,
                name: e.target.value,
              })
            }
          />
        </div>

        <div className="ai-field">
          <label className="ai-field-label">
            描述
          </label>
          <textarea
            className="ai-input ai-wb-content"
            rows={10}
            placeholder={
              "例如：\n男，28岁，插画师。性格温和，说话简短。"
            }
            value={persona.description}
            onChange={(e) =>
              setPersona({
                ...persona,
                description: e.target.value,
              })
            }
          />
        </div>

        <button
          className="ai-btn primary"
          onClick={savePersonaClick}
          style={{ width: "100%" }}
        >
          保存用户信息
        </button>

        {personaMsg && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12.5,
              opacity: 0.75,
              textAlign: "center",
            }}
          >
            {personaMsg}
          </div>
        )}
      </div>
    </div>
  );
}