"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  Highlighter,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  formatNoteTime,
  type Note,
  type NoteAuthor,
} from "@/data/notes";
import type { DiaryHighlight } from "@/data/diaryHighlights";
import {
  findOccurrenceIndex,
  inferOccurrence,
} from "@/lib/diaryTextUtils";
import { toAvatarKey } from "@/lib/useCharacterAvatars";

type Props = {
  note: Note;
  highlights: DiaryHighlight[];
  avatars: Record<string, string | null>;
  moodOptions: string[];
  onUpdateNote: (id: string, patch: Partial<Note>) => void;
  onCreateHighlight: (payload: {
    text: string;
    occurrence: number;
    note?: string;
  }) => void;
  onUpdateHighlight: (
    id: string,
    patch: Partial<DiaryHighlight>
  ) => void;
  onDeleteHighlight: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onClose: () => void;
};

type Segment = {
  text: string;
  start: number;
  highlight?: DiaryHighlight;
};

type MenuState = {
  x: number;
  y: number;
  text: string;
  occurrence: number;
};

type SheetState = {
  mode: "create" | "edit";
  text: string;
  occurrence: number;
  draft: string;
  editingId?: string;
  readOnly?: boolean;
};

export default function DiaryEditorView({
  note,
  highlights,
  avatars,
  moodOptions,
  onUpdateNote,
  onCreateHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
  onDeleteNote,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* ★ 自建长按 */
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  function cancelLongPress() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  /** 从触点坐标算出「字符偏移」 */
  function caretOffsetFromPoint(
    x: number,
    y: number
  ): number | null {
    const root = rootRef.current;
    if (!root) {
      console.log("[Diary] no root");
      return null;
    }

    let range: Range | null = null;

    const doc = document as Document & {
      caretRangeFromPoint?: (
        x: number,
        y: number
      ) => Range | null;
      caretPositionFromPoint?: (
        x: number,
        y: number
      ) => { offsetNode: Node; offset: number } | null;
    };

    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(x, y);
    } else if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (!range) {
      console.log("[Diary] caretRangeFromPoint → null", {
        x,
        y,
      });
      return null;
    }

    const node = range.startContainer;
    const nodeType = node.nodeType;
    console.log("[Diary] hit node", {
      nodeType,
      text:
        node.nodeType === Node.TEXT_NODE
          ? (node as Text).textContent?.slice(0, 20)
          : (node as HTMLElement).outerHTML?.slice(0, 80),
      startOffset: range.startOffset,
    });

    /* ★ 关键修复：两种节点都处理 */
    let el: HTMLElement | null = null;
    let offsetInNode = 0;

    if (node.nodeType === Node.TEXT_NODE) {
      el = (node as Text).parentElement;
      offsetInNode = range.startOffset;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      el = node as HTMLElement;
      /* 元素节点：不要偏移，用 offsetInNode = 0 或 max */
      offsetInNode = 0;
    } else {
      console.log("[Diary] 未知节点类型:", nodeType);
      return null;
    }

    let steps = 0;
    while (el && el !== root) {
      steps++;
      if (steps > 50) {
        console.log("[Diary] 向上查找超 50 层，放弃");
        return null;
      }
      const base = el.getAttribute("data-offset");
      if (base !== null) {
        const result = parseInt(base, 10) + offsetInNode;
        console.log("[Diary] 找到 offset:", result, "| base:", base, "| offsetInNode:", offsetInNode);
        return result;
      }
      el = el.parentElement;
    }

    console.log("[Diary] 找不到 data-offset");
    return null;
  }

  /** 在 offset 处取整句范围（以 。！？…\n 分句） */
  function getSentenceRange(
    text: string,
    offset: number
  ): [number, number] {
    const SENT_END = /[。！？!?…]/;
    const clamp = Math.min(
      Math.max(0, offset),
      text.length
    );

    let start = clamp;
    while (start > 0) {
      const c = text[start - 1];
      if (SENT_END.test(c) || c === "\n") break;
      start--;
    }

    let end = clamp;
    while (end < text.length) {
      const c = text[end];
      end++;
      if (SENT_END.test(c)) {
        /* 吞掉句末引号 */
        while (
          end < text.length &&
          /["'”’」』]/.test(text[end])
        ) {
          end++;
        }
        break;
      }
      if (c === "\n") {
        end--;
        break;
      }
    }

    /* 去掉首尾空白 */
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;

    return [start, end];
  }

    /* ★ 原生 addEventListener 绑定（绕过 React 委托） */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (editing) return;

      const t = e.target as HTMLElement;
      if (
        t.closest("button") ||
        t.closest("[data-hl-id]")
      ) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) return;

      cancelLongPress();
      pointerStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };

      const cx = touch.clientX;
      const cy = touch.clientY;

      console.log("[Diary] touchstart", cx, cy);

      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        console.log("[Diary] timer fired");

        const offset = caretOffsetFromPoint(cx, cy);
        if (offset === null) {
          console.warn("[Diary] offset null");
          return;
        }

        const [s, e2] = getSentenceRange(
          note.body,
          offset
        );
        const text = note.body.slice(s, e2).trim();
        if (!text) return;

        const actualStart = note.body.indexOf(text, s);
        if (actualStart === -1) return;

        const occ = inferOccurrence(
          note.body,
          text,
          actualStart
        );

        try {
          if (
            typeof navigator !== "undefined" &&
            "vibrate" in navigator
          ) {
            navigator.vibrate(10);
          }
        } catch {}

        setMenu({
          x: cx,
          y: cy - 20,
          text,
          occurrence: occ,
        });
      }, 450);
    }

    function onTouchMove(e: TouchEvent) {
      const start = pointerStartRef.current;
      if (!start) return;

      const touch = e.touches[0];
      if (!touch) return;

      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);

      if (dx > 15 || dy > 15) {
        cancelLongPress();
        pointerStartRef.current = null;
      }
    }

    function onTouchEnd() {
      cancelLongPress();
      pointerStartRef.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    el.addEventListener("touchmove", onTouchMove, {
      passive: true,
    });
    el.addEventListener("touchend", onTouchEnd, {
      passive: true,
    });
    el.addEventListener("touchcancel", onTouchEnd, {
      passive: true,
    });

    return () => {
      el.removeEventListener(
        "touchstart",
        onTouchStart
      );
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener(
        "touchcancel",
        onTouchEnd
      );
      cancelLongPress();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.body, editing]);

  /* 组件卸载时清理 */
  useEffect(() => {
    return () => cancelLongPress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- 构造 segments ---------- */

  const segments = useMemo<Segment[]>(() => {
    const body = note.body;
    if (!body) return [];

    const positioned = highlights
      .map((h) => {
        const start = findOccurrenceIndex(
          body,
          h.text,
          h.occurrence
        );
        if (start === -1) return null;
        return {
          h,
          start,
          end: start + h.text.length,
        };
      })
      .filter(
        (x): x is NonNullable<typeof x> => x !== null
      )
      .sort(
        (a, b) => a.start - b.start || b.end - a.end
      );

    const accepted: typeof positioned = [];
    let lastEnd = 0;
    for (const p of positioned) {
      if (p.start < lastEnd) continue;
      accepted.push(p);
      lastEnd = p.end;
    }

    const segs: Segment[] = [];
    let cursor = 0;
    for (const { h, start, end } of accepted) {
      if (start > cursor) {
        segs.push({
          text: body.slice(cursor, start),
          start: cursor,
        });
      }
      segs.push({
        text: body.slice(start, end),
        start,
        highlight: h,
      });
      cursor = end;
    }
    if (cursor < body.length) {
      segs.push({
        text: body.slice(cursor),
        start: cursor,
      });
    }
    return segs;
  }, [note.body, highlights]);


  /* ---------- 打开已有划线 ---------- */

  function openHighlight(h: DiaryHighlight) {
    setSheet({
      mode: "edit",
      text: h.text,
      occurrence: h.occurrence,
      draft: h.note || "",
      editingId: h.id,
      readOnly: h.author !== "user",
    });
  }

  /* ---------- 保存 / 删除 ---------- */

  function saveSheet() {
    if (!sheet) return;
    if (sheet.mode === "create") {
      onCreateHighlight({
        text: sheet.text,
        occurrence: sheet.occurrence,
        note: sheet.draft.trim() || undefined,
      });
    } else if (sheet.editingId) {
      onUpdateHighlight(sheet.editingId, {
        note: sheet.draft.trim() || undefined,
      });
    }
    setSheet(null);
  }

  function deleteCurrentHighlight() {
    if (sheet?.editingId) {
      onDeleteHighlight(sheet.editingId);
      setSheet(null);
    }
  }

  /* ---------- 渲染正文 ---------- */

  function renderBody(): ReactNode {
    if (segments.length === 0) {
      return (
        <span style={{ opacity: 0.55 }}>……</span>
      );
    }

    const nodes: ReactNode[] = [];
    segments.forEach((seg, i) => {
      if (seg.highlight) {
        const h = seg.highlight;
        nodes.push(
          <span
            key={`s${i}`}
            className={`diary-hl diary-hl-${h.author.toLowerCase()}`}
            data-offset={seg.start}
            onClick={(e) => {
              e.stopPropagation();
              openHighlight(h);
            }}
          >
            {seg.text}
          </span>
        );
        if (h.note) {
          nodes.push(
            <span
              key={`n${i}`}
              className={`diary-hl-tail diary-hl-tail-${h.author.toLowerCase()}`}
            >
              {h.author === "user" ? "我" : h.author}：
              {h.note}
            </span>
          );
        }
      } else {
        nodes.push(
          <span key={`s${i}`} data-offset={seg.start}>
            {seg.text}
          </span>
        );
      }
    });
    return nodes;
  }

  function renderAvatar(author: NoteAuthor) {
if (author === "user") {
  const url = avatars.you ?? null;
  return (
    <span
      className={`notes-diary-avatar is-user${
        url ? " has-image" : ""
      }`}
    >
      {url ? <img src={url} alt="我" /> : "我"}
    </span>
  );
}
    const key = toAvatarKey(author);
    const url = key ? avatars[key] : null;
    return (
      <span className="notes-diary-avatar">
        {url ? (
          <img src={url} alt={author} />
        ) : (
          author.charAt(0)
        )}
      </span>
    );
  }

  return (
    <main className="app-screen notes-app">
      <header className="notes-editor-header">
        <button
          className="notes-editor-back"
          onClick={onClose}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="notes-editor-title-bar">
          Diary
        </div>

        <button
          className="notes-editor-delete"
          onClick={() => {
            if (window.confirm("删除这条日记？")) {
              onDeleteNote(note.id);
            }
          }}
          aria-label="删除"
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      </header>

      <div className="notes-editor-body notes-diary-body">
        <div className="notes-diary-author-row">
          {renderAvatar(note.author)}
          <span className="notes-diary-author-name">
            {note.author === "user"
              ? "我"
              : note.author}
          </span>
          <span className="notes-diary-time">
            {formatNoteTime(note.updatedAt)}
          </span>
        </div>

        <div className="notes-diary-moods">
          {moodOptions.map((m) => {
            const active = note.mood === m;
            return (
              <button
                key={m}
                type="button"
                className={`notes-diary-mood-chip${
                  active ? " active" : ""
                }`}
                onClick={() =>
                  onUpdateNote(note.id, {
                    mood: active ? undefined : m,
                  })
                }
              >
                {m}
              </button>
            );
          })}
        </div>

        {editing ? (
          <div className="notes-diary-edit-wrap">
            <textarea
              className="notes-editor-content notes-diary-content"
              value={note.body}
              onChange={(e) =>
                onUpdateNote(note.id, {
                  body: e.target.value,
                })
              }
              placeholder="写点什么…"
              autoFocus
            />
            <button
              type="button"
              className="notes-diary-edit-done"
              onClick={() => setEditing(false)}
            >
              完成
            </button>
          </div>
        ) : (
          <div className="notes-diary-view-wrap">
            <div
              ref={rootRef}
              className="notes-diary-view"
            >
              {renderBody()}
            </div>
            <button
              type="button"
              className="notes-diary-edit-btn"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} strokeWidth={2} />
              编辑
            </button>
          </div>
        )}
      </div>

      {menu && (
        <>
          <div
            className="diary-hl-menu-backdrop"
            onClick={() => setMenu(null)}
          />
          <div
            className="diary-hl-menu"
            style={{ left: menu.x, top: menu.y }}
          >
            <button
              className="diary-hl-menu-btn"
              onClick={() => {
                onCreateHighlight({
                  text: menu.text,
                  occurrence: menu.occurrence,
                });
                setMenu(null);
              }}
            >
              <Highlighter size={14} strokeWidth={2} />
              只划线
            </button>
            <button
              className="diary-hl-menu-btn"
              onClick={() => {
                setSheet({
                  mode: "create",
                  text: menu.text,
                  occurrence: menu.occurrence,
                  draft: "",
                });
                setMenu(null);
              }}
            >
              <Pencil size={14} strokeWidth={2} />
              写评价
            </button>
          </div>
        </>
      )}

      {sheet && (
        <div
          className="diary-hl-sheet-backdrop"
          onClick={() => setSheet(null)}
        >
          <div
            className="diary-hl-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {sheet.mode === "create"
                ? "写评价"
                : sheet.readOnly
                  ? "划线详情"
                  : "编辑评价"}
            </h3>
            <div className="diary-hl-quote">
              「{sheet.text}」
            </div>
            <textarea
              className="diary-hl-input"
              value={sheet.draft}
              onChange={(e) =>
                setSheet({
                  ...sheet,
                  draft: e.target.value,
                })
              }
              placeholder={
                sheet.mode === "create"
                  ? "写点什么（可留空，只划线）…"
                  : ""
              }
              readOnly={!!sheet.readOnly}
              maxLength={60}
              autoFocus={!sheet.readOnly}
            />
            <div className="diary-hl-sheet-actions">
              {sheet.mode === "edit" && (
                <button
                  className="diary-hl-btn danger"
                  onClick={deleteCurrentHighlight}
                >
                  删除划线
                </button>
              )}
              <button
                className="diary-hl-btn ghost"
                onClick={() => setSheet(null)}
              >
                取消
              </button>
              {!sheet.readOnly && (
                <button
                  className="diary-hl-btn primary"
                  onClick={saveSheet}
                >
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}