"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  computeGoalSaved,
  formatMoney,
  type SavingGoal,
  type WalletData,
} from "@/data/wallet";

type Props = {
  goal: SavingGoal;
  wallet: WalletData;
  onClose: () => void;
  onSave: (
    action: "in" | "out",
    amount: number
  ) => void;
};

export default function GoalActionSheet({
  goal,
  wallet,
  onClose,
  onSave,
}: Props) {
  const saved = computeGoalSaved(wallet, goal.id);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [amountStr, setAmountStr] = useState("");

  const progress =
    goal.targetAmount > 0
      ? Math.min(100, (saved / goal.targetAmount) * 100)
      : 0;

  function handleSave() {
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("请输入有效金额");
      return;
    }
    if (mode === "out" && amount > saved) {
      window.alert("取出的金额超过了已存入的金额");
      return;
    }
    onSave(mode, amount);
  }

  return (
    <div
      className="wallet-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="wallet-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="wallet-sheet-header">
          <span>{goal.name}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="goal-action-progress">
          <div className="goal-action-progress-text">
            <span>
              {formatMoney(saved, wallet.currency)}
            </span>
            <span>
              / {formatMoney(goal.targetAmount, wallet.currency)}
            </span>
          </div>
          <div className="goal-action-progress-bar">
            <div
              className="goal-action-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="wallet-sheet-segment">
          <button
            type="button"
            className={mode === "in" ? "active" : ""}
            onClick={() => setMode("in")}
          >
            存入
          </button>
          <button
            type="button"
            className={mode === "out" ? "active" : ""}
            onClick={() => setMode("out")}
          >
            取出
          </button>
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            {mode === "in" ? "存入金额" : "取出金额"}
          </div>
          <div className="wallet-sheet-amount-wrap">
            <span className="wallet-sheet-currency">
              {wallet.currency}
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="wallet-sheet-amount"
              value={amountStr}
              onChange={(e) =>
                setAmountStr(e.target.value)
              }
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        <div className="wallet-sheet-actions">
          <button
            type="button"
            className="wallet-sheet-btn primary"
            onClick={handleSave}
          >
            {mode === "in" ? "存入" : "取出"}
          </button>
        </div>
      </div>
    </div>
  );
}