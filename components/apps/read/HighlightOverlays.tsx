"use client";

import { useEffect, useRef, useState } from "react";

import {
  Highlighter,
  PenLine,
  Trash2,
  X,
} from "lucide-react";

import type { Highlight } from "@/lib/readHighlights";

/* =========================================================
   浮动菜单 —— 选中文字后出现
   ========================================================= */

type ActionMenuProps = {
  rect: DOMRect;
  onHighlight: () => void;
  onNote: () => void;
  onClose: () => void;
};

export function HighlightActionMenu({
  rect,
  onHighlight,
  onNote,
  onClose,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* 让菜单出现在选区下方（避开 iOS 原生菜单） */
  const top = Math.min(
    rect.bottom + 8,
    window.innerHeight - 70
  );
  const left = Math.max(
    12,
    Math.min(
      rect.left + rect.width / 2 - 100,
      window.innerWidth - 212
    )
  );

  /* 点外部关闭 */
  useEffect(() => {
    function onDown(e: Event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="hl-menu"
      style={{ top, left }}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        className="hl-menu-btn"
        onClick={onHighlight}
      >
        <Highlighter size={14} strokeWidth={2.2} />
        高亮
      </button>
      <button
        className="hl-menu-btn"
        onClick={onNote}
      >
        <PenLine size={14} strokeWidth={2.2} />
        笔记
      </button>
    </div>
  );
}

/* =========================================================
   笔记编辑器
   ========================================================= */

type NoteEditorProps = {
  initial: string;
  quote: string;
  onSave: (note: string) => void;
  onCancel: () => void;
};

export function HighlightNoteEditor({
  initial,
  quote,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [text, setText] = useState(initial);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      taRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="hl-note-backdrop"
      onClick={onCancel}
    >
      <div
        className="hl-note-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hl-note-header">
          <h3>笔记</h3>
          <button
            onClick={onCancel}
            aria-label="关闭"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="hl-note-quote">
          {quote.length > 120
            ? quote.slice(0, 120) + "…"
            : quote}
        </div>

        <textarea
          ref={taRef}
          className="hl-note-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的想法…"
          rows={5}
        />

        <div className="hl-note-footer">
          <button
            className="hl-note-btn ghost"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="hl-note-btn"
            onClick={() => onSave(text)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   高亮详情（点击已有 mark 时）
   ========================================================= */

type DetailProps = {
  highlight: Highlight;
  onClose: () => void;
  onEditNote: () => void;
  onDelete: () => void;
};

export function HighlightDetail({
  highlight,
  onClose,
  onEditNote,
  onDelete,
}: DetailProps) {
  return (
    <div
      className="hl-note-backdrop"
      onClick={onClose}
    >
      <div
        className="hl-note-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hl-note-header">
          <h3>
            {highlight.author === "levi" && (
              <span className="hl-detail-author hl-detail-author-levi">
                Levi
              </span>
            )}
            {highlight.author === "erwin" && (
              <span className="hl-detail-author hl-detail-author-erwin">
                Erwin
              </span>
            )}
            {highlight.kind === "note" ? "笔记" : "高亮"}
          </h3>
          <button
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div className="hl-note-quote hl-note-quote-full">
          {highlight.text}
        </div>

        {highlight.note && (
          <div className="hl-detail-note">
            {highlight.note}
          </div>
        )}

        <div className="hl-note-footer">
          <button
            className="hl-note-btn danger"
            onClick={onDelete}
          >
            <Trash2 size={13} strokeWidth={2.4} />
            删除
          </button>
          <button
            className="hl-note-btn"
            onClick={onEditNote}
          >
            {highlight.note ? "改笔记" : "写笔记"}
          </button>
        </div>
      </div>
    </div>
  );
}