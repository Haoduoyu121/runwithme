"use client";

import { Check } from "lucide-react";

import type { ChatMessage } from "@/data/chat";
import { formatMoney } from "@/data/wallet";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
  onClaim?: () => void;
};

export default function RedPacketCard({
  message,
  names,
  onClaim,
}: Props) {
  const rp = message.redpacket;
  if (!rp) return null;

  const toName =
    rp.to === "Levi"
      ? names.levi
      : rp.to === "Erwin"
        ? names.erwin
        : rp.to === "You"
          ? names.you
          : rp.to;

  const isOutgoing = rp.from === "You";

  /* 是否可被当前用户领取 */
  const canClaim =
    !rp.claimed &&
    rp.to === "You" &&
    !!onClaim;

  const title = isOutgoing
    ? `转账给 ${toName}`
    : `${rp.from} 的转账`;

  return (
    <div
      className={
        "redpacket-card" + (rp.claimed ? " is-claimed" : "")
      }
    >
      <div className="redpacket-card-title">{title}</div>

      <div className="redpacket-card-amount">
        {formatMoney(rp.amount)}
      </div>

      {rp.note && (
        <div className="redpacket-card-note">
          {rp.note}
        </div>
      )}

      <div className="redpacket-card-divider" />

      {canClaim ? (
        <button
          type="button"
          className="redpacket-card-claim"
          onClick={(e) => {
            e.stopPropagation();
            onClaim?.();
          }}
        >
          点击领取
        </button>
      ) : (
        <div className="redpacket-card-status">
          {rp.claimed ? (
            <>
              <Check size={13} strokeWidth={3} />
              <span>已收款</span>
            </>
          ) : (
            <span>待收款</span>
          )}
        </div>
      )}
    </div>
  );
}