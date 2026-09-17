"use client";

import { useState } from "react";

import type { WordBook, Word } from "@/data/study";

import BookFormModal from "@/components/apps/study/BookFormModal";

type Props = {
  books: WordBook[];
  words: Word[];
  onOpenBook: (bookId: string) => void;
  onCreateBook: (
    name: string,
    description: string
  ) => void;
  onRenameBook: (
    bookId: string,
    name: string,
    description: string
  ) => void;
  onDeleteBook: (bookId: string) => void;
  onOpenImport: () => void;
};

export default function BookList({
  books,
  words,
  onOpenBook,
  onCreateBook,
  onRenameBook,
  onDeleteBook,
  onOpenImport,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] =
    useState<WordBook | null>(null);

  function wordCountFor(bookId: string): number {
    return words.filter((w) => w.bookId === bookId).length;
  }

  function handleDelete(book: WordBook) {
    const cnt = wordCountFor(book.id);
    const msg =
      cnt > 0
        ? `删除「${book.name}」？这本词书里的 ${cnt} 个单词也会一起删除。`
        : `删除「${book.name}」？`;
    if (!window.confirm(msg)) return;
    onDeleteBook(book.id);
  }

  return (
    <>
      <div className="study-scroll">
        <div className="study-library-top">
          <div className="study-library-label">
            LIBRARY
          </div>
          <div className="study-library-top-actions">
            <button
              className="study-import-btn"
              onClick={onOpenImport}
            >
              导入 CSV
            </button>
            <button
              className="study-add-btn"
              onClick={() => {
                setEditingBook(null);
                setShowForm(true);
              }}
            >
              ＋ 新建
            </button>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="study-empty">
            <div className="study-empty-icon">▤</div>
            <div className="study-empty-title">
              还没有词书
            </div>
            <div className="study-empty-desc">
              点右上角 ＋ 建一本
            </div>
          </div>
        ) : (
          <ul className="study-book-list">
            {books.map((b) => {
              const cnt = wordCountFor(b.id);

              return (
                <li
                  key={b.id}
                  className="study-book-item"
                >
                  <button
                    className="study-book-main"
                    onClick={() => onOpenBook(b.id)}
                  >
                    <div className="study-book-cover">
                      {b.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="study-book-info">
                      <strong>{b.name}</strong>
                      <span className="study-book-meta">
                        {cnt} 个单词
                        {b.description
                          ? ` · ${b.description}`
                          : ""}
                      </span>
                    </div>
                  </button>

                  <div className="study-book-actions">
                    <button
                      className="study-book-action"
                      onClick={() => {
                        setEditingBook(b);
                        setShowForm(true);
                      }}
                      aria-label="编辑"
                    >
                      ✎
                    </button>
                    <button
                      className="study-book-action danger"
                      onClick={() => handleDelete(b)}
                      aria-label="删除"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && (
        <BookFormModal
          initial={editingBook}
          onClose={() => {
            setShowForm(false);
            setEditingBook(null);
          }}
          onConfirm={(name, description) => {
            if (editingBook) {
              onRenameBook(
                editingBook.id,
                name,
                description
              );
            } else {
              onCreateBook(name, description);
            }
          }}
        />
      )}
    </>
  );
}