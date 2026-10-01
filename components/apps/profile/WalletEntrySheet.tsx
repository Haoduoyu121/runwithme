"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createWalletEntryId,
  type WalletEntry,
} from "@/data/wallet";

type ManualType = "income" | "expense";

type Props = {
  entry: WalletEntry | null;
  currency: string;
  onClose: () => void;
  onSave: (entry: WalletEntry) => void;
  onDelete?: () => void;
};

export default function WalletEntrySheet({
  entry,
  currency,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isEditing =
    !!entry &&
    (entry.type === "income" || entry.type === "expense");

  const [type, setType] = useState<ManualType>(
    isEditing ? (entry!.type as ManualType) : "expense"
  );
  const [amountStr, setAmountStr] = useState(
    entry ? String(entry.amount) : ""
  );
  const [note, setNote] = useState(entry?.note ?? "");

  function handleSave() {
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("请输入有效金额");
      return;
    }
    const next: WalletEntry = entry
      ? {
          ...entry,
          type,
          amount,
          note: note.trim(),
        }
      : {
          id: createWalletEntryId(),
          type,
          amount,
          note: note.trim(),
          timestamp: Date.now(),
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
          <span>{isEditing ? "编辑记录" : "记一笔"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="wallet-sheet-segment">
          <button
            type="button"
            className={type === "expense" ? "active" : ""}
            onClick={() => setType("expense")}
          >
            支出
          </button>
          <button
            type="button"
            className={type === "income" ? "active" : ""}
            onClick={() => setType("income")}
          >
            收入
          </button>
        </div>

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">金额</div>
          <div className="wallet-sheet-amount-wrap">
            <span className="wallet-sheet-currency">
              {currency}
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

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">备注</div>
          <input
            type="text"
            className="wallet-sheet-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              type === "expense" ? "花在哪了" : "哪来的"
            }
            maxLength={40}
          />
        </div>

        <div className="wallet-sheet-actions">
          {onDelete && (
            <button
              type="button"
              className="wallet-sheet-btn danger"
              onClick={() => {
                if (window.confirm("删除这条记录？"))
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