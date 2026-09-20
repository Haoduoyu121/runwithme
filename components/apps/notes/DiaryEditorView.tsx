"use client";

import {
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

  /* ---------- 选区检测 ---------- */

  function getSelectionOffset(): number | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      let cur: HTMLElement | null =
        node.parentElement;
      while (cur && cur !== rootRef.current) {
        const base = cur.getAttribute("data-offset");
        if (base !== null) {
          return (
            parseInt(base, 10) + range.startOffset
          );
        }
        cur = cur.parentElement;
      }
    }
    return null;
  }

  function handleSelection() {
    if (editing) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 1 || text.length > 100) {
      return;
    }

    const startOffset = getSelectionOffset();
    if (startOffset === null) return;

    const occ = inferOccurrence(
      note.body,
      text,
      startOffset
    );

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setMenu({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text,
      occurrence: occ,
    });
  }

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
              onMouseUp={handleSelection}
              onTouchEnd={handleSelection}
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