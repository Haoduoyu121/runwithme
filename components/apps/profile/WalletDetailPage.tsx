"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import {
  formatMoney,
  type WalletData,
  type WalletEntry,
} from "@/data/wallet";

import {
  loadWallet,
  saveWallet,
} from "@/lib/walletStorage";

import WalletEntrySheet from "./WalletEntrySheet";
import { formatTime } from "./WalletPage";

type Props = { onBack: () => void };

export default function WalletDetailPage({
  onBack,
}: Props) {
  const [wallet, setWallet] = useState<WalletData>(loadWallet);
  const [editingEntry, setEditingEntry] =
    useState<WalletEntry | null>(null);

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

  const sorted = [...wallet.entries].sort(
    (a, b) => b.timestamp - a.timestamp
  );

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
        <div className="wallet-title">账单明细</div>
        <div className="wallet-header-spacer" />
      </header>

      <div className="wallet-scroll">
        {sorted.length === 0 ? (
          <div className="wallet-recent-empty">
            还没有记录
          </div>
        ) : (
          <ul className="wallet-detail-list">
            {sorted.map((e) => {
              const isPlus =
                e.type === "income" ||
                e.type === "save-out";
              const label =
                e.note ||
                (e.type === "income"
                  ? "收入"
                  : e.type === "expense"
                    ? "支出"
                    : e.type === "save-in"
                      ? "存入存钱本"
                      : "从存钱本取出");

              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="wallet-detail-row"
                    onClick={() => setEditingEntry(e)}
                  >
                    <div className="wallet-detail-main">
                      <div className="wallet-detail-note">
                        {label}
                      </div>
                      <div className="wallet-detail-time">
                        {formatTime(e.timestamp)}
                      </div>
                    </div>
                    <div
                      className={
                        "wallet-detail-amount " +
                        (isPlus ? "is-plus" : "is-minus")
                      }
                    >
                      {isPlus ? "+" : "-"}
                      {formatMoney(e.amount, wallet.currency)}
                    </div>
                  </button>
                  {e.evaluation && (
                    <div className="wallet-eval-row">
                      <span className="wallet-eval-owner">
                        {e.evaluation.owner}：
                      </span>
                      <span className="wallet-eval-text">
                        {e.evaluation.text}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editingEntry && (
        <WalletEntrySheet
          entry={editingEntry}
          currency={wallet.currency}
          onClose={() => setEditingEntry(null)}
          onSave={(entry) => {
            const next = {
              ...wallet,
              entries: wallet.entries.map((x) =>
                x.id === editingEntry.id ? entry : x
              ),
            };
            saveWallet(next);
            setWallet(next);
            setEditingEntry(null);
          }}
          onDelete={() => {
            const next = {
              ...wallet,
              entries: wallet.entries.filter(
                (x) => x.id !== editingEntry.id
              ),
            };
            saveWallet(next);
            setWallet(next);
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}