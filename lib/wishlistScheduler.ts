import type {
  WishlistItem,
  WishlistCard,
  WishlistCompleter,
} from "@/data/notes";
import { createWishlistItemId } from "@/data/notes";
import type { HighlightCard } from "@/data/diaryHighlights";

const SCHED_KEY = "runwithme_wishlist_scheduler";
const HOUR = 60 * 60 * 1000;
const MIN_GAP = 16 * HOUR;
const MAX_GAP = 24 * HOUR;
const PENDING_MS = 60 * 1000;
const AUTO_COMPLETE_CHANCE = 0.17;

type SchedState = {
  lastCheckedAt: number;
  nextCheckAt: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function loadState(): SchedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCHED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lastCheckedAt !== "number" ||
      typeof parsed.nextCheckAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveState(s: SchedState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SCHED_KEY,
    JSON.stringify(s)
  );
}

/* ---------- 用户点 ✦ → 生成 pending ---------- */

export function createPendingWish(): WishlistItem {
  return {
    id: createWishlistItemId(),
    text: "",
    completed: false,
    source: "user",
    createdAt: Date.now(),
    pendingUntil: Date.now() + PENDING_MS,
  };
}

/* ---------- 结算 pending ---------- */

export function settlePendingWishes(
  wishlist: WishlistItem[],
  cards: WishlistCard[]
): WishlistItem[] {
  const now = Date.now();
  let changed = false;

  const next = wishlist.map((w) => {
    if (
      typeof w.pendingUntil !== "number" ||
      w.pendingUntil > now ||
      w.text
    ) {
      return w;
    }

    const enabled = cards.filter((c) => c.enabled);
    if (enabled.length === 0) return w;

    const card =
      enabled[Math.floor(Math.random() * enabled.length)];

    changed = true;
    const { pendingUntil: _omit, ...rest } = w;
    return {
      ...rest,
      text: card.text,
      source:
        card.character === "Levi" ? "levi" : "erwin",
      character: card.character,
      createdAt: Date.now(),
    } as WishlistItem;
  });

  return changed ? next : wishlist;
}

/* ---------- 16-24h 判定 ---------- */

export type AutoJudgeResult = {
  wishlist: WishlistItem[];
  /** 自动完成的项目（用于 UI 提示 + Memory 联动） */
  autoCompleted: WishlistItem[];
};

export function runAutoJudge(
  wishlist: WishlistItem[],
  cards: WishlistCard[],
  highlightCards: HighlightCard[]
): AutoJudgeResult {
  const now = Date.now();
  const state = loadState();

  if (!state) {
    saveState({
      lastCheckedAt: now,
      nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
    });
    return { wishlist, autoCompleted: [] };
  }

  if (now < state.nextCheckAt) {
    return { wishlist, autoCompleted: [] };
  }

  /* --- 1. 生成新 wishlist（原逻辑） --- */
  const enabled = cards.filter((c) => c.enabled);
  const newItems: WishlistItem[] = [];

  if (enabled.length > 0) {
    (["Levi", "Erwin"] as const).forEach(
      (character, i) => {
        if (Math.random() >= 0.6) return;
        const pool = enabled.filter(
          (c) => c.character === character
        );
        if (pool.length === 0) return;
        const card =
          pool[Math.floor(Math.random() * pool.length)];
        newItems.push({
          id: createWishlistItemId(),
          text: card.text,
          completed: false,
          source:
            character === "Levi" ? "levi" : "erwin",
          character,
          createdAt: now + i * 1000,
        });
      }
    );
  }

  let working = [...newItems, ...wishlist];

  /* --- 2. 角色自动勾选一条 --- */
  const autoCompleted: WishlistItem[] = [];

  const candidates = working.filter(
    (w) =>
      !w.completed &&
      !w.pendingUntil &&
      w.text.trim().length > 0
  );

  if (candidates.length > 0) {
    const wantLevi =
      Math.random() < AUTO_COMPLETE_CHANCE;
    const wantErwin =
      Math.random() < AUTO_COMPLETE_CHANCE;

    if (wantLevi || wantErwin) {
      const target =
        candidates[
          Math.floor(Math.random() * candidates.length)
        ];

      // 抽评价：优先对应作者，找不到就全池随机
      let note: string | undefined;
      const hlPool = highlightCards.filter(
        (c) => c.enabled
      );
      if (hlPool.length > 0) {
        const prefer = hlPool.filter(
          (c) =>
            (wantLevi && c.character === "Levi") ||
            (wantErwin && c.character === "Erwin")
        );
        const src =
          prefer.length > 0 ? prefer : hlPool;
        note =
          src[Math.floor(Math.random() * src.length)]
            .text;
      }

      const completedBy: WishlistCompleter[] = [];
      if (wantLevi) completedBy.push("Levi");
      if (wantErwin) completedBy.push("Erwin");

      const updated: WishlistItem = {
        ...target,
        completed: true,
        completedBy,
        completedAt: now,
        completionNote: note,
        inMemory: true,
      };

      working = working.map((w) =>
        w.id === target.id ? updated : w
      );
      autoCompleted.push(updated);
    }
  }

  saveState({
    lastCheckedAt: now,
    nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
  });

  return { wishlist: working, autoCompleted };
}