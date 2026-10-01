"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import {
  computeBalance,
  formatMoney,
  type WalletData,
  type WalletEntry,
  type WalletOwner,
} from "@/data/wallet";

import { loadWallet } from "@/lib/walletStorage";

type Props = {
  owner: "Levi" | "Erwin";
  displayName: string;
  avatarUrl: string | null;
  onBack: () => void;
};

export default function RoleWalletPage({
  owner,
  displayName,
  avatarUrl,
  onBack,
}: Props) {
  const [wallet, setWallet] = useState<WalletData>(() =>
    loadWallet(owner as WalletOwner)
  );

  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (
        e as CustomEvent<{ owner?: WalletOwner }>
      ).detail;
      if (detail?.owner && detail.owner !== owner) return;
      setWallet(loadWallet(owner as WalletOwner));
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
  }, [owner]);

  const balance = computeBalance(wallet);
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
        <div className="wallet-title">{displayName} 的钱包</div>
        <div className="wallet-header-spacer" />
      </header>

      <div className="wallet-scroll">
        {/* Hero：头像 + 名字 */}
        <div className="role-wallet-hero">
          <div
            className={`role-wallet-avatar ${
              owner === "Levi" ? "avatar-levi" : "avatar-erwin"
            }${avatarUrl ? " has-image" : ""}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* 余额卡片 */}
        <div className="wallet-balance-card">
          <div className="wallet-balance-label">余额</div>
          <div className="wallet-balance-value">
            {formatMoney(balance, wallet.currency)}
          </div>
          <div className="role-wallet-initial">
            初始 {formatMoney(wallet.initialBalance, wallet.currency)}
          </div>
        </div>

        {/* 交易记录 */}
        <div className="wallet-recent">
          <div className="wallet-recent-title">交易记录</div>
          {sorted.length === 0 ? (
            <div className="wallet-recent-empty">
              还没有任何交易
            </div>
          ) : (
            sorted.map((e) => (
              <RoleWalletRow
                key={e.id}
                entry={e}
                currency={wallet.currency}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   交易行（只读）
   ========================================================= */

function RoleWalletRow({
  entry,
  currency,
}: {
  entry: WalletEntry;
  currency: string;
}) {
  const isPlus =
    entry.type === "income" ||
    entry.type === "save-out" ||
    entry.type === "redpacket-in";

  const label =
    entry.note ||
    (entry.type === "income"
      ? "收入"
      : entry.type === "expense"
        ? "支出"
        : entry.type === "save-in"
          ? "存入存钱本"
          : entry.type === "save-out"
            ? "从存钱本取出"
            : entry.type === "redpacket-in"
              ? "收到红包"
              : entry.type === "redpacket-out"
                ? "发出红包"
                : "记录");

  return (
    <div className="wallet-row-wrap">
      <div className="role-wallet-row">
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
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}