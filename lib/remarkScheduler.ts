"use client";

import type { RemarkOwner } from "@/data/remarkPool";

import { loadRemarkPool, pickRemark } from "@/lib/remarkStorage";

export type RemarkResult = {
  owner: RemarkOwner;
  text: string;
};

/**
 * 只负责抽卡，不写存储、不发消息。
 * 写入 + 通知由 ChatContext 统一处理。
 */
export function roleRemarkUser(
  owner: RemarkOwner
): RemarkResult | null {
  const pool = loadRemarkPool();
  const text = pickRemark(pool, owner);
  if (!text) return null;
  return { owner, text };
}