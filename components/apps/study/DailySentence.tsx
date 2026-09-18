"use client";

import { Star } from "lucide-react";

import type { DailySentence as DailySentenceType } from "@/data/study";

type Props = {
  sentence: DailySentenceType;
  collected: boolean;
  onToggle: () => void;
};

export default function DailySentence({
  sentence,
  collected,
  onToggle,
}: Props) {
  return (
    <div className="study-daily">
      <div className="study-daily-head">
        <span className="study-daily-label">每日一句</span>
        <button
          className={`study-daily-collect${
            collected ? " is-collected" : ""
          }`}
          onClick={onToggle}
          aria-label={collected ? "取消收藏" : "收藏"}
          type="button"
        >
          <Star
            size={18}
            strokeWidth={2}
            fill={collected ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="study-daily-text">
        {sentence.text}
      </div>

      {sentence.source && (
        <div className="study-daily-source">
          — {sentence.source}
        </div>
      )}
    </div>
  );
}