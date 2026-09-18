"use client";

import { useEffect, useState } from "react";

import { Volume2, VolumeX } from "lucide-react";

import type { Word } from "@/data/study";

type Props = {
  word: Word;
  onKnown: () => void;
  onUnknown: () => void;
  canPrev: boolean;
  onPrev: () => void;
  playing: boolean;
  onPlay: () => void;
};

export default function FlashcardMode({
  word,
  onKnown,
  onUnknown,
  canPrev,
  onPrev,
  playing,
  onPlay,
}: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [word.id]);

  return (
    <>
      <div className="study-session-body">
        <div className="study-flip-scene">
          <button
            className={`study-flip-card${
              flipped ? " is-flipped" : ""
            }`}
            onClick={() => setFlipped((v) => !v)}
            type="button"
            aria-label={flipped ? "显示单词" : "显示释义"}
          >
            {!flipped ? (
              <div className="study-flip-face study-flip-front">
                <div className="study-flip-word">
                  {word.text}
                </div>

                <span
                  className={`study-flip-play${
                    playing ? " is-playing" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay();
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="播放发音"
                >
                  {playing ? (
                    <VolumeX size={20} strokeWidth={2} />
                  ) : (
                    <Volume2 size={20} strokeWidth={2} />
                  )}
                </span>

                <div className="study-flip-hint">
                  点一下看释义
                </div>
              </div>
            ) : (
              <div className="study-flip-face study-flip-back">
                <div className="study-flip-meaning">
                  {word.meaning}
                </div>
                {word.example && (
                  <div className="study-flip-example">
                    {word.example}
                  </div>
                )}
                <div className="study-flip-hint">
                  点一下回到单词
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="study-session-controls">
        {!flipped ? (
          <>
            <button
              className="study-session-btn"
              onClick={onPrev}
              disabled={!canPrev}
            >
              ‹ 上一个
            </button>
            <button
              className="study-session-btn primary"
              onClick={() => setFlipped(true)}
            >
              看释义
            </button>
          </>
        ) : (
          <>
            <button
              className="study-session-btn study-session-btn-unknown"
              onClick={onUnknown}
            >
              我不认识
            </button>
            <button
              className="study-session-btn study-session-btn-known"
              onClick={onKnown}
            >
              我认识
            </button>
          </>
        )}
      </div>
    </>
  );
}