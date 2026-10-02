"use client";

import {
  DEFAULT_REMARK_POOL,
  type RemarkOwner,
  type RemarkPool,
} from "@/data/remarkPool";

const KEY = "runwithme_remark_pool_v1";

export function loadRemarkPool(): RemarkPool {
  if (typeof window === "undefined") {
    return { ...DEFAULT_REMARK_POOL };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_REMARK_POOL };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_REMARK_POOL };
    }
    const p = parsed as Partial<RemarkPool>;
    return {
      Levi:
        Array.isArray(p.Levi) &&
        p.Levi.every((x) => typeof x === "string")
          ? p.Levi
          : [...DEFAULT_REMARK_POOL.Levi],
      Erwin:
        Array.isArray(p.Erwin) &&
        p.Erwin.every((x) => typeof x === "string")
          ? p.Erwin
          : [...DEFAULT_REMARK_POOL.Erwin],
    };
  } catch {
    return { ...DEFAULT_REMARK_POOL };
  }
}

export function saveRemarkPool(pool: RemarkPool): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pool));
  } catch (e) {
    console.error("保存备注卡池失败:", e);
  }
}

export function resetRemarkPool(): RemarkPool {
  const d = JSON.parse(
    JSON.stringify(DEFAULT_REMARK_POOL)
  ) as RemarkPool;
  saveRemarkPool(d);
  return d;
}

export function pickRemark(
  pool: RemarkPool,
  owner: RemarkOwner
): string | null {
  const list = pool[owner].filter(
    (t) => t.trim().length > 0
  );
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}