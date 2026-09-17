"use client";

import { useEffect, useRef, useState } from "react";

import type { Word } from "@/data/study";

type CardItem = {
  /* 唯一 id：t-{wordId} / m-{wordId} */
  id: string;
  wordId: string;
  type: "text" | "meaning";
  label: string;
};

type Props = {
  words: Word[];
  /* 一批全部消完时回调，参数是本批的配对错误次数 */
  onBatchComplete: (wrongCount: number) => void;
};

/* 洗牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingMode({
  words,
  onBatchComplete,
}: Props) {
  /* 第一次渲染时生成卡片（父组件用 key={batchIndex} 强制重挂载） */
  const cardsRef = useRef<CardItem[] | null>(null);
  if (cardsRef.current === null) {
    const cards: CardItem[] = [];
    for (const w of words) {
      cards.push({
        id: `t-${w.id}`,
        wordId: w.id,
        type: "text",
        label: w.text,
      });
      cards.push({
        id: `m-${w.id}`,
        wordId: w.id,
        type: "meaning",
        label: w.meaning,
      });
    }
    cardsRef.current = shuffle(cards);
  }

  const cards = cardsRef.current;

  const [matched, setMatched] = useState<Set<string>>(
    () => new Set()
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [fading, setFading] = useState<string[]>([]);

  /* 全部消完 → 回调 */
  useEffect(() => {
    if (cards.length === 0) return;
    if (matched.size < cards.length) return;

    const t = window.setTimeout(() => {
      onBatchComplete(wrongCount);
    }, 600);

    return () => window.clearTimeout(t);
  }, [matched, cards.length, wrongCount, onBatchComplete]);

  function handleClick(card: CardItem) {
    /* 已匹配 / 正在错误闪烁 → 忽略 */
    if (matched.has(card.id)) return;
    if (wrongPair.length > 0) return;

    /* 再次点击同一张 → 取消选中 */
    if (selected.includes(card.id)) {
      setSelected(selected.filter((x) => x !== card.id));
      return;
    }

    const next = [...selected, card.id];
    setSelected(next);

    if (next.length !== 2) return;

    const a = cards.find((c) => c.id === next[0])!;
    const b = cards.find((c) => c.id === next[1])!;

    /* 匹配成功条件：wordId 相同 + 一个 text 一个 meaning */
    if (a.wordId === b.wordId && a.type !== b.type) {
      /* 先播放淡出动画 */
      setFading([a.id, b.id]);

      window.setTimeout(() => {
        setMatched((prev) => {
          const s = new Set(prev);
          s.add(a.id);
          s.add(b.id);
          return s;
        });
        setSelected([]);
        setFading([]);
      }, 350);
      return;
    }

    /* 匹配失败 */
    setWrongPair([a.id, b.id]);
    setWrongCount((n) => n + 1);

    window.setTimeout(() => {
      setWrongPair([]);
      setSelected([]);
    }, 700);
  }

  return (
    <div className="study-match-body">
      <div
        className="study-match-grid"
        data-count={cards.length}
      >
        {cards.map((card) => {
          const isMatched = matched.has(card.id);
          const isSelected = selected.includes(card.id);
          const isWrong = wrongPair.includes(card.id);
          const isFading = fading.includes(card.id);

          return (
            <button
              key={card.id}
              type="button"
              className={`study-match-card${
                card.type === "text"
                  ? " study-match-card-text"
                  : " study-match-card-meaning"
              }${isSelected ? " is-selected" : ""}${
                isMatched ? " is-matched" : ""
              }${isWrong ? " is-wrong" : ""}${
                isFading ? " is-fading" : ""
              }`}
              onClick={() => handleClick(card)}
              disabled={isMatched}
            >
              {card.label}
            </button>
          );
        })}
      </div>

      <div className="study-match-progress">
        <span>
          已配对 {matched.size / 2} / {cards.length / 2}
        </span>
        {wrongCount > 0 && (
          <span className="study-match-wrong-count">
            错误 {wrongCount} 次
          </span>
        )}
      </div>
    </div>
  );
}