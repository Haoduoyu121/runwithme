import type {
  PhotoTextCard,
  PhotoTextCardAuthor,
  PhotoTextPending,
  PhotoTextPools,
} from "@/data/photoTextCards";
import {
  createPhotoTextCardId,
  createPhotoTextPendingId,
} from "@/data/photoTextCards";

const SCHED_KEY = "runwithme_photo_text_scheduler";
const HOUR = 60 * 60 * 1000;
const MIN_GAP = 16 * HOUR;
const MAX_GAP = 24 * HOUR;

/** 手动点 ✦ 的延迟：1~3 分钟 */
const SHOOT_MIN_MS = 60 * 1000;
const SHOOT_MAX_MS = 3 * 60 * 1000;

/** 每个角色独立 50% 概率去拍 */
const SHOOT_CHANCE = 0.5;

type SchedState = {
  lastCheckedAt: number;
  nextCheckAt: number;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? "";
}

function poolsOk(pools: PhotoTextPools): boolean {
  return (
    pools.place.length > 0 &&
    pools.weather.length > 0 &&
    pools.person.length > 0 &&
    pools.action.length > 0 &&
    pools.mood.length > 0
  );
}

function buildCard(
  pools: PhotoTextPools,
  author: PhotoTextCardAuthor,
  createdAt: number
): PhotoTextCard {
  return {
    id: createPhotoTextCardId(),
    author,
    place: pick(pools.place),
    weather: pick(pools.weather),
    person: pick(pools.person),
    action: pick(pools.action),
    mood: pick(pools.mood),
    createdAt,
  };
}

/**
 * 用户点 ✦ 时调用：预抽签 + 排一个 1~3 min 后的 pending。
 * - 每人独立 50% 去拍
 * - 都不去 → pending.cards 为空，结算时提示"还没有人拍照哦"
 * - 词库为空 → 返回 null（不创建 pending）
 */
export function createPendingShoot(
  pools: PhotoTextPools
): PhotoTextPending | null {
  if (!poolsOk(pools)) return null;

  const now = Date.now();
  const resolveAt = now + randomBetween(
    SHOOT_MIN_MS,
    SHOOT_MAX_MS
  );

  const cards: PhotoTextCard[] = [];
  (["Levi", "Erwin"] as const).forEach(
    (character, i) => {
      if (Math.random() >= SHOOT_CHANCE) return;
      cards.push(
        buildCard(pools, character, now + i * 1000)
      );
    }
  );

  return {
    id: createPhotoTextPendingId(),
    resolveAt,
    cards,
  };
}

/* ---------- 16-24h 自动 ---------- */

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

/** 50% 0 / 35% 1 / 15% 2 */
function pickAutoCount(): number {
  const r = Math.random();
  if (r < 0.5) return 0;
  if (r < 0.85) return 1;
  return 2;
}

export function runPhotoTextScheduler(
  pools: PhotoTextPools
): PhotoTextCard[] {
  if (typeof window === "undefined") return [];
  if (!poolsOk(pools)) return [];

  const now = Date.now();
  const state = loadState();

  if (!state) {
    saveState({
      lastCheckedAt: now,
      nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
    });
    return [];
  }

  if (now < state.nextCheckAt) return [];

  const count = pickAutoCount();
  const result: PhotoTextCard[] = [];
  for (let i = 0; i < count; i++) {
    const author: PhotoTextCardAuthor =
      Math.random() < 0.5 ? "Levi" : "Erwin";
    result.push(
      buildCard(pools, author, now + i * 1000)
    );
  }

  saveState({
    lastCheckedAt: now,
    nextCheckAt: now + randomBetween(MIN_GAP, MAX_GAP),
  });

  return result;
}