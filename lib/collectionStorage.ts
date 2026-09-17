/* =========================================================
   RunWithme · Collection localStorage
   ========================================================= */

import type {
  CollectionItem,
  CollectionSource,
  CollectionOwner,
  CollectionSender,
} from "@/data/collection";

const ITEMS_KEY = "runwithme_collections_v1";
const TAGS_KEY = "runwithme_collection_tags_v1";

/* ---------- 读写 ---------- */

export function loadCollections(): CollectionItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCollectionItem);
  } catch (error) {
    console.error("读取收藏失败:", error);
    return [];
  }
}

export function saveCollections(items: CollectionItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ITEMS_KEY,
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("保存收藏失败:", error);
  }
}

export function loadCollectionTags(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TAGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is string => typeof t === "string" && t.length > 0
    );
  } catch (error) {
    console.error("读取收藏标签失败:", error);
    return [];
  }
}

export function saveCollectionTags(tags: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TAGS_KEY,
      JSON.stringify(tags)
    );
  } catch (error) {
    console.error("保存收藏标签失败:", error);
  }
}

/* ---------- 校验 ---------- */

function isCollectionItem(v: unknown): v is CollectionItem {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    typeof x.owner === "string" &&
    typeof x.source === "string" &&
    typeof x.content === "string" &&
    Array.isArray(x.tags)
  );
}

/* ---------- id ---------- */

export function createCollectionId(): string {
  return `col-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/* ---------- 系统随机判定 ---------- */

/* 每次触发：按 1%~5% 概率返回 true */
export function shouldAutoCollect(): boolean {
  const p =
    AUTO_COLLECT_MIN_INTERNAL +
    Math.random() *
      (AUTO_COLLECT_MAX_INTERNAL - AUTO_COLLECT_MIN_INTERNAL);
  return Math.random() < p;
}

/* 避免 import 循环，这里定义内部常量 */
const AUTO_COLLECT_MIN_INTERNAL = 0.01;
const AUTO_COLLECT_MAX_INTERNAL = 0.05;

/* 系统收藏归 Levi / Erwin：50/50 */
export function pickRandomOwner(): "levi" | "erwin" {
  return Math.random() < 0.5 ? "levi" : "erwin";
}

/* 系统要不要写备注 */
export function shouldAutoNote(): boolean {
  return Math.random() < 0.55;
}

/* ---------- 类型重导出（方便调用方 import） ---------- */

export type {
  CollectionItem,
  CollectionSource,
  CollectionOwner,
  CollectionSender,
};