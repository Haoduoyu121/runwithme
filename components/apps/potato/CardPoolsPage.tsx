"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

import {
  CARD_POOL_HINTS,
  CARD_POOL_LABELS,
  loadCardPool,
  resetCardPool,
  saveCardPool,
  type CardPool,
  type CardPoolId,
} from "@/lib/cardPoolsStorage";

type Props = { onBack: () => void };

const ORDER: CardPoolId[] = [
  "walletEval",
  "roleOrderReview",
  "roleGiftNote",
  "roleAddress",
];

export default function CardPoolsPage({ onBack }: Props) {
  const [active, setActive] =
    useState<CardPoolId>("walletEval");
  const [pool, setPool] = useState<CardPool>(() =>
    loadCardPool("walletEval")
  );
  const [leviDraft, setLeviDraft] = useState(
    loadCardPool("walletEval").Levi.join("\n")
  );
  const [erwinDraft, setErwinDraft] = useState(
    loadCardPool("walletEval").Erwin.join("\n")
  );

  useEffect(() => {
    const p = loadCardPool(active);
    setPool(p);
    setLeviDraft(p.Levi.join("\n"));
    setErwinDraft(p.Erwin.join("\n"));
  }, [active]);

  function commitLevi() {
    const list = leviDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...pool, Levi: list };
    saveCardPool(active, next);
    setPool(next);
  }

  function commitErwin() {
    const list = erwinDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...pool, Erwin: list };
    saveCardPool(active, next);
    setPool(next);
  }

  function handleReset() {
    if (
      !window.confirm(
        `恢复「${CARD_POOL_LABELS[active]}」为默认？当前内容会丢失。`
      )
    )
      return;
    const d = resetCardPool(active);
    setPool(d);
    setLeviDraft(d.Levi.join("\n"));
    setErwinDraft(d.Erwin.join("\n"));
  }

  return (
    <div className="cardpools-page">
      <header className="potato-topbar">
        <button
          type="button"
          className="potato-topbar-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>
        <div className="potato-topbar-title">卡池管理</div>
        <div className="potato-topbar-spacer" />
      </header>

      <div className="cardpools-tabs">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={
              "cardpools-tab" +
              (active === id ? " active" : "")
            }
            onClick={() => setActive(id)}
          >
            {CARD_POOL_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="cardpools-scroll">
        <div className="potato-hint" style={{ marginBottom: 12 }}>
          {CARD_POOL_HINTS[active]}
        </div>

        <div className="potato-sentence-col">
          <span className="potato-sentence-label">
            Levi（一行一条）
          </span>
          <textarea
            className="potato-sentence-textarea"
            value={leviDraft}
            onChange={(e) => setLeviDraft(e.target.value)}
            onBlur={commitLevi}
            rows={8}
            spellCheck={false}
          />
        </div>

        <div className="potato-sentence-col">
          <span className="potato-sentence-label">
            Erwin（一行一条）
          </span>
          <textarea
            className="potato-sentence-textarea"
            value={erwinDraft}
            onChange={(e) => setErwinDraft(e.target.value)}
            onBlur={commitErwin}
            rows={8}
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          className="potato-sentence-reset"
          onClick={handleReset}
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}