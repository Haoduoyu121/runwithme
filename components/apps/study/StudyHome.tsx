"use client";

import { useState } from "react";

import type {
  SessionPartner,
  Word,
  WordBook,
} from "@/data/study";

type Props = {
  books: WordBook[];
  words: Word[];
  onStart: (
    partner: SessionPartner,
    bookId: string
  ) => void;
};

const PARTNERS: {
  key: SessionPartner;
  name: string;
  initial: string;
  sub: string;
}[] = [
  {
    key: "levi",
    name: "和 Levi 一起学习",
    initial: "L",
    sub: "Levi 来念单词",
  },
  {
    key: "erwin",
    name: "和 Erwin 一起学习",
    initial: "E",
    sub: "Erwin 来念单词",
  },
  {
    key: "both",
    name: "一起学习",
    initial: "L&E",
    sub: "随机轮换着念",
  },
];

export default function StudyHome({
  books,
  words,
  onStart,
}: Props) {
  const [partner, setPartner] =
    useState<SessionPartner | null>(null);

  function wordCountFor(bookId: string): number {
    return words.filter((w) => w.bookId === bookId)
      .length;
  }

  const booksWithWords = books.filter(
    (b) => wordCountFor(b.id) > 0
  );

  return (
    <div className="study-scroll">
      <div className="study-home-label">和谁一起学？</div>

      <div className="study-partner-grid">
        {PARTNERS.map((p) => (
          <button
            key={p.key}
            className={`study-partner-card study-partner-${p.key}${
              partner === p.key ? " active" : ""
            }`}
            onClick={() => setPartner(p.key)}
            type="button"
          >
            <div className="study-partner-avatar">
              {p.initial}
            </div>
            <div className="study-partner-info">
              <strong>{p.name}</strong>
              <span>{p.sub}</span>
            </div>
          </button>
        ))}
      </div>

      {partner && (
        <>
          <div className="study-home-label study-home-label-second">
            选择词书
          </div>

          {booksWithWords.length === 0 ? (
            <div className="study-empty">
              <div className="study-empty-icon">▤</div>
              <div className="study-empty-title">
                还没有单词
              </div>
              <div className="study-empty-desc">
                先在 Library 里添加一些单词
              </div>
            </div>
          ) : (
            <ul className="study-home-book-list">
              {booksWithWords.map((b) => (
                <li key={b.id}>
                  <button
                    className="study-home-book-item"
                    onClick={() => onStart(partner, b.id)}
                    type="button"
                  >
                    <div className="study-book-cover">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="study-book-info">
                      <strong>{b.name}</strong>
                      <span className="study-book-meta">
                        {wordCountFor(b.id)} 个单词
                      </span>
                    </div>
                    <span className="study-home-book-arrow">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}