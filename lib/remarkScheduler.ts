"use client";

import type { RemarkOwner } from "@/data/remarkPool";

import { loadSystemSettings } from "@/lib/systemStorage";
import { loadRemarkPool, pickRemark } from "@/lib/remarkStorage";

export type RemarkResult = {
  owner: RemarkOwner;
  text: string;
};

/**
 * 角色给用户改备注：抽一个，写进 systemStorage.userRemarks。
 * 返回 remark 或 null。
 */
export async function roleRemarkUser(
  owner: RemarkOwner
): Promise<RemarkResult | null> {
  const pool = loadRemarkPool();
  const text = pickRemark(pool, owner);
  if (!text) return null;

  /* 写进 settings.userRemarks */
  const settings = loadSystemSettings();
  const { updateSystemSettings } = await import(
    "@/lib/systemStorage"
  );
  updateSystemSettings({
    userRemarks: {
      ...settings.userRemarks,
      [owner]: text,
    },
  });

  return { owner, text };
}

/* ------------------------------------------------------- */

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function pickRandomRemarkOwner(): RemarkOwner {
  return Math.random() < 0.5 ? "Levi" : "Erwin";
}