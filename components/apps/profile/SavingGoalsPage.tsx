"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  Pencil,
  Plus,
} from "lucide-react";

import {
  computeGoalSaved,
  createWalletEntryId,
  formatMoney,
  type SavingGoal,
  type WalletData,
} from "@/data/wallet";

import {
  loadWallet,
  saveWallet,
} from "@/lib/walletStorage";

import { createMessageId } from "@/data/chat";

import GoalEditSheet from "./GoalEditSheet";
import GoalActionSheet from "./GoalActionSheet";

type Props = { onBack: () => void };

export default function SavingGoalsPage({
  onBack,
}: Props) {
  const [wallet, setWallet] = useState<WalletData>(loadWallet);
  const [editingGoal, setEditingGoal] =
    useState<SavingGoal | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionGoal, setActionGoal] =
    useState<SavingGoal | null>(null);

  useEffect(() => {
    function onUpdated() {
      setWallet(loadWallet());
    }
    window.addEventListener(
      "runwithme:wallet-updated",
      onUpdated
    );
    return () => {
      window.removeEventListener(
        "runwithme:wallet-updated",
        onUpdated
      );
    };
  }, []);

  const activeGoals = wallet.goals.filter(
    (g) => !g.completed
  );
  const completedGoals = wallet.goals.filter(
    (g) => g.completed
  );

  /* 目标完成后广播系统消息到群聊 */
  function notifyGoalCompleted(goal: SavingGoal) {
    try {
      window.dispatchEvent(
        new CustomEvent("runwithme:goal-completed", {
          detail: { goalName: goal.name },
        })
      );
    } catch {}
  }

  function handleSaveGoal(goal: SavingGoal) {
    const next = { ...wallet };
    const existingIdx = next.goals.findIndex(
      (g) => g.id === goal.id
    );
    if (existingIdx >= 0) {
      next.goals = next.goals.map((g) =>
        g.id === goal.id ? goal : g
      );
    } else {
      next.goals = [goal, ...next.goals];
    }
    saveWallet(next);
    setWallet(next);
    setShowCreate(false);
    setEditingGoal(null);
  }

  function handleDeleteGoal(goal: SavingGoal) {
    const saved = computeGoalSaved(wallet, goal.id);
    const next = { ...wallet };

    /* 把已存的钱退回余额 */
    if (saved > 0) {
      next.entries = [
        {
          id: createWalletEntryId(),
          type: "save-out",
          amount: saved,
          note: `删除目标「${goal.name}」退回`,
          timestamp: Date.now(),
          goalId: goal.id,
        },
        ...next.entries,
      ];
    }

    next.goals = next.goals.filter((g) => g.id !== goal.id);
    saveWallet(next);
    setWallet(next);
    setEditingGoal(null);
  }

  function handleAction(
    goal: SavingGoal,
    action: "in" | "out",
    amount: number
  ) {
    const next = { ...wallet };

    /* 存钱动作 */
    next.entries = [
      {
        id: createWalletEntryId(),
        type: action === "in" ? "save-in" : "save-out",
        amount,
        note:
          action === "in"
            ? `存入「${goal.name}」`
            : `从「${goal.name}」取出`,
        timestamp: Date.now(),
        goalId: goal.id,
      },
      ...next.entries,
    ];

    /* 检查是否达成 */
    const newSaved =
      computeGoalSaved(next, goal.id) +
      (action === "in" ? amount : -amount);

    if (
      !goal.completed &&
      newSaved >= goal.targetAmount
    ) {
      next.goals = next.goals.map((g) =>
        g.id === goal.id ? { ...g, completed: true } : g
      );
      notifyGoalCompleted(goal);
    }

    saveWallet(next);
    setWallet(next);
    setActionGoal(null);
  }

  return (
    <div className="wallet-page">
      <header className="wallet-header">
        <button
          type="button"
          className="wallet-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="wallet-title">存钱本</div>
        <button
          type="button"
          className="wallet-back"
          onClick={() => setShowCreate(true)}
          aria-label="新建"
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
      </header>

      <div className="wallet-scroll">
        {wallet.goals.length === 0 ? (
          <div className="wallet-recent-empty">
            还没有存钱目标
            <br />
            点右上角 ＋ 新建一个
          </div>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <div className="goal-list-section">
                <div className="goal-list-title">
                  进行中
                </div>
                {activeGoals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    wallet={wallet}
                    onAction={() => setActionGoal(g)}
                    onEdit={() => setEditingGoal(g)}
                  />
                ))}
              </div>
            )}

            {completedGoals.length > 0 && (
              <div className="goal-list-section">
                <div className="goal-list-title">
                  已完成
                </div>
                {completedGoals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    wallet={wallet}
                    onAction={() => setActionGoal(g)}
                    onEdit={() => setEditingGoal(g)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <GoalEditSheet
          goal={null}
          onClose={() => setShowCreate(false)}
          onSave={handleSaveGoal}
        />
      )}

      {editingGoal && (
        <GoalEditSheet
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={handleSaveGoal}
          onDelete={() => handleDeleteGoal(editingGoal)}
        />
      )}

      {actionGoal && (
        <GoalActionSheet
          goal={actionGoal}
          wallet={wallet}
          onClose={() => setActionGoal(null)}
          onSave={(action, amount) =>
            handleAction(actionGoal, action, amount)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   目标卡片
   ========================================================= */

function GoalCard({
  goal,
  wallet,
  onAction,
  onEdit,
}: {
  goal: SavingGoal;
  wallet: WalletData;
  onAction: () => void;
  onEdit: () => void;
}) {
  const saved = computeGoalSaved(wallet, goal.id);
  const progress =
    goal.targetAmount > 0
      ? Math.min(
          100,
          (saved / goal.targetAmount) * 100
        )
      : 0;

  return (
    <div className="goal-card">
      <div className="goal-card-head">
        <div className="goal-card-name">
          {goal.name}
          {goal.completed && (
            <span className="goal-card-done">已完成</span>
          )}
        </div>
        <button
          type="button"
          className="goal-card-edit"
          onClick={onEdit}
          aria-label="编辑"
        >
          <Pencil size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className="goal-card-amount">
        <span className="goal-card-saved">
          {formatMoney(saved, wallet.currency)}
        </span>
        <span className="goal-card-target">
          / {formatMoney(goal.targetAmount, wallet.currency)}
        </span>
        <span className="goal-card-percent">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="goal-card-bar">
        <div
          className="goal-card-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="goal-card-foot">
        {goal.supervisor && (
          <span className="goal-card-supervisor">
            监督：{goal.supervisor}
          </span>
        )}
        <button
          type="button"
          className="goal-card-action-btn"
          onClick={onAction}
        >
          {goal.completed ? "取出" : "存入 / 取出"}
        </button>
      </div>
    </div>
  );
}