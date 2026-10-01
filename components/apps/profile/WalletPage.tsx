"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import {
  computeBalance,
  formatMoney,
  type WalletData,
  type WalletEntry,
} from "@/data/wallet";

import {
  loadWallet,
  saveWallet,
} from "@/lib/walletStorage";

import WalletEntrySheet from "./WalletEntrySheet";

type Props = {
  onBack: () => void;
  onOpenDetail: () => void;
};

export default function WalletPage({
  onBack,
  onOpenDetail,
}: Props) {
  const [wallet, setWallet] = useState<WalletData>(loadWallet);
  const [showEntrySheet, setShowEntrySheet] =
    useState(false);
  const [editingEntry, setEditingEntry] =
    useState<WalletEntry | null>(null);
  const [showEditInit, setShowEditInit] = useState(false);
  const [initDraft, setInitDraft] = useState("");

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

  const balance = computeBalance(wallet);
  const recent = [...wallet.entries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  function openEditInit() {
    setInitDraft(String(wallet.initialBalance));
    setShowEditInit(true);
  }

  function saveInit() {
    const v = parseFloat(initDraft);
    if (!Number.isFinite(v)) {
      window.alert("请输入有效数字");
      return;
    }
    const next = { ...wallet, initialBalance: v };
    saveWallet(next);
    setWallet(next);
    setShowEditInit(false);
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
        <div className="wallet-title">钱包</div>
        <div className="wallet-header-spacer" />
      </header>

      <div className="wallet-scroll">
        {/* 余额卡片 */}
        <div className="wallet-balance-card">
          <div className="wallet-balance-label">余额</div>
          <div className="wallet-balance-value">
            {formatMoney(balance, wallet.currency)}
          </div>
          <button
            type="button"
            className="wallet-balance-edit"
            onClick={openEditInit}
          >
            初始余额{" "}
            {formatMoney(
              wallet.initialBalance,
              wallet.currency
            )}
            <ChevronRight size={14} strokeWidth={2.2} />
          </button>
        </div>

        {/* 操作 */}
        <div className="wallet-actions">
          <button
            type="button"
            className="wallet-action-btn primary"
            onClick={() => {
              setEditingEntry(null);
              setShowEntrySheet(true);
            }}
          >
            <Plus size={18} strokeWidth={2.4} />
            记一笔
          </button>
          <button
            type="button"
            className="wallet-action-btn"
            onClick={onOpenDetail}
          >
            账单明细
          </button>
        </div>

        {/* 最近记录 */}
        <div className="wallet-recent">
          <div className="wallet-recent-title">最近</div>
          {recent.length === 0 ? (
            <div className="wallet-recent-empty">
              还没有记录
            </div>
          ) : (
            recent.map((e) => (
              <WalletRow
                key={e.id}
                entry={e}
                currency={wallet.currency}
                onClick={() => {
                  setEditingEntry(e);
                  setShowEntrySheet(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      {showEntrySheet && (
        <WalletEntrySheet
          entry={editingEntry}
          currency={wallet.currency}
          onClose={() => setShowEntrySheet(false)}
          onSave={(entry) => {
            const next = { ...wallet };
            if (editingEntry) {
              next.entries = next.entries.map((x) =>
                x.id === editingEntry.id ? entry : x
              );
            } else {
              next.entries = [entry, ...next.entries];
            }
            saveWallet(next);
            setWallet(next);
            setShowEntrySheet(false);
          }}
          onDelete={
            editingEntry
              ? () => {
                  const next = {
                    ...wallet,
                    entries: wallet.entries.filter(
                      (x) => x.id !== editingEntry.id
                    ),
                  };
                  saveWallet(next);
                  setWallet(next);
                  setShowEntrySheet(false);
                }
              : undefined
          }
        />
      )}

      {showEditInit && (
        <div
          className="wallet-sheet-backdrop"
          onClick={() => setShowEditInit(false)}
        >
          <div
            className="wallet-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="wallet-sheet-header">
              <span>初始余额</span>
              <button
                type="button"
                onClick={() => setShowEditInit(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </header>

            <div className="wallet-sheet-field">
              <div className="wallet-sheet-label">
                你开始记账时手头有多少钱
              </div>
              <div className="wallet-sheet-amount-wrap">
                <span className="wallet-sheet-currency">
                  {wallet.currency}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="wallet-sheet-amount"
                  value={initDraft}
                  onChange={(e) =>
                    setInitDraft(e.target.value)
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
                onClick={saveInit}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   最近记录行
   ========================================================= */

function WalletRow({
  entry,
  currency,
  onClick,
}: {
  entry: WalletEntry;
  currency: string;
  onClick: () => void;
}) {
  const isPlus =
    entry.type === "income" || entry.type === "save-out";

  const label =
    entry.note ||
    (entry.type === "income"
      ? "收入"
      : entry.type === "expense"
        ? "支出"
        : entry.type === "save-in"
          ? "存入存钱本"
          : "从存钱本取出");

  return (
    <button
      type="button"
      className="wallet-row"
      onClick={onClick}
    >
      <div className="wallet-row-content">
        <div className="wallet-row-note">{label}</div>
        <div className="wallet-row-time">
          {formatTime(entry.timestamp)}
        </div>
      </div>
      <div
        className={
          "wallet-row-amount " +
          (isPlus ? "is-plus" : "is-minus")
        }
      >
        {isPlus ? "+" : "-"}
        {formatMoney(entry.amount, currency)}
      </div>
    </button>
  );
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}