"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  loadPresets,
  savePresets,
  newPreset,
  parseSillyTavernPreset,
  getActivePresetId,
  setActivePresetId,
  type AiPreset,
  type PresetPrompt,
} from "@/lib/ai/presets";

export default function PresetPanel({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [list, setList] = useState<AiPreset[]>([]);
  const [activeId, setActiveId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [draft, setDraft] = useState<AiPreset | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set()
  );
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
    setDraft(JSON.parse(JSON.stringify(p)));
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

  function cancelEdit() {
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
      setMsg(
        `已导入《${p.name}》，共 ${p.prompts.length} 条提示`
      );
      window.setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setMsg(
        "导入失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    }
  }

  /* ---------- draft 修改工具 ---------- */

  function patchDraft(p: Partial<AiPreset>) {
    if (!draft) return;
    setDraft({ ...draft, ...p });
  }

  function patchParam(
    key: keyof AiPreset["params"],
    v: string
  ) {
    if (!draft) return;
    const n = v === "" ? undefined : Number(v);
    setDraft({
      ...draft,
      params: {
        ...draft.params,
        [key]: Number.isFinite(n as number)
          ? (n as number)
          : undefined,
      },
    });
  }

  function patchPrompt(idx: number, p: Partial<PresetPrompt>) {
    if (!draft) return;
    const next = [...draft.prompts];
    next[idx] = { ...next[idx], ...p };
    setDraft({ ...draft, prompts: next });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
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
              还没有预设。点下方「新建」或右上角导入。
            </div>
          )}

          {list.map((p) => {
            const isEditing = editingId === p.id;
            const d = isEditing && draft ? draft : p;
            const useCount = p.prompts.filter(
              (x) => x.enabled && !x.isMarker && x.content.trim()
            ).length;
            return (
              <div key={p.id} className="ai-wb-entry">
                <div className="ai-wb-entry-head">
                  <button
                    className={
                      "ai-preset-pick" +
                      (activeId === p.id ? " active" : "")
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
                        patchDraft({ name: e.target.value })
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
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          opacity: 0.55,
                          fontWeight: 400,
                        }}
                      >
                        {p.source === "sillytavern"
                          ? "ST"
                          : "自定义"}{" "}
                        · {useCount}/{p.prompts.length} 启用
                        {p.regexScripts &&
                          p.regexScripts.length > 0 &&
                          ` · ${p.regexScripts.length} 正则`}
                      </span>
                    </span>
                  )}
                  {isEditing ? (
                    <>
                      <button
                        className="ai-wb-icon-btn"
                        onClick={commitEdit}
                        title="保存"
                        aria-label="保存"
                      >
                        <Check size={14} strokeWidth={2.4} />
                      </button>
                      <button
                        className="ai-wb-icon-btn"
                        onClick={cancelEdit}
                        title="取消"
                        aria-label="取消"
                      >
                        <X size={14} strokeWidth={2.4} />
                      </button>
                    </>
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

                {isEditing && d.prompts.length > 0 && (
                  <div className="ai-preset-params">
                    <ParamInput
                      label="温度"
                      value={d.params.temperature}
                      step={0.05}
                      onChange={(v) =>
                        patchParam("temperature", v)
                      }
                    />
                    <ParamInput
                      label="top_p"
                      value={d.params.top_p}
                      step={0.05}
                      onChange={(v) => patchParam("top_p", v)}
                    />
                    <ParamInput
                      label="top_k"
                      value={d.params.top_k}
                      step={1}
                      onChange={(v) => patchParam("top_k", v)}
                    />
                    <ParamInput
                      label="min_p"
                      value={d.params.min_p}
                      step={0.01}
                      onChange={(v) => patchParam("min_p", v)}
                    />
                    <ParamInput
                      label="top_a"
                      value={d.params.top_a}
                      step={0.01}
                      onChange={(v) => patchParam("top_a", v)}
                    />
                    <ParamInput
                      label="频偏"
                      value={d.params.frequency_penalty}
                      step={0.05}
                      onChange={(v) =>
                        patchParam("frequency_penalty", v)
                      }
                    />
                    <ParamInput
                      label="呈偏"
                      value={d.params.presence_penalty}
                      step={0.05}
                      onChange={(v) =>
                        patchParam("presence_penalty", v)
                      }
                    />
                    <ParamInput
                      label="重罚"
                      value={d.params.repetition_penalty}
                      step={0.05}
                      onChange={(v) =>
                        patchParam("repetition_penalty", v)
                      }
                    />
                    <ParamInput
                      label="max_t"
                      value={d.params.max_tokens}
                      step={128}
                      onChange={(v) =>
                        patchParam("max_tokens", v)
                      }
                    />
                  </div>
                )}

                {isEditing && (
                  <div className="ai-preset-prompt-list">
                    {d.prompts.map((pp, idx) => (
                      <div
                        key={pp.id}
                        className="ai-preset-prompt-item"
                      >
                        <div className="ai-preset-prompt-head">
                          <input
                            type="checkbox"
                            checked={pp.enabled}
                            disabled={pp.isMarker}
                            onChange={(e) =>
                              patchPrompt(idx, {
                                enabled: e.target.checked,
                              })
                            }
                          />
                          <button
                            className="ai-preset-prompt-toggle"
                            onClick={() =>
                              toggleExpanded(pp.id)
                            }
                          >
                            {expanded.has(pp.id) ? (
                              <ChevronDown
                                size={12}
                                strokeWidth={2.4}
                              />
                            ) : (
                              <ChevronRight
                                size={12}
                                strokeWidth={2.4}
                              />
                            )}
                            <span
                              className={
                                "ai-preset-prompt-name" +
                                (pp.isMarker
                                  ? " is-marker"
                                  : "")
                              }
                            >
                              {pp.name}
                              {pp.isMarker && (
                                <span className="ai-preset-marker-tag">
                                  槽位
                                </span>
                              )}
                            </span>
                          </button>
                          {!pp.isMarker && !expanded.has(pp.id) && (
                            <span className="ai-preset-preview">
                              {pp.content.slice(0, 40)}
                              {pp.content.length > 40
                                ? "…"
                                : ""}
                            </span>
                          )}
                        </div>
                        {expanded.has(pp.id) && !pp.isMarker && (
                          <textarea
                            className="ai-input ai-wb-content"
                            rows={6}
                            value={pp.content}
                            onChange={(e) =>
                              patchPrompt(idx, {
                                content: e.target.value,
                              })
                            }
                          />
                        )}
                        {expanded.has(pp.id) && pp.isMarker && (
                          <div className="ai-preset-marker-hint">
                            这是 SillyTavern 的动态槽位
                            （{pp.marker}），运行时会自动填充
                            内容。
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!isEditing && p.prompts.length === 0 && (
                  <div className="ai-preset-empty">
                    这个预设还没有提示词。
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

function ParamInput({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number | undefined;
  step: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="ai-preset-param">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}