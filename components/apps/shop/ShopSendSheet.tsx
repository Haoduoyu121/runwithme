"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  computeBalance,
  formatMoney,
  type WalletData,
} from "@/data/wallet";
import { loadWallet } from "@/lib/walletStorage";
import type { ShopItem } from "@/data/shop";

type Props = {
  item: ShopItem;
  /** 单聊锁定角色；群聊 null 可选 */
  lockedReceiver: "Levi" | "Erwin" | null;
  names: { levi: string; erwin: string };
  onClose: () => void;
  onConfirm: (params: {
    receiver: "Levi" | "Erwin";
    note: string;
  }) => void;
};

export default function ShopSendSheet({
  item,
  lockedReceiver,
  names,
  onClose,
  onConfirm,
}: Props) {
  const [wallet] = useState<WalletData>(() =>
    loadWallet("user")
  );
  const balance = computeBalance(wallet);

  const [receiver, setReceiver] = useState<"Levi" | "Erwin">(
    lockedReceiver ?? "Levi"
  );
  const [note, setNote] = useState("");

  const insufficient = balance < item.price;

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
          <span>送礼物</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="shop-send-item">
          <div className="shop-send-item-emoji">
            {item.emoji}
          </div>
          <div className="shop-send-item-info">
            <div className="shop-send-item-name">
              {item.name}
            </div>
            <div className="shop-send-item-price">
              {formatMoney(item.price, wallet.currency)}
            </div>
          </div>
        </div>

        {lockedReceiver === null && (
          <div className="wallet-sheet-field">
            <div className="wallet-sheet-label">送给</div>
            <div className="wallet-sheet-segment">
              <button
                type="button"
                className={
                  receiver === "Levi" ? "active" : ""
                }
                onClick={() => setReceiver("Levi")}
              >
                {names.levi}
              </button>
              <button
                type="button"
                className={
                  receiver === "Erwin" ? "active" : ""
                }
                onClick={() => setReceiver("Erwin")}
              >
                {names.erwin}
              </button>
            </div>
          </div>
        )}

        {lockedReceiver !== null && (
          <div className="wallet-sheet-field">
            <div className="wallet-sheet-label">送给</div>
            <div className="redpacket-sheet-target-fixed">
              {lockedReceiver === "Levi"
                ? names.levi
                : names.erwin}
            </div>
          </div>
        )}

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            留言（可选）
          </div>
          <input
            type="text"
            className="wallet-sheet-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="想对他说的话"
            maxLength={30}
          />
        </div>

        <div className="redpacket-sheet-summary">
          <span>
            余额 {formatMoney(balance, wallet.currency)}
          </span>
        </div>

        {insufficient && (
          <div className="redpacket-sheet-warn">
            余额不足
          </div>
        )}

        <div className="wallet-sheet-actions">
          <button
            type="button"
            className="wallet-sheet-btn primary"
            disabled={insufficient}
            onClick={() => {
              onConfirm({
                receiver,
                note: note.trim(),
              });
            }}
            style={
              insufficient
                ? { opacity: 0.4, cursor: "not-allowed" }
                : undefined
            }
          >
            下单
          </button>
        </div>
      </div>
    </div>
  );
}