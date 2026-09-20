import {
  DEFAULT_FRIDGE_CARDS,
  MAX_NOTES,
  MAX_STICKERS,
  NOTE_LIFE_MS,
  type FridgeCard,
  type FridgeDoorItem,
} from "@/data/fridgeDoor";

const ITEMS_KEY = "runwithme_fridge_door_items_v1";
const CARDS_KEY = "runwithme_fridge_door_cards_v1";
const LAST_CHECK_KEY = "runwithme_fridge_door_lastcheck_v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (e) {
    console.error("[fridgeDoor] save fail", key, e);
  }
}

/* ---------- items ---------- */

export function loadFridgeDoorItems(): FridgeDoorItem[] {
  return load<FridgeDoorItem[]>(ITEMS_KEY, []);
}

export function saveFridgeDoorItems(
  list: FridgeDoorItem[]
): void {
  save(ITEMS_KEY, list);
}

export function addFridgeDoorItem(
  item: FridgeDoorItem
): FridgeDoorItem[] {
  let list = [...loadFridgeDoorItems(), item];

  const stickers = list
    .filter((i) => i.kind === "sticker")
    .sort((a, b) => a.createdAt - b.createdAt);
  if (stickers.length > MAX_STICKERS) {
    const overflow = new Set(
      stickers
        .slice(0, stickers.length - MAX_STICKERS)
        .map((s) => s.id)
    );
    list = list.filter((i) => !overflow.has(i.id));
  }

  const notes = list
    .filter((i) => i.kind === "note")
    .sort((a, b) => a.createdAt - b.createdAt);
  if (notes.length > MAX_NOTES) {
    const overflow = new Set(
      notes
        .slice(0, notes.length - MAX_NOTES)
        .map((n) => n.id)
    );
    list = list.filter((i) => !overflow.has(i.id));
  }

  saveFridgeDoorItems(list);
  return list;
}

export function updateFridgeDoorItem(
  id: string,
  patch: Partial<FridgeDoorItem>
): FridgeDoorItem[] {
  const list = loadFridgeDoorItems();
  const next = list.map((i) =>
    i.id === id ? { ...i, ...patch } : i
  );
  saveFridgeDoorItems(next);
  return next;
}

export function removeFridgeDoorItem(
  id: string
): FridgeDoorItem[] {
  const list = loadFridgeDoorItems();
  const next = list.filter((i) => i.id !== id);
  saveFridgeDoorItems(next);
  return next;
}

export function cleanupExpiredItems(): FridgeDoorItem[] {
  const now = Date.now();
  const list = loadFridgeDoorItems();
  const next = list.filter(
    (i) =>
      i.kind !== "note" ||
      !i.expiresAt ||
      i.expiresAt > now
  );
  if (next.length !== list.length) {
    saveFridgeDoorItems(next);
  }
  return next;
}

export function makeNoteExpiry(): number {
  return Date.now() + NOTE_LIFE_MS;
}

/* ---------- cards ---------- */

export function loadFridgeCards(): FridgeCard[] {
  const raw = load<FridgeCard[]>(CARDS_KEY, []);
  if (raw.length === 0) return DEFAULT_FRIDGE_CARDS;
  return raw;
}

export function saveFridgeCards(list: FridgeCard[]): void {
  save(CARDS_KEY, list);
}

export function resetFridgeCards(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CARDS_KEY);
}

/* ---------- system check time ---------- */

export function loadLastSysCheck(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_CHECK_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function saveLastSysCheck(t: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_CHECK_KEY, String(t));
  } catch {}
}