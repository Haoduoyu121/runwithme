"use client";

import { useState } from "react";

import type {
  SessionPartner,
  StudyMistake,
  Word,
  WordBook,
} from "@/data/study";

type Props = {
  books: WordBook[];
  words: Word[];
  mistakes: StudyMistake[];
  onStart: (
    partner: SessionPartner,
    bookId: string
  ) => void;
  onStartMistakes: (partner: SessionPartner) => void;
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
  mistakes,
  onStart,
  onStartMistakes,
}: Props) {
  const [partner, setPartner] =
    useState<SessionPartner | null>(null);

  /* 错题集里有效的（词还存在） */
  const validMistakeIds = mistakes
    .map((m) => m.wordId)
    .filter((id) => words.some((w) => w.id === id));

  function wordCountFor(bookId: string): number {
    return words.filter((w) => w.bookId === bookId)
      .length;
  }

  const booksWithWords = books.filter(
    (b) => wordCountFor(b.id) > 0
  );

  return (
    <div className="study-scroll">
      {/* 错题集入口 */}
      {validMistakeIds.length > 0 && (
        <div className="study-mistakes-entry">
          <div className="study-mistakes-info">
            <div className="study-mistakes-label">
              MISTAKES
            </div>
            <div className="study-mistakes-title">
              错题集
            </div>
            <div className="study-mistakes-count">
              {validMistakeIds.length} 个待巩固
            </div>
          </div>

          <button
            className="study-mistakes-btn"
            onClick={() => {
              const p = partner ?? "levi";
              onStartMistakes(p);
            }}
          >
            开始练错题
          </button>
        </div>
      )}

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