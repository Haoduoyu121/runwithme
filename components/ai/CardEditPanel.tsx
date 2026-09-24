"use client";

import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

export type EditableCard = {
  id: string;
  name: string;
  avatar?: string | null;
  payload: {
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    character_book?: unknown;
  };
};

export default function CardEditPanel({
  card,
  onClose,
  onSaved,
  onDeleted,
}: {
  card: EditableCard;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(card.name);
  const [avatar, setAvatar] = useState(card.avatar || "");
  const [description, setDescription] = useState(
    card.payload.description || ""
  );
  const [personality, setPersonality] = useState(
    card.payload.personality || ""
  );
  const [scenario, setScenario] = useState(
    card.payload.scenario || ""
  );
  const [firstMes, setFirstMes] = useState(
    card.payload.first_mes || ""
  );
  const [mesExample, setMesExample] = useState(
    card.payload.mes_example || ""
  );
  const [systemPrompt, setSystemPrompt] = useState(
    card.payload.system_prompt || ""
  );

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSave() {
    if (!name.trim()) {
      setMsg("名字不能为空");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/api/ai/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: card.id,
          name: name.trim(),
          avatar: avatar || null,
          payload: {
            ...card.payload,
            description,
            personality,
            scenario,
            first_mes: firstMes,
            mes_example: mesExample,
            system_prompt: systemPrompt,
          },
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setMsg(
        "保存失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `删除角色卡「${card.name}」？\n\n这会同时删除它的对话记录。此操作不可撤销。`
      )
    )
      return;
    setSaving(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/ai/cards/${encodeURIComponent(card.id)}`,
        { method: "DELETE" }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      /* 顺便清掉本地对话 */
      try {
        const { deleteChat } = await import("@/lib/ai/chatStore");
        await deleteChat(card.id);
      } catch {
        /* ignore */
      }
      onDeleted();
      onClose();
    } catch (e) {
      setMsg(
        "删除失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ai-wb-backdrop" onClick={onClose}>
      <div
        className="ai-wb-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-wb-header">
          <h2>编辑角色卡</h2>
          <button
            className="ai-wb-icon-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="ai-wb-body">
          {avatar && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `url(${avatar}) center/cover`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              />
            </div>
          )}

          <div className="ai-field">
            <label className="ai-field-label">名字</label>
            <input
              className="ai-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">描述</label>
            <textarea
              className="ai-input ai-wb-content"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">性格</label>
            <textarea
              className="ai-input ai-wb-content"
              rows={3}
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">场景</label>
            <textarea
              className="ai-input ai-wb-content"
              rows={3}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">开场白</label>
            <textarea
              className="ai-input ai-wb-content"
              rows={4}
              value={firstMes}
              onChange={(e) => setFirstMes(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">示例对话</label>
            <textarea
              className="ai-input ai-wb-content"
              rows={4}
              value={mesExample}
              onChange={(e) => setMesExample(e.target.value)}
            />
          </div>

          <div className="ai-field">
            <label className="ai-field-label">
              System Prompt（可选，覆盖默认）
            </label>
            <textarea
              className="ai-input ai-wb-content"
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          {msg && (
            <div
              style={{
                fontSize: 12.5,
                opacity: 0.8,
                textAlign: "center",
                padding: "6px 0",
              }}
            >
              {msg}
            </div>
          )}
        </div>

        <div className="ai-wb-footer">
          <button
            className="ai-btn"
            onClick={handleDelete}
            disabled={saving}
            style={{
              color: "#d44",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Trash2 size={13} strokeWidth={2.4} />
            删除
          </button>
          <button
            className="ai-btn primary"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Save size={14} strokeWidth={2.4} />
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}