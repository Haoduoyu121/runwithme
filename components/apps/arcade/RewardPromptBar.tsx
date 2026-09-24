"use client";

import { useState } from "react";
import { Sparkles, Skull } from "lucide-react";
import RewardDrawModal from "./RewardDrawModal";

/** 结算时根据结果展示"抽奖惩"按钮 */
export default function RewardPromptBar({
  result,
}: {
  /** "win" = 你赢了 → 抽奖励；"lose" = 你输了 → 抽惩罚；"draw" = 平局；"watch" = 旁观 */
  result: "win" | "lose" | "draw" | "watch";
}) {
  const [show, setShow] = useState(false);
  if (result === "draw" || result === "watch") return null;

  const kind = result === "win" ? "reward" : "penalty";

  return (
    <>
      <button
        className={
          "rpb-btn" +
          (kind === "reward" ? " rpb-reward" : " rpb-penalty")
        }
        onClick={() => setShow(true)}
      >
        {kind === "reward" ? (
          <>
            <Sparkles size={13} strokeWidth={2.4} />
            抽一张奖励卡
          </>
        ) : (
          <>
            <Skull size={13} strokeWidth={2.4} />
            抽一张惩罚卡
          </>
        )}
      </button>
      {show && (
        <RewardDrawModal kind={kind} onClose={() => setShow(false)} />
      )}
    </>
  );
}