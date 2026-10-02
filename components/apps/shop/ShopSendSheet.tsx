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
import type { ThreadId } from "@/data/chat";

type Props = {
  item: ShopItem;
  names: { levi: string; erwin: string };
  /** 图片预览 URL（如果有） */
  imageUrl?: string | null;
  onClose: () => void;
  onConfirm: (params: {
    receiver: "Levi" | "Erwin";
    threadId: ThreadId;
    note: string;
  }) => void;
};

export default function ShopSendSheet({
  item,
  names,
  imageUrl,
  onClose,
  onConfirm,
}: Props) {
  const [wallet] = useState<WalletData>(() =>
    loadWallet("user")
  );
  const balance = computeBalance(wallet);

  const [receiver, setReceiver] = useState<"Levi" | "Erwin">(
    "Levi"
  );
  const [note, setNote] = useState("");

  /* 送给谁 → 默认发到对应单聊；用户可改成群聊 */
  const [sendToGroup, setSendToGroup] = useState(false);

  const insufficient = balance < item.price;
  const threadId: ThreadId = sendToGroup
    ? "group"
    : receiver === "Levi"
      ? "levi"
      : "erwin";

  const isFood = item.category === "food";

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
          <span>{isFood ? "点外卖" : "送礼物"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="shop-send-item">
          <div className="shop-send-item-preview">
            {imageUrl ? (
              <img src={imageUrl} alt="" />
            ) : (
              <span className="shop-send-item-emoji">
                {item.emoji}
              </span>
            )}
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

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            {isFood ? "给谁点" : "送给谁"}
          </div>
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

        <div className="wallet-sheet-field">
          <div className="wallet-sheet-label">
            消息发到哪
          </div>
          <div className="wallet-sheet-segment">
            <button
              type="button"
              className={!sendToGroup ? "active" : ""}
              onClick={() => setSendToGroup(false)}
            >
              单聊
            </button>
            <button
              type="button"
              className={sendToGroup ? "active" : ""}
              onClick={() => setSendToGroup(true)}
            >
              群聊
            </button>
          </div>
          <div className="wallet-sheet-hint">
            {sendToGroup
              ? "消息会发到群聊，两人都能看到"
              : `消息会发到与 ${
                  receiver === "Levi"
                    ? names.levi
                    : names.erwin
                } 的单聊`}
          </div>
        </div>

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
                threadId,
                note: note.trim(),
              });
            }}
            style={
              insufficient
                ? { opacity: 0.4, cursor: "not-allowed" }
                : undefined
            }
          >
            {isFood ? "下单" : "下单"}
          </button>
        </div>
      </div>
    </div>
  );
}