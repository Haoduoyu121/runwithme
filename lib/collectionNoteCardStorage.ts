/* =========================================================
   RunWithme · Collection Note Cards 存储
   ========================================================= */

import {
  DEFAULT_COLLECTION_NOTE_CARDS,
  type CollectionNoteCard,
  type CollectionNoteOwner,
} from "@/data/collectionNoteCards";

const KEY = "runwithme_collection_note_cards_v1";

/* ---------- 读写 ---------- */

export function loadCollectionNoteCards(): CollectionNoteCard[] {
  if (typeof window === "undefined") {
    return DEFAULT_COLLECTION_NOTE_CARDS;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_COLLECTION_NOTE_CARDS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_COLLECTION_NOTE_CARDS;
    }
    return parsed.filter(isValid);
  } catch (error) {
    console.error("读取收藏备注卡池失败:", error);
    return DEFAULT_COLLECTION_NOTE_CARDS;
  }
}

export function saveCollectionNoteCards(
  cards: CollectionNoteCard[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cards));
  } catch (error) {
    console.error("保存收藏备注卡池失败:", error);
  }
}

function isValid(v: unknown): v is CollectionNoteCard {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.text === "string" &&
    typeof x.enabled === "boolean" &&
    (x.owner === "levi" ||
      x.owner === "erwin" ||
      x.owner === "both")
  );
}

/* ---------- 抽取 ---------- */

/* owner: 收藏归属（levi / erwin）。
   会同时匹配 owner === owner 或 owner === "both" 的卡。 */
export function pickCollectionNoteCard(
  cards: CollectionNoteCard[],
  owner: "levi" | "erwin"
): CollectionNoteCard | null {
  const eligible = cards.filter(
    (c) =>
      c.enabled && (c.owner === owner || c.owner === "both")
  );
  if (eligible.length === 0) return null;
  return eligible[
    Math.floor(Math.random() * eligible.length)
  ];
}

/* ---------- 批量添加 / 更新 ---------- */

export function addCollectionNoteCard(
  cards: CollectionNoteCard[],
  text: string,
  owner: CollectionNoteOwner = "both"
): CollectionNoteCard[] {
  const t = text.trim();
  if (!t) return cards;
  const next: CollectionNoteCard = {
    id: `cnc-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    text: t,
    enabled: true,
    owner,
  };
  return [...cards, next];
}