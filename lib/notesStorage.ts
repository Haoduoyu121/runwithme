import type {
  Note,
  WishlistItem,
  WishlistCard,
} from "@/data/notes";

import { DEFAULT_WISHLIST_CARDS } from "@/data/wishlistCards";

const NOTES_KEY = "runwithme_notes";
const WISHLIST_KEY = "runwithme_wishlist";
const WISHLIST_CARDS_KEY = "runwithme_wishlist_cards";

/* ---------- Notes ---------- */

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

   return parsed
  .filter(
    (n) =>
      n &&
      typeof n.id === "string" &&
      typeof n.createdAt === "number"
  )
  .map(
    (n): Note => ({
      ...n,
      title: typeof n.title === "string" ? n.title : "",
      body: typeof n.body === "string" ? n.body : "",
      tags: Array.isArray(n.tags)
        ? n.tags.filter(
            (t: unknown): t is string =>
              typeof t === "string"
          )
        : [],
      updatedAt:
        typeof n.updatedAt === "number"
          ? n.updatedAt
          : n.createdAt,
    })
  );
  } catch {
    return [];
  }
}

export function saveNotes(list: Note[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    NOTES_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Wishlist ---------- */

export function loadWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.text === "string"
    );
  } catch {
    return [];
  }
}

export function saveWishlist(list: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WISHLIST_KEY,
    JSON.stringify(list)
  );
}

/* ---------- Wishlist Cards ---------- */

export function loadWishlistCards(): WishlistCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_WISHLIST_CARDS;
  }

  try {
    const raw = window.localStorage.getItem(
      WISHLIST_CARDS_KEY
    );

    if (!raw) {
      window.localStorage.setItem(
        WISHLIST_CARDS_KEY,
        JSON.stringify(DEFAULT_WISHLIST_CARDS)
      );
      return DEFAULT_WISHLIST_CARDS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_WISHLIST_CARDS;
    }

    return parsed.filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.text === "string" &&
        (c.character === "Levi" ||
          c.character === "Erwin") &&
        typeof c.enabled === "boolean"
    );
  } catch {
    return DEFAULT_WISHLIST_CARDS;
  }
}

export function saveWishlistCards(
  list: WishlistCard[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WISHLIST_CARDS_KEY,
    JSON.stringify(list)
  );
}