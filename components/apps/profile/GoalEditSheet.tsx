"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createGoalId,
  type SavingGoal,
} from "@/data/wallet";

type Props = {
  goal: SavingGoal | null;
  onClose: () => void;
  onSave: (goal: SavingGoal) => void;
  onDelete?: () => void;
};

export default function GoalEditSheet({
  goal,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isEditing = !!goal;

  const [name, setName] = useState(goal?.name ?? "");
  const [targetStr, setTargetStr] = useState(
    goal ? String(goal.targetAmount) : ""
  );
  const [supervisor, setSupervisor] = useState<
    "Levi" | "Erwin" | null
  >(goal?.supervisor ?? null);

  function handleSave() {
    const target = parseFloat(targetStr);
    if (!name.trim()) {
      window.alert("请输入目标名称");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      window.alert("请输入有效的目标金额");
      return;
    }
    const next: SavingGoal = goal
      ? {
          ...goal,
          name: name.trim(),
          targetAmount: target,
          supervisor,
        }
      : {
          id: createGoalId(),
          name: name.trim(),
          targetAmount: target,
          supervisor,
          createdAt: Date.now(),
          completed: false,
        };
    onSave(next);
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
          <span>{isEditing ? "编辑目标" : "新建目标"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">目标名称</div>
          <input
            type="text"
            className="wallet-sheet-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="比如：新手机"
            maxLength={20}
            autoFocus
          />
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">目标金额</div>
          <div className="wallet-sheet-amount-wrap">
            <span className="wallet-sheet-currency">¥</span>
            <input
              type="number"
              inputMode="decimal"
              className="wallet-sheet-amount"
              value={targetStr}
              onChange={(e) =>
                setTargetStr(e.target.value)
              }
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            监督人（可选）
          </div>
          <div className="wallet-sheet-segment">
            <button
              type="button"
              className={
                supervisor === null ? "active" : ""
              }
              onClick={() => setSupervisor(null)}
            >
              不设置
            </button>
            <button
              type="button"
              className={
                supervisor === "Levi" ? "active" : ""
              }
              onClick={() => setSupervisor("Levi")}
            >
              Levi
            </button>
            <button
              type="button"
              className={
                supervisor === "Erwin" ? "active" : ""
              }
              onClick={() => setSupervisor("Erwin")}
            >
              Erwin
            </button>
          </div>
          <div className="wallet-sheet-hint">
            监督人会在你花钱时偶尔评价一下
          </div>
        </div>

        <div className="wallet-sheet-actions">
          {onDelete && (
            <button
              type="button"
              className="wallet-sheet-btn danger"
              onClick={() => {
                if (
                  window.confirm(
                    "删除这个存钱目标？（已存入的钱会退回到余额）"
                  )
                )
                  onDelete();
              }}
            >
              删除
            </button>
          )}
          <button
            type="button"
            className="wallet-sheet-btn primary"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}