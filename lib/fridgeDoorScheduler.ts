import {
  NOTE_COLORS,
  SYS_CHECK_MAX_MS,
  SYS_CHECK_MIN_MS,
  SYS_TRIGGER_CHANCE,
  createFridgeDoorItemId,
  type FridgeDoorItem,
} from "@/data/fridgeDoor";

import {
  addFridgeDoorItem,
  loadFridgeCards,
  loadLastSysCheck,
  makeNoteExpiry,
  saveLastSysCheck,
} from "./fridgeDoorStorage";

import {
  loadSignatures,
  pickSignature,
} from "./fridgeSignatureStorage";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function runFridgeDoorSystemCheck(): FridgeDoorItem | null {
  const now = Date.now();
  const last = loadLastSysCheck();

  // 首次打开 → 只记时间
  if (last === 0) {
    saveLastSysCheck(now);
    return null;
  }

  const needed = randInt(SYS_CHECK_MIN_MS, SYS_CHECK_MAX_MS);
  if (now - last < needed) return null;

  saveLastSysCheck(now);

  if (Math.random() >= SYS_TRIGGER_CHANCE) return null;

  const cards = loadFridgeCards().filter((c) => c.enabled);
  if (cards.length === 0) return null;

  const card = cards[Math.floor(Math.random() * cards.length)];

  if (card.kind === "note" && card.text) {
    const sigs = loadSignatures();
    const signature = pickSignature(sigs, card.owner);

    const item: FridgeDoorItem = {
      id: createFridgeDoorItemId(),
      kind: "note",
      owner: card.owner,
      x: randInt(10, 75),
      y: randInt(10, 70),
      rotation: randInt(-8, 8),
      createdAt: now,
      text: card.text,
      colorIdx: randInt(0, NOTE_COLORS.length - 1),
      expiresAt: makeNoteExpiry(),
      signature,
    };
    addFridgeDoorItem(item);
    return item;
  }

  if (card.kind === "note" && card.text) {
    const item: FridgeDoorItem = {
      id: createFridgeDoorItemId(),
      kind: "note",
      owner: card.owner,
      x: randInt(10, 75),
      y: randInt(10, 70),
      rotation: randInt(-8, 8),
      createdAt: now,
      text: card.text,
      colorIdx: randInt(0, NOTE_COLORS.length - 1),
      expiresAt: makeNoteExpiry(),
    };
    addFridgeDoorItem(item);
    return item;
  }

  return null;
}