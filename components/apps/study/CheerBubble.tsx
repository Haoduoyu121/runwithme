"use client";

import { useEffect } from "react";

import {
  CHEER_BUBBLE_DURATION_MS,
  type StudyCheerCard,
} from "@/data/study";

import {
  useCharacterAvatars,
  toAvatarKey,
} from "@/lib/useCharacterAvatars";

type Props = {
  card: StudyCheerCard;
  onDone: () => void;
};

export default function CheerBubble({ card, onDone }: Props) {
  /* ★ 统一头像 */
  const avatars = useCharacterAvatars();

  useEffect(() => {
    const t = window.setTimeout(onDone, CHEER_BUBBLE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [card.id, onDone]);

  const key = toAvatarKey(card.character);
  const avatarUrl = key ? avatars[key] : null;

  return (
    <div
      className="study-cheer-bubble"
      onClick={onDone}
      role="button"
      tabIndex={0}
    >
      <span
        className={`study-cheer-avatar study-cheer-avatar-${card.character.toLowerCase()}${
          avatarUrl ? " has-image" : ""
        }`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={card.character}
          />
        ) : (
          card.character.charAt(0)
        )}
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