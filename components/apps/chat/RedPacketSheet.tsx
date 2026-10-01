"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  computeBalance,
  formatMoney,
  type WalletData,
} from "@/data/wallet";
import { loadWallet } from "@/lib/walletStorage";

export type RedPacketTargetChoice =
  | "Levi"
  | "Erwin"
  | "Both";

type Props = {
  /** 单聊锁定角色；群聊 = null */
  lockedTarget: "Levi" | "Erwin" | null;
  names: { levi: string; erwin: string };
  onClose: () => void;
  onConfirm: (params: {
    targets: ("Levi" | "Erwin")[];
    amount: number;
    note: string;
  }) => void;
};

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export default function RedPacketSheet({
  lockedTarget,
  names,
  onClose,
  onConfirm,
}: Props) {
  const [wallet] = useState<WalletData>(() =>
    loadWallet("user")
  );
  const balance = computeBalance(wallet);

  const [targetChoice, setTargetChoice] =
    useState<RedPacketTargetChoice>(
      lockedTarget ?? "Levi"
    );
  const [amountStr, setAmountStr] = useState("10");
  const [note, setNote] = useState("");

  const targets: ("Levi" | "Erwin")[] =
    targetChoice === "Both"
      ? ["Levi", "Erwin"]
      : [targetChoice];
  const amount = parseFloat(amountStr);
  const total =
    Number.isFinite(amount) && amount > 0
      ? amount * targets.length
      : 0;
  const insufficient =
    total > 0 && total > balance;
  const canConfirm =
    Number.isFinite(amount) &&
    amount > 0 &&
    !insufficient;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      targets,
      amount,
      note: note.trim(),
    });
    onClose();
  }

  return (
    <div
      className="redpacket-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="redpacket-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="redpacket-sheet-header">
          <span>发红包</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        {/* 目标选择（单聊锁定，群聊可选） */}
        {lockedTarget === null ? (
          <div className="redpacket-sheet-field">
            <div className="redpacket-sheet-label">给谁</div>
            <div className="redpacket-sheet-segment">
              <button
                type="button"
                className={
                  targetChoice === "Levi" ? "active" : ""
                }
                onClick={() => setTargetChoice("Levi")}
              >
                {names.levi}
              </button>
              <button
                type="button"
                className={
                  targetChoice === "Erwin" ? "active" : ""
                }
                onClick={() => setTargetChoice("Erwin")}
              >
                {names.erwin}
              </button>
              <button
                type="button"
                className={
                  targetChoice === "Both" ? "active" : ""
                }
                onClick={() => setTargetChoice("Both")}
              >
                两人
              </button>
            </div>
            {targetChoice === "Both" && (
              <div className="redpacket-sheet-hint">
                每个角色都会收到独立的一份红包
              </div>
            )}
          </div>
        ) : (
          <div className="redpacket-sheet-field">
            <div className="redpacket-sheet-label">给</div>
            <div className="redpacket-sheet-target-fixed">
              {lockedTarget === "Levi"
                ? names.levi
                : names.erwin}
            </div>
          </div>
        )}

        {/* 金额 */}
        <div className="redpacket-sheet-field">
          <div className="redpacket-sheet-label">
            金额（每个红包）
          </div>
          <div className="redpacket-sheet-amount-wrap">
            <span className="redpacket-sheet-currency">
              {wallet.currency}
            </span>
            <input
              type="number"
              inputMode="decimal"
              className="redpacket-sheet-amount"
              value={amountStr}
              onChange={(e) =>
                setAmountStr(e.target.value)
              }
              placeholder="0.00"
            />
          </div>
          <div className="redpacket-sheet-quick">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmountStr(String(v))}
              >
                {wallet.currency}
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 留言 */}
        <div className="redpacket-sheet-field">
          <div className="redpacket-sheet-label">
            留言（可选）
          </div>
          <input
            type="text"
            className="redpacket-sheet-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="恭喜发财，大吉大利"
            maxLength={30}
          />
        </div>

        {/* 汇总 */}
        <div className="redpacket-sheet-summary">
          <span>
            余额 {formatMoney(balance, wallet.currency)}
          </span>
          {targets.length > 1 && total > 0 && (
            <span className="redpacket-sheet-total">
              共 {formatMoney(total, wallet.currency)}
            </span>
          )}
        </div>

        {insufficient && (
          <div className="redpacket-sheet-warn">
            余额不足
          </div>
        )}

        <div className="redpacket-sheet-actions">
          <button
            type="button"
            className="redpacket-sheet-btn primary"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            发红包
          </button>
        </div>
      </div>
    </div>
  );
}