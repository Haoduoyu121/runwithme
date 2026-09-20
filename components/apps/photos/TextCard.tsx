"use client";

import type { PhotoTextCard } from "@/data/photoTextCards";
import { toAvatarKey } from "@/lib/useCharacterAvatars";

export type TextCardSnapshot = {
  author: "Levi" | "Erwin";
  place: string;
  weather: string;
  person: string;
  action: string;
  mood: string;
};

type Props = {
  card: PhotoTextCard | TextCardSnapshot;
  variant?: "grid" | "full" | "bubble";
  avatars: Record<string, string | null>;
};

export default function TextCard({
  card,
  variant = "grid",
  avatars,
}: Props) {
  const key = toAvatarKey(card.author);
  const url = key ? avatars[key] : null;

  return (
    <div
      className={`photo-text-card photo-text-card-${variant}`}
    >
      <div className="photo-text-card-main">
        <div className="photo-text-card-place">
          {card.place}
        </div>
        <div className="photo-text-card-line">
          {card.weather}
        </div>
        <div className="photo-text-card-line">
          {card.person}
        </div>
        <div className="photo-text-card-line">
          {card.action}
        </div>
      </div>

      <div className="photo-text-card-footer">
        <span
          className={`photo-text-card-footer-avatar photo-text-card-footer-avatar-${card.author.toLowerCase()}${
            url ? " has-image" : ""
          }`}
        >
          {url ? (
            <img src={url} alt={card.author} />
          ) : (
            card.author.charAt(0)
          )}
        </span>
        <span className="photo-text-card-footer-name">
          {card.author}
        </span>
        <span className="photo-text-card-footer-mood">
          · {card.mood}
        </span>
      </div>
    </div>
  );
}