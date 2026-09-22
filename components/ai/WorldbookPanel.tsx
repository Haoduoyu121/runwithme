"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Save,
  Loader2,
} from "lucide-react";
import {
  loadWorldbook,
  saveWorldbook,
  newEntry,
  parseSillyTavernWorldbook,
  type WorldbookEntry,
} from "@/lib/ai/worldbook";

export default function WorldbookPanel({
  cardId,
  onClose,
}: {
  cardId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<WorldbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const list = await loadWorldbook(cardId);
      setEntries(list);
      setLoading(false);
    })();
  }, [cardId]);

  function patch(id: string, p: Partial<WorldbookEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...p } : e))
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()]);
  }

  function removeEntry(id: string) {
    if (!window.confirm("删除这一条？")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function persist() {
    setSaving(true);
    setMsg("");
    try {
      await saveWorldbook(cardId, entries);
      setMsg("已保存");
      window.setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      setMsg(
        "保存失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const imported = parseSillyTavernWorldbook(json);
      if (imported.length === 0) {
        setMsg("没有解析出条目");
        return;
      }
      setEntries((prev) => [...prev, ...imported]);
      setMsg(`导入 ${imported.length} 条，记得点保存`);
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
          <h2>世界书</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="ai-wb-icon-btn"
              onClick={() => fileRef.current?.click()}
              title="导入 SillyTavern JSON"
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
          {loading && (
            <div className="ai-empty">加载中…</div>
          )}

          {!loading && entries.length === 0 && (
            <div className="ai-empty">
              还没有条目。点下方「+ 新增」或右上角导入
              SillyTavern 世界书。
            </div>
          )}

          {entries.map((e, idx) => (
            <div key={e.id} className="ai-wb-entry">
              <div className="ai-wb-entry-head">
                <span className="ai-wb-entry-idx">
                  #{idx + 1}
                </span>
                <label className="ai-wb-toggle">
                  <input
                    type="checkbox"
                    checked={e.enabled}
                    onChange={(ev) =>
                      patch(e.id, { enabled: ev.target.checked })
                    }
                  />
                  启用
                </label>
                <label className="ai-wb-toggle">
                  <input
                    type="checkbox"
                    checked={e.constant}
                    onChange={(ev) =>
                      patch(e.id, { constant: ev.target.checked })
                    }
                  />
                  总是注入
                </label>
                <label className="ai-wb-toggle">
                  <input
                    type="checkbox"
                    checked={e.caseSensitive}
                    onChange={(ev) =>
                      patch(e.id, {
                        caseSensitive: ev.target.checked,
                      })
                    }
                  />
                  区分大小写
                </label>
                <button
                  className="ai-wb-icon-btn danger"
                  onClick={() => removeEntry(e.id)}
                  aria-label="删除"
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                </button>
              </div>

              <input
                className="ai-input ai-wb-keywords"
                placeholder="关键词，用逗号分隔"
                value={e.keywords.join(", ")}
                onChange={(ev) =>
                  patch(e.id, {
                    keywords: ev.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />

              <textarea
                className="ai-input ai-wb-content"
                placeholder="触发时注入到 system prompt 的内容"
                rows={3}
                value={e.content}
                onChange={(ev) =>
                  patch(e.id, { content: ev.target.value })
                }
              />
            </div>
          ))}
        </div>

        <div className="ai-wb-footer">
          <button
            className="ai-btn"
            onClick={addEntry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={14} strokeWidth={2.4} />
            新增
          </button>
          <button
            className="ai-btn primary"
            onClick={() => void persist()}
            disabled={saving}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {saving ? (
              <Loader2 size={14} className="ai-spin" />
            ) : (
              <Save size={14} strokeWidth={2.4} />
            )}
            {saving ? "保存中…" : "保存"}
          </button>
        </div>

        {msg && <div className="ai-wb-msg">{msg}</div>}
      </div>
    </div>
  );
}