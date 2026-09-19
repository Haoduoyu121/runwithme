"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { Highlight } from "@/lib/readHighlights";

type HighlightsDrawerProps = {
  highlights: Highlight[];
  onClose: () => void;
  onJump: (chapterIndex: number, startOffset: number) => void;
  onDelete: (id: string) => void;
};

type Filter = "all" | "user" | "levi" | "erwin";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "user", label: "我的" },
  { key: "levi", label: "Levi" },
  { key: "erwin", label: "Erwin" },
];

export default function HighlightsDrawer({
  highlights,
  onClose,
  onJump,
  onDelete,
}: HighlightsDrawerProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = highlights.filter((h) => {
    if (filter === "all") return true;
    return h.author === filter;
  });

  const groups: {
    chapterIndex: number;
    items: Highlight[];
  }[] = [];
  for (const h of filtered) {
    const g = groups.find(
      (x) => x.chapterIndex === h.chapterIndex
    );
    if (g) g.items.push(h);
    else
      groups.push({
        chapterIndex: h.chapterIndex,
        items: [h],
      });
  }
  groups.sort((a, b) => a.chapterIndex - b.chapterIndex);

  const counts: Record<Filter, number> = {
    all: highlights.length,
    user: highlights.filter((h) => h.author === "user").length,
    levi: highlights.filter((h) => h.author === "levi").length,
    erwin: highlights.filter((h) => h.author === "erwin")
      .length,
  };

  return (
    <div
      className="hl-drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="hl-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hl-drawer-header">
          <h2>高亮</h2>
          <button onClick={onClose} aria-label="关闭">
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="hl-drawer-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={
                filter === f.key
                  ? `hl-drawer-tab hl-drawer-tab-${f.key} active`
                  : `hl-drawer-tab hl-drawer-tab-${f.key}`
              }
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="hl-drawer-tab-count">
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="hl-drawer-list">
          {filtered.length === 0 ? (
            <div className="hl-drawer-empty">
              {filter === "all" &&
                "还没有高亮。选中书里的文字，即可添加。"}
              {filter === "user" && "你还没有划过。"}
              {filter === "levi" && "Levi 还没有划过。"}
              {filter === "erwin" && "Erwin 还没有划过。"}
            </div>
          ) : (
            groups.map((g) => (
              <section
                key={g.chapterIndex}
                className="hl-drawer-group"
              >
                <div className="hl-drawer-group-title">
                  第 {g.chapterIndex + 1} 章
                </div>
                {g.items.map((h) => (
                  <div
                    key={h.id}
                    className={`hl-drawer-item hl-drawer-item-${h.author}`}
                  >
                    <button
                      className="hl-drawer-item-main"
                      onClick={() => {
                        onJump(
                          h.chapterIndex,
                          h.startOffset
                        );
                        onClose();
                      }}
                    >
                      <div className="hl-drawer-item-text">
                        {h.text.length > 80
                          ? h.text.slice(0, 80) + "…"
                          : h.text}
                      </div>
                      {h.note && (
                        <div className="hl-drawer-item-note">
                          {h.note}
                        </div>
                      )}
                    </button>
                    <button
                      className="hl-drawer-item-delete"
                      onClick={() => onDelete(h.id)}
                      aria-label="删除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}