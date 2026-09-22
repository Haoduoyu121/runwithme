"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  loadWorldbooks,
  saveWorldbooks,
  newEntry,
  newWorldbook,
  parseSillyTavernWorldbook,
  POSITION_LABELS,
  type Worldbook,
  type WorldbookEntry,
  type WorldbookPosition,
} from "@/lib/ai/worldbook";

export default function WorldbookPanel({
  cardId,
  onClose,
}: {
  cardId: string;
  onClose: () => void;
}) {
  const [books, setBooks] = useState<Worldbook[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const list = await loadWorldbooks(cardId);
      setBooks(list);
      if (list.length > 0) setActiveId(list[0].id);
      setLoading(false);
    })();
  }, [cardId]);

  const active = books.find((b) => b.id === activeId) || null;

  function patchBook(id: string, p: Partial<Worldbook>) {
    setBooks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...p } : b))
    );
  }

  function patchEntry(
    bookId: string,
    entryId: string,
    p: Partial<WorldbookEntry>
  ) {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              entries: b.entries.map((e) =>
                e.id === entryId ? { ...e, ...p } : e
              ),
            }
          : b
      )
    );
  }

  function addBook() {
    const b = newWorldbook(`世界书 ${books.length + 1}`);
    setBooks((prev) => [...prev, b]);
    setActiveId(b.id);
  }

  function deleteBook(id: string) {
    if (!window.confirm("删除这本世界书？下面的条目会一起删。"))
      return;
    setBooks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id || "");
      }
      return next;
    });
  }

  function addEntry() {
    if (!active) return;
    patchBook(active.id, {
      entries: [...active.entries, newEntry()],
    });
  }

  function removeEntry(entryId: string) {
    if (!active) return;
    if (!window.confirm("删除这一条？")) return;
    patchBook(active.id, {
      entries: active.entries.filter((e) => e.id !== entryId),
    });
  }

  async function persist() {
    setSaving(true);
    setMsg("");
    try {
      await saveWorldbooks(cardId, books);
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
      const baseName = file.name.replace(/\.json$/i, "");
      const book = parseSillyTavernWorldbook(
        json,
        baseName || "导入的世界书"
      );
      if (book.entries.length === 0) {
        setMsg("没有解析出条目");
        return;
      }
      setBooks((prev) => [...prev, book]);
      setActiveId(book.id);
      setMsg(
        `导入《${book.name}》共 ${book.entries.length} 条，记得点保存`
      );
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
          <h2>
            世界书
            {cardId === "__global__" && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  opacity: 0.55,
                  fontWeight: 400,
                }}
              >
                全局
              </span>
            )}
          </h2>
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

        {/* 世界书 tabs */}
        <div className="ai-wb-tabs">
          {books.map((b) => (
            <button
              key={b.id}
              className={
                "ai-wb-tab" +
                (b.id === activeId ? " active" : "") +
                (b.enabled ? "" : " disabled")
              }
              onClick={() => setActiveId(b.id)}
              title={b.enabled ? "" : "已禁用"}
            >
              {b.name}
              <span className="ai-wb-tab-count">
                {b.entries.length}
              </span>
            </button>
          ))}
          <button
            className="ai-wb-tab ai-wb-tab-add"
            onClick={addBook}
            title="新建世界书"
          >
            <Plus size={14} strokeWidth={2.4} />
          </button>
        </div>

        {/* 当前世界书工具条 */}
        {active && (
          <div className="ai-wb-book-bar">
            <button
              className="ai-wb-icon-btn"
              onClick={() =>
                patchBook(active.id, {
                  enabled: !active.enabled,
                })
              }
              title={active.enabled ? "整本禁用" : "整本启用"}
            >
              {active.enabled ? "◉" : "○"}
            </button>
            <input
              className="ai-input ai-wb-book-name"
              value={active.name}
              onChange={(e) =>
                patchBook(active.id, { name: e.target.value })
              }
              placeholder="世界书名称"
            />
            <button
              className="ai-wb-icon-btn danger"
              onClick={() => deleteBook(active.id)}
              title="删除这本书"
              aria-label="删除"
            >
              <Trash2 size={14} strokeWidth={2.2} />
            </button>
          </div>
        )}

        {/* 条目列表 */}
        <div className="ai-wb-body">
          {loading && (
            <div className="ai-empty">加载中…</div>
          )}

          {!loading && books.length === 0 && (
            <div className="ai-empty">
              还没有世界书。点上面的「+」新建一本，或右上角导入
              SillyTavern 世界书。
            </div>
          )}

          {active && active.entries.length === 0 && (
            <div className="ai-empty">
              这本还没有条目。点下方「+ 新增条目」。
            </div>
          )}

          {active &&
            active.entries.map((e, idx) => (
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
                        patchEntry(active.id, e.id, {
                          enabled: ev.target.checked,
                        })
                      }
                    />
                    启用
                  </label>
                  <label className="ai-wb-toggle">
                    <input
                      type="checkbox"
                      checked={e.constant}
                      onChange={(ev) =>
                        patchEntry(active.id, e.id, {
                          constant: ev.target.checked,
                        })
                      }
                    />
                    总是注入
                  </label>
                  <label className="ai-wb-toggle">
                    <input
                      type="checkbox"
                      checked={e.caseSensitive}
                      onChange={(ev) =>
                        patchEntry(active.id, e.id, {
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

                <div className="ai-wb-row">
                  <label className="ai-wb-select-label">
                    位置
                    <select
                      className="ai-wb-select"
                      value={e.position}
                      onChange={(ev) =>
                        patchEntry(active.id, e.id, {
                          position: Number(
                            ev.target.value
                          ) as WorldbookPosition,
                        })
                      }
                    >
                      {(
                        [
                          0, 1, 2, 3, 4, 5, 6,
                        ] as WorldbookPosition[]
                      ).map((p) => (
                        <option key={p} value={p}>
                          {POSITION_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {e.position === 4 && (
                    <label className="ai-wb-select-label">
                      深度
                      <input
                        className="ai-wb-depth-input"
                        type="number"
                        min={0}
                        max={50}
                        value={e.depth}
                        onChange={(ev) =>
                          patchEntry(active.id, e.id, {
                            depth: Math.max(
                              0,
                              parseInt(ev.target.value) || 0
                            ),
                          })
                        }
                      />
                    </label>
                  )}
                </div>

                <input
                  className="ai-input ai-wb-keywords"
                  placeholder="关键词，用逗号分隔"
                  value={e.keywords.join(", ")}
                  onChange={(ev) =>
                    patchEntry(active.id, e.id, {
                      keywords: ev.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />

                <textarea
                  className="ai-input ai-wb-content"
                  placeholder="触发时注入的内容"
                  rows={3}
                  value={e.content}
                  onChange={(ev) =>
                    patchEntry(active.id, e.id, {
                      content: ev.target.value,
                    })
                  }
                />
              </div>
            ))}
        </div>

        <div className="ai-wb-footer">
          <button
            className="ai-btn"
            onClick={addEntry}
            disabled={!active}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={14} strokeWidth={2.4} />
            新增条目
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