"use client";

import { useState } from "react";

import type {
  SessionPartner,
  StudyMistake,
  Word,
  WordBook,
} from "@/data/study";

import { useCharacterAvatars } from "@/lib/useCharacterAvatars";

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
  /* ★ 统一头像 */
  const avatars = useCharacterAvatars();

  const [partner, setPartner] =
    useState<SessionPartner | null>(null);

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

  /* ★ 渲染单个 partner 头像 */
  function renderPartnerAvatar(key: SessionPartner) {
    if (key === "both") {
      const hasBoth = avatars.levi && avatars.erwin;
      return (
        <div
          className={`study-partner-avatar${
            hasBoth ? " has-image" : ""
          }`}
        >
          {hasBoth ? (
            <span className="study-partner-avatar-both">
              <img src={avatars.levi!} alt="Levi" />
              <img src={avatars.erwin!} alt="Erwin" />
            </span>
          ) : (
            "L&E"
          )}
        </div>
      );
    }

    const url = avatars[key];
    return (
      <div
        className={`study-partner-avatar${
          url ? " has-image" : ""
        }`}
      >
        {url ? (
          <img
            src={url}
            alt={key === "levi" ? "Levi" : "Erwin"}
          />
        ) : key === "levi" ? (
          "L"
        ) : (
          "E"
        )}
      </div>
    );
  }

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
            {renderPartnerAvatar(p.key)}
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