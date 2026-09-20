import type {
  PhotoTextCard,
  PhotoTextPending,
  PhotoTextPools,
  PhotoTextPoolKey,
} from "@/data/photoTextCards";
import { DEFAULT_PHOTO_TEXT_POOLS } from "@/data/photoTextCards";

const CARDS_KEY = "runwithme_photo_text_cards";
const POOLS_KEY = "runwithme_photo_text_pools";
const PENDING_KEY = "runwithme_photo_text_pending";

/* ---------- Cards ---------- */

function normalizeAuthor(v: unknown): "Levi" | "Erwin" {
  return v === "Erwin" ? "Erwin" : "Levi";
}

export function loadPhotoTextCards(): PhotoTextCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.place === "string" &&
          typeof c.weather === "string" &&
          typeof c.person === "string" &&
          typeof c.action === "string" &&
          typeof c.mood === "string" &&
          typeof c.createdAt === "number"
      )
      .map(
        (c): PhotoTextCard => ({
          id: c.id,
          author: normalizeAuthor(c.author),
          place: c.place,
          weather: c.weather,
          person: c.person,
          action: c.action,
          mood: c.mood,
          createdAt: c.createdAt,
          sentToChat:
            typeof c.sentToChat === "boolean"
              ? c.sentToChat
              : undefined,
          sentToICity:
            typeof c.sentToICity === "boolean"
              ? c.sentToICity
              : undefined,
        })
      );
  } catch {
    return [];
  }
}

export function savePhotoTextCards(
  list: PhotoTextCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CARDS_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Pools ---------- */

function normalizePool(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export function loadPhotoTextPools(): PhotoTextPools {
  if (typeof window === "undefined")
    return DEFAULT_PHOTO_TEXT_POOLS;

  try {
    const raw = window.localStorage.getItem(POOLS_KEY);
    if (!raw) {
      window.localStorage.setItem(
        POOLS_KEY,
        JSON.stringify(DEFAULT_PHOTO_TEXT_POOLS)
      );
      return DEFAULT_PHOTO_TEXT_POOLS;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return DEFAULT_PHOTO_TEXT_POOLS;

    const keys: PhotoTextPoolKey[] = [
      "place",
      "weather",
      "person",
      "action",
      "mood",
    ];

    const result: PhotoTextPools = {
      place: [],
      weather: [],
      person: [],
      action: [],
      mood: [],
    };

    keys.forEach((k) => {
      const pool = normalizePool(
        (parsed as Record<string, unknown>)[k]
      );
      result[k] =
        pool.length > 0
          ? pool
          : DEFAULT_PHOTO_TEXT_POOLS[k];
    });

    return result;
  } catch {
    return DEFAULT_PHOTO_TEXT_POOLS;
  }
}

export function savePhotoTextPools(
  pools: PhotoTextPools
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    POOLS_KEY,
    JSON.stringify(pools)
  );
}

/* ---------- Pending ---------- */

export function loadPhotoTextPending(): PhotoTextPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.resolveAt !== "number" ||
      !Array.isArray(parsed.cards)
    ) {
      return null;
    }
    return {
      id: parsed.id,
      resolveAt: parsed.resolveAt,
      cards: parsed.cards
        .filter(
          (c: unknown): c is PhotoTextCard =>
            !!c &&
            typeof (c as PhotoTextCard).id ===
              "string"
        )
        .map(
          (c: PhotoTextCard): PhotoTextCard => ({
            ...c,
            author: normalizeAuthor(c.author),
          })
        ),
    };
  } catch {
    return null;
  }
}

export function savePhotoTextPending(
  pending: PhotoTextPending | null
): void {
  if (typeof window === "undefined") return;
  if (pending === null) {
    window.localStorage.removeItem(PENDING_KEY);
    return;
  }
  window.localStorage.setItem(
    PENDING_KEY,
    JSON.stringify(pending)
  );
}