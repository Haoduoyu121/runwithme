"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Skull } from "lucide-react";
import {
  drawReward,
  drawPenalty,
} from "@/lib/arcadeStorage";

export type RewardKind = "reward" | "penalty";

export default function RewardDrawModal({
  kind,
  onClose,
}: {
  kind: RewardKind;
  onClose: () => void;
}) {
  const [card, setCard] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "revealing" | "shown">(
    "idle"
  );

  useEffect(() => {
    /* 进场动画 */
    const t1 = window.setTimeout(() => setPhase("revealing"), 50);
    const t2 = window.setTimeout(() => {
      const text = kind === "reward" ? drawReward() : drawPenalty();
      setCard(text);
      setPhase("shown");
    }, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [kind]);

  return (
    <div className="gm-dialog-backdrop" onClick={onClose}>
      <div
        className={
          "rdm-sheet" +
          (kind === "reward" ? " rdm-reward" : " rdm-penalty") +
          " rdm-" +
          phase
        }
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="rdm-close"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={16} strokeWidth={2.2} />
        </button>

        <div className="rdm-head">
          {kind === "reward" ? (
            <>
              <Sparkles size={22} strokeWidth={1.8} />
              <span>奖励卡</span>
            </>
          ) : (
            <>
              <Skull size={22} strokeWidth={1.8} />
              <span>惩罚卡</span>
            </>
          )}
        </div>

        <div className="rdm-body">
          {phase === "idle" && <div className="rdm-card-back" />}
          {phase === "revealing" && (
            <div className="rdm-card-back rdm-spin" />
          )}
          {phase === "shown" && (
            <div className="rdm-card-front">
              <div className="rdm-card-text">{card}</div>
            </div>
          )}
        </div>

        {phase === "shown" && (
          <div className="rdm-footer">
            <button
              className="gm-dialog-btn primary"
              onClick={onClose}
              style={{ width: "100%" }}
            >
              收下
            </button>
          </div>
        )}
      </div>
    </div>
  );
}