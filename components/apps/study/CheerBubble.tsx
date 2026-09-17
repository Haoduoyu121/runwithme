"use client";

import { useEffect } from "react";

import {
  CHEER_BUBBLE_DURATION_MS,
  type StudyCheerCard,
} from "@/data/study";

type Props = {
  card: StudyCheerCard;
  onDone: () => void;
};

export default function CheerBubble({ card, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, CHEER_BUBBLE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [card.id, onDone]);

  return (
    <div
      className="study-cheer-bubble"
      onClick={onDone}
      role="button"
      tabIndex={0}
    >
      <span
        className={`study-cheer-avatar study-cheer-avatar-${card.character.toLowerCase()}`}
      >
        {card.character.charAt(0)}
      </span>

      <span className="study-cheer-content">
        <span className="study-cheer-name">
          {card.character}
        </span>
        <span className="study-cheer-text">{card.text}</span>
      </span>
    </div>
  );
}