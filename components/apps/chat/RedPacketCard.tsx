"use client";

import type { ChatMessage } from "@/data/chat";
import { formatMoney } from "@/data/wallet";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
};

export default function RedPacketCard({
  message,
  names,
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

  return (
    <div className="redpacket-card">
      <div className="redpacket-card-top">
        <div className="redpacket-card-icon">福</div>
        <div className="redpacket-card-info">
          <div className="redpacket-card-title">
            {isOutgoing
              ? `给 ${toName} 的红包`
              : `来自 ${rp.from} 的红包`}
          </div>
          <div className="redpacket-card-sub">
            恭喜发财，大吉大利
          </div>
        </div>
      </div>

      <div className="redpacket-card-amount">
        {formatMoney(rp.amount)}
      </div>

      {rp.note && (
        <div className="redpacket-card-note">
          {rp.note}
        </div>
      )}

      <div className="redpacket-card-divider" />

      <div className="redpacket-card-status">
        {rp.claimed
          ? `${toName} 已领取`
          : isOutgoing
            ? `等待 ${toName} 领取`
            : "点击领取"}
      </div>
    </div>
  );
}