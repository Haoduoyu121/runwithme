"use client";

import { useEffect, useState } from "react";
import { X, Save, Check } from "lucide-react";
import {
  loadPersona,
  savePersona,
  type UserPersona,
} from "@/lib/ai/userProfile";

export default function PersonaPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [persona, setPersona] = useState<UserPersona>({
    name: "你",
    description: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPersona(loadPersona());
  }, []);

  function handleSave() {
    const next = {
      name: persona.name.trim() || "你",
      description: persona.description,
    };
    savePersona(next);
    setPersona(next);
    setMsg("已保存");
    onSaved?.();
    window.setTimeout(() => {
      setMsg("");
      onClose();
    }, 700);
  }

  return (
    <div className="ai-wb-backdrop" onClick={onClose}>
      <div
        className="ai-wb-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-wb-header">
          <h2>用户信息（Persona）</h2>
          <button
            className="ai-wb-icon-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="ai-wb-body">
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
              描述（会作为 [用户信息] 注入到 AI 的上下文）
            </label>
            <textarea
              className="ai-input ai-wb-content"
              rows={10}
              placeholder={
                "例如：\n男，28岁，插画师。性格温和，说话简短。\n喜欢在深夜喝咖啡，房间总是很乱。"
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

          {msg && (
            <div
              style={{
                fontSize: 12,
                opacity: 0.75,
                textAlign: "center",
              }}
            >
              {msg}
            </div>
          )}
        </div>

        <div className="ai-wb-footer">
          <button
            className="ai-btn primary"
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            onClick={handleSave}
          >
            <Save size={14} strokeWidth={2.4} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}