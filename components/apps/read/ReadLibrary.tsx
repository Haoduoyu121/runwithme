"use client";

import { useEffect, useState } from "react";

import {
  BookOpen,
  ChevronLeft,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import type { ReadBook } from "@/data/read";
import { getReadCover } from "@/lib/readCoverFiles";

import ReadBookEditSheet from "./ReadBookEditSheet";

type ReadLibraryProps = {
  books: ReadBook[];
  onOpen: (id: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onRefresh: () => void;
};

export default function ReadLibrary({
  books,
  onOpen,
  onAdd,
  onBack,
  onRefresh,
}: ReadLibraryProps) {
  const [coverUrls, setCoverUrls] = useState<
    Record<string, string>
  >({});
  const [editBookId, setEditBookId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const b of books) {
        if (!b.coverImageId) continue;
        try {
          const blob = await getReadCover(
            b.coverImageId
          );
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[b.id] = url;
        } catch (e) {
          console.error("[Read] 加载封面失败:", e);
        }
      }
      if (!cancelled) setCoverUrls(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [books]);

  const editingBook = editBookId
    ? books.find((b) => b.id === editBookId) ?? null
    : null;

  function progressLabel(book: ReadBook): string {
    if (book.charCount === 0) return "空";
    return `${book.progress.chapterIndex + 1} 章`;
  }

  return (
    <>
      <header className="read-library-header">
        <button
          className="read-library-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <h1 className="read-library-title">Read</h1>

        <span className="read-library-count">
          {books.length > 0 ? `${books.length} 本` : ""}
        </span>
      </header>

      <div className="read-library-scroll">
        {books.length === 0 ? (
          <div className="read-library-empty">
            <div className="read-library-empty-icon">
              <BookOpen size={32} strokeWidth={1.5} />
            </div>
            <div className="read-library-empty-title">
              书架还是空的
            </div>
            <div className="read-library-empty-desc">
              导入本地 TXT / EPUB，或从书源添加
            </div>
            <button
              className="read-library-empty-btn"
              onClick={onAdd}
            >
              <Plus size={14} strokeWidth={2.6} />
              添加一本书
            </button>
          </div>
        ) : (
          <div className="read-library-grid">
            {books.map((b) => {
              const coverUrl = coverUrls[b.id];
              return (
                <div
                  key={b.id}
                  className="read-library-book"
                >
                  <button
                    className="read-library-book-main"
                    onClick={() => onOpen(b.id)}
                  >
                    <div
                      className="read-library-book-cover"
                      style={
                        coverUrl
                          ? {
                              backgroundImage: `url(${coverUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : { background: b.coverColor }
                      }
                    >
                      {!coverUrl && (
                        <span className="read-library-book-cover-title">
                          {b.title.slice(0, 20)}
                        </span>
                      )}
                    </div>

                    <div className="read-library-book-info">
                      <div className="read-library-book-title">
                        {b.title}
                      </div>
                      <div className="read-library-book-author">
                        {b.author || "佚名"}
                      </div>
                      <div className="read-library-book-progress">
                        {progressLabel(b)}
                      </div>
                    </div>
                  </button>

                  <button
                    className="read-library-book-menu"
                    onClick={() => setEditBookId(b.id)}
                    aria-label="编辑"
                  >
                    <MoreHorizontal
                      size={16}
                      strokeWidth={2.4}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {books.length > 0 && (
        <button
          className="read-library-fab"
          onClick={onAdd}
          aria-label="添加书"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      )}

      {editingBook && (
        <ReadBookEditSheet
          book={editingBook}
          onClose={() => setEditBookId(null)}
          onSaved={() => {
            onRefresh();
          }}
          onDeleted={() => {
            setEditBookId(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}