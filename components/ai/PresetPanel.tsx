"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Save,
  Check,
} from "lucide-react";
import {
  loadPresets,
  savePresets,
  newPreset,
  parseSillyTavernPreset,
  getActivePresetId,
  setActivePresetId,
  type AiPreset,
} from "@/lib/ai/presets";

export default function PresetPanel({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [list, setList] = useState<AiPreset[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiPreset | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setList(loadPresets());
    setActiveId(getActivePresetId());
  }, []);

  function persist(next: AiPreset[]) {
    setList(next);
    savePresets(next);
    onChanged();
  }

  function pickActive(id: string) {
    const next = activeId === id ? "" : id;
    setActiveId(next);
    setActivePresetId(next);
    onChanged();
  }

  function startEdit(p: AiPreset) {
    setEditingId(p.id);
    setDraft({ ...p });
  }

  function commitEdit() {
    if (!draft || !editingId) return;
    const next = list.map((p) =>
      p.id === editingId ? draft : p
    );
    persist(next);
    setEditingId(null);
    setDraft(null);
  }

  function addNew() {
    const p = newPreset();
    persist([...list, p]);
    startEdit(p);
  }

  function removeOne(id: string) {
    if (!window.confirm("删除这个预设？")) return;
    const next = list.filter((p) => p.id !== id);
    persist(next);
    if (activeId === id) {
      setActiveId("");
      setActivePresetId("");
    }
  }

  async function handleImport(f: File) {
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const p = parseSillyTavernPreset(json);
      persist([...list, p]);
      setMsg(`已导入：${p.name}`);
      window.setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(
        "导入失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    }
  }

  return (
    <div className="ai-wb-backdrop" onClick={onClose}>
      <div
        className="ai-wb-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ai-wb-header">
          <h2>预设</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="ai-wb-icon-btn"
              onClick={() => fileRef.current?.click()}
              title="导入 SillyTavern 预设"
              aria-label="导入"
            >
              <Upload size={16} strokeWidth={2.2} />
            </button>
            <button
              className="ai-wb-icon-btn"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleImport(f);
          }}
        />

        <div className="ai-wb-body">
          {list.length === 0 && (
            <div className="ai-empty">
              还没有预设。点下方「+ 新建」或右上角导入
              SillyTavern 预设。
            </div>
          )}

          {list.map((p) => {
            const isEditing = editingId === p.id;
            const d = isEditing && draft ? draft : p;
            return (
              <div key={p.id} className="ai-wb-entry">
                <div className="ai-wb-entry-head">
                  <button
                    className={
                      "ai-preset-pick" +
                      (activeId === p.id
                        ? " active"
                        : "")
                    }
                    onClick={() => pickActive(p.id)}
                  >
                    {activeId === p.id ? (
                      <Check size={12} strokeWidth={2.6} />
                    ) : (
                      "○"
                    )}
                    {activeId === p.id ? "使用中" : "使用"}
                  </button>
                  {isEditing ? (
                    <input
                      className="ai-input"
                      style={{
                        flex: 1,
                        height: 30,
                        fontSize: 13,
                      }}
                      value={d.name}
                      onChange={(e) =>
                        setDraft({
                          ...d,
                          name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {p.name}
                      {p.source === "sillytavern" && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            opacity: 0.5,
                          }}
                        >
                          ST
                        </span>
                      )}
                    </span>
                  )}
                  {isEditing ? (
                    <button
                      className="ai-wb-icon-btn"
                      onClick={commitEdit}
                      aria-label="保存"
                    >
                      <Save size={14} strokeWidth={2.2} />
                    </button>
                  ) : (
                    <button
                      className="ai-wb-icon-btn"
                      onClick={() => startEdit(p)}
                      style={{ fontSize: 11 }}
                    >
                      编辑
                    </button>
                  )}
                  <button
                    className="ai-wb-icon-btn danger"
                    onClick={() => removeOne(p.id)}
                    aria-label="删除"
                  >
                    <Trash2 size={14} strokeWidth={2.2} />
                  </button>
                </div>

                {isEditing ? (
                  <>
                    <div className="ai-preset-nums">
                      <label>
                        temp
                        <input
                          type="number"
                          step={0.05}
                          value={d.temperature ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...d,
                              temperature:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        top_p
                        <input
                          type="number"
                          step={0.05}
                          value={d.top_p ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...d,
                              top_p:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        freq
                        <input
                          type="number"
                          step={0.1}
                          value={d.frequency_penalty ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...d,
                              frequency_penalty:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        pres
                        <input
                          type="number"
                          step={0.1}
                          value={d.presence_penalty ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...d,
                              presence_penalty:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        max
                        <input
                          type="number"
                          step={64}
                          value={d.max_tokens ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...d,
                              max_tokens:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <textarea
                      className="ai-input ai-wb-content"
                      placeholder="主提示词（支持 {{char}} / {{user}}）"
                      rows={4}
                      value={d.main_prompt}
                      onChange={(e) =>
                        setDraft({
                          ...d,
                          main_prompt: e.target.value,
                        })
                      }
                    />
                    <textarea
                      className="ai-input ai-wb-content"
                      placeholder="历史后附加（可选）"
                      rows={2}
                      value={d.post_history}
                      onChange={(e) =>
                        setDraft({
                          ...d,
                          post_history: e.target.value,
                        })
                      }
                    />
                  </>
                ) : (
                  <div
                    style={{
                      fontSize: 11.5,
                      opacity: 0.65,
                      lineHeight: 1.6,
                    }}
                  >
                    temp {p.temperature ?? "—"} · top_p{" "}
                    {p.top_p ?? "—"} · max{" "}
                    {p.max_tokens ?? "—"}
                    <div
                      style={{
                        marginTop: 6,
                        whiteSpace: "pre-wrap",
                        maxHeight: 60,
                        overflow: "hidden",
                      }}
                    >
                      {p.main_prompt.slice(0, 100)}
                      {p.main_prompt.length > 100 ? "…" : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="ai-wb-footer">
          <button
            className="ai-btn primary"
            onClick={addNew}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={14} strokeWidth={2.4} />
            新建预设
          </button>
        </div>

        {msg && <div className="ai-wb-msg">{msg}</div>}
      </div>
    </div>
  );
}