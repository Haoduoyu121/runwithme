/* =========================================================
   Runwithme · 钱包
   ========================================================= */

export type WalletOwner = "user" | "Levi" | "Erwin";

export type WalletEntryType =
  | "income"         // 收入（手动）
  | "expense"        // 支出（手动）
  | "save-in"        // 钱包 → 存钱目标
  | "save-out"       // 存钱目标 → 钱包
  | "redpacket-in"   // 收到红包
  | "redpacket-out"; // 发出红包

export type WalletEvaluation = {
  owner: "Levi" | "Erwin";
  text: string;
  createdAt: number;
};

export type WalletEntry = {
  id: string;
  type: WalletEntryType;
  /** 正数 */
  amount: number;
  note: string;
  timestamp: number;
  /** save-in / save-out 关联的目标 id */
  goalId?: string;
  /** 角色评价（只对支出触发） */
  evaluation?: WalletEvaluation;
};

export type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number;
  supervisor: "Levi" | "Erwin" | null;
  createdAt: number;
  completed: boolean;
};

export type WalletData = {
  initialBalance: number;
  currency: string;
  entries: WalletEntry[];
  goals: SavingGoal[];
};

export const DEFAULT_CURRENCY = "¥";

export const DEFAULT_WALLET: WalletData = {
  initialBalance: 0,
  currency: DEFAULT_CURRENCY,
  entries: [],
  goals: [],
};

/** 角色钱包的初始余额（默认给一笔"生活费"） */
export const DEFAULT_ROLE_INITIAL_BALANCE = 1000;

/* ---------- ID ---------- */

export function createWalletEntryId(): string {
  return `wentry-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function createGoalId(): string {
  return `wgoal-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/* ---------- 计算 ---------- */

export function computeBalance(data: WalletData): number {
  let balance = data.initialBalance;
  for (const e of data.entries) {
    if (e.type === "income") balance += e.amount;
    else if (e.type === "expense") balance -= e.amount;
    else if (e.type === "save-in") balance -= e.amount;
    else if (e.type === "save-out") balance += e.amount;
    else if (e.type === "redpacket-in") balance += e.amount;
    else if (e.type === "redpacket-out") balance -= e.amount;
  }
  return balance;
}

export function computeGoalSaved(
  data: WalletData,
  goalId: string
): number {
  let saved = 0;
  for (const e of data.entries) {
    if (e.goalId !== goalId) continue;
    if (e.type === "save-in") saved += e.amount;
    else if (e.type === "save-out") saved -= e.amount;
  }
  return Math.max(0, saved);
}

/* ---------- 格式化 ---------- */

export function formatMoney(
  n: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const intPart = Math.floor(abs);
  const decPart = Math.round((abs - intPart) * 100);
  return `${sign}${currency}${intPart.toLocaleString(
    "zh-CN"
  )}.${String(decPart).padStart(2, "0")}`;
}

export function formatMoneyShort(
  n: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${currency}${Math.round(
    abs
  ).toLocaleString("zh-CN")}`;
}