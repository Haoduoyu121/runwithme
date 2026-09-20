import type {
  Note,
  WishlistItem,
  WishlistCard,
  WishlistSource,
  WishlistCompleter,
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
      .map((n): Note => {
        const author =
          n.author === "Levi" || n.author === "Erwin"
            ? n.author
            : "user";
        const kind: Note["kind"] =
          n.kind === "diary" ? "diary" : "note";

        return {
          id: n.id,
          kind,
          author,
          title:
            typeof n.title === "string" ? n.title : "",
          body:
            typeof n.body === "string" ? n.body : "",
          tags: Array.isArray(n.tags)
            ? n.tags.filter(
                (t: unknown): t is string =>
                  typeof t === "string"
              )
            : [],
          mood:
            typeof n.mood === "string" && n.mood
              ? n.mood
              : undefined,
          createdAt: n.createdAt,
          updatedAt:
            typeof n.updatedAt === "number"
              ? n.updatedAt
              : n.createdAt,
        };
      });
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

function normalizeCompleter(
  v: unknown
): WishlistCompleter | null {
  if (
    v === "user" ||
    v === "Levi" ||
    v === "Erwin"
  )
    return v;
  return null;
}

function normalizeCompletedBy(
  raw: unknown
): WishlistCompleter[] | undefined {
  // 老格式：字符串
  if (typeof raw === "string") {
    const v = normalizeCompleter(raw);
    return v ? [v] : undefined;
  }
  // 新格式：数组
  if (Array.isArray(raw)) {
    const arr: WishlistCompleter[] = [];
    raw.forEach((x) => {
      const v = normalizeCompleter(x);
      if (v && !arr.includes(v)) arr.push(v);
    });
    return arr.length > 0 ? arr : undefined;
  }
  return undefined;
}

export function loadWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (w) =>
          w &&
          typeof w.id === "string" &&
          typeof w.text === "string"
      )
      .map((w): WishlistItem => {
        const source: WishlistSource =
          w.source === "levi" || w.source === "erwin"
            ? w.source
            : "user";

        const character: "Levi" | "Erwin" | undefined =
          w.character === "Levi" ||
          w.character === "Erwin"
            ? w.character
            : undefined;

        return {
          id: w.id,
          text:
            typeof w.text === "string" ? w.text : "",
          completed:
            typeof w.completed === "boolean"
              ? w.completed
              : false,
          source,
          character,
          createdAt:
            typeof w.createdAt === "number"
              ? w.createdAt
              : Date.now(),
          completedBy: normalizeCompletedBy(
            w.completedBy
          ),
          completedAt:
            typeof w.completedAt === "number"
              ? w.completedAt
              : undefined,
          completionNote:
            typeof w.completionNote === "string"
              ? w.completionNote
              : undefined,
          inMemory:
            typeof w.inMemory === "boolean"
              ? w.inMemory
              : undefined,
          pendingUntil:
            typeof w.pendingUntil === "number"
              ? w.pendingUntil
              : undefined,
        };
      });
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