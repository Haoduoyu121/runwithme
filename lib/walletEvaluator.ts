"use client";

import type {
  SavingGoal,
  WalletEntry,
  WalletEvaluation,
} from "@/data/wallet";

import { loadSystemSettings } from "@/lib/systemStorage";
import {
  loadCardPool,
  pickFromPool,
} from "@/lib/cardPoolsStorage";

/* 模块级冷却时间戳 */
let lastEvalAt = 0;

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/**
 * 判断这笔支出是否该触发评价，返回 evaluation 或 null。
 * 内部会 await 延迟。
 */
export async function evaluateExpense(
  entry: WalletEntry,
  goals: SavingGoal[]
): Promise<WalletEvaluation | null> {
  const cfg = loadSystemSettings().walletEval;
  if (!cfg || !cfg.enabled) return null;

  /* 冷却检查 */
  const now = Date.now();
  if (now - lastEvalAt < cfg.cooldownSec * 1000) {
    return null;
  }

  /* 掷骰子 */
  if (Math.random() >= cfg.chance) return null;

  /* 找监督角色 */
  const supervisors = Array.from(
    new Set(
      goals
        .filter((g) => !g.completed && g.supervisor)
        .map((g) => g.supervisor as "Levi" | "Erwin")
    )
  );
  if (supervisors.length === 0) return null;

  const owner =
    supervisors[
      Math.floor(Math.random() * supervisors.length)
    ];

  /* 抽卡 */
  const pool = loadCardPool("walletEval");
  const text = pickFromPool(pool, owner);
  if (!text) return null;

  /* 延迟 */
  const delaySec = randomInt(
    cfg.delayMinSec,
    cfg.delayMaxSec
  );
  await new Promise((r) =>
    window.setTimeout(r, delaySec * 1000)
  );

  lastEvalAt = Date.now();

  return {
    owner,
    text,
    createdAt: Date.now(),
  };
}