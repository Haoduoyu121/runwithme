import type { WorldEvent } from "@/data/worldEvents";
import type { ICityPost } from "@/data/icity";
import { createPostId } from "@/data/icity";
import { pickWatchCard } from "@/lib/watchCards";
import { loadPhotoTextCards } from "@/lib/photoTextStorage";
import { loadWatchSettings } from "@/lib/watchSettings";

/** 附带 Photos 文字卡的概率 */
const ATTACH_PHOTO_CARD_CHANCE = 0.2;

export function tryConvertToICityPost(
  ev: WorldEvent
): ICityPost | null {
  if (ev.app !== "watch") return null;
  if (ev.type !== "session-end") return null;

  const partners = (ev.meta?.partners as unknown) ?? [];
  if (!Array.isArray(partners) || partners.length === 0) {
    return null;
  }

  const settings = loadWatchSettings();
  if (Math.random() >= settings.icityPostChance) {
    return null;
  }

  const partnerRaw =
    partners[Math.floor(Math.random() * partners.length)];
  const character: "Levi" | "Erwin" =
    partnerRaw === "levi" ? "Levi" : "Erwin";

  const card = pickWatchCard(character);
  const titleText =
    typeof ev.preview === "string" && ev.preview
      ? ev.preview
      : "刚才那个视频";

  const caption =
    card?.text?.trim() ||
    `刚才和你一起看了《${titleText}》。`;

  let textCardSnapshot: ICityPost["textCardSnapshot"] =
    undefined;

  if (Math.random() < ATTACH_PHOTO_CARD_CHANCE) {
    const photos = loadPhotoTextCards();
    const pool = photos.filter(
      (c) => c.author === character
    );
    if (pool.length > 0) {
      const pc =
        pool[Math.floor(Math.random() * pool.length)];
      textCardSnapshot = {
        author: pc.author,
        place: pc.place,
        weather: pc.weather,
        person: pc.person,
        action: pc.action,
        mood: pc.mood,
      };
    }
  }

  return {
    id: createPostId(),
    author: character,
    text: caption,
    timestamp: Date.now(),
    likes: [],
    textCardSnapshot,
  };
}