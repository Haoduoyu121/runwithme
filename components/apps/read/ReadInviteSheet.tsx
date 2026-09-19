"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X, XCircle } from "lucide-react";

import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import type { ReadingPartner } from "@/lib/readReadingSession";

type ReadInviteSheetProps = {
  onClose: () => void;
  onInvite: (accepted: ReadingPartner[]) => void;
};

type PartnerStatus = "pending" | "accepted" | "rejected";

type PartnerState = {
  partner: ReadingPartner;
  status: PartnerStatus;
};

const MIN_DELAY_MS = 10_000;
const MAX_DELAY_MS = 30_000;
const ACCEPT_CHANCE = 0.5;

export default function ReadInviteSheet({
  onClose,
  onInvite,
}: ReadInviteSheetProps) {
  const [levi, setLevi] = useState(false);
  const [erwin, setErwin] = useState(false);

  const [phase, setPhase] = useState<
    "picking" | "waiting"
  >("picking");
  const [states, setStates] = useState<PartnerState[]>([]);
  const [allDone, setAllDone] = useState(false);


  const timersRef = useRef<number[]>([]);

  const avatars = useCharacterAvatars();

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) =>
        window.clearTimeout(t)
      );
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase !== "waiting") return;
    if (states.length === 0) return;
    if (states.every((s) => s.status !== "pending")) {
      setAllDone(true);
    }
  }, [phase, states]);

  function handleConfirm() {
    const invited: ReadingPartner[] = [];
    if (levi) invited.push("levi");
    if (erwin) invited.push("erwin");
    if (invited.length === 0) return;

    const init: PartnerState[] = invited.map((p) => ({
      partner: p,
      status: "pending",
    }));
    setStates(init);
    setPhase("waiting");

    init.forEach((s) => {
      const delay =
        MIN_DELAY_MS +
        Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
      const t = window.setTimeout(() => {
        setStates((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (x) => x.partner === s.partner
          );
          if (idx < 0) return prev;
          if (next[idx].status !== "pending") return prev;
          next[idx] = {
            ...next[idx],
            status:
              Math.random() < ACCEPT_CHANCE
                ? "accepted"
                : "rejected",
          };
          return next;
        });
      }, delay);
      timersRef.current.push(t);
    });
  }

  function handleRetry() {
    setPhase("picking");
    setStates([]);
    setAllDone(false);
  }

  function handleForceClose() {
    // 取消所有等待中的定时器
    timersRef.current.forEach((t) =>
      window.clearTimeout(t)
    );
    timersRef.current = [];
    onClose();
  }

  const accepted = states.filter(
    (s) => s.status === "accepted"
  );
  const isPicking = phase === "picking";
  const isWaiting = phase === "waiting";

  return (
    <div
      className="read-invite-backdrop"
      onClick={isPicking ? onClose : undefined}
    >
      <div
        className="read-invite-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="read-invite-header">
          <h2>{isPicking ? "一起读" : "邀请中…"}</h2>
          <button
            onClick={handleForceClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {isPicking && (
          <>
            <p className="read-invite-hint">
              邀请他们和你一起读这本书。
              <br />
              他们可能来，也可能不来。
            </p>

            <div className="read-invite-options">
              <button
                type="button"
                className={
                  levi
                    ? "read-invite-option is-on"
                    : "read-invite-option"
                }
                onClick={() => setLevi((v) => !v)}
              >
                <div className="read-invite-option-avatar">
                  {avatars.levi ? (
                    <img src={avatars.levi} alt="Levi" />
                  ) : (
                    <span>L</span>
                  )}
                </div>
                <div className="read-invite-option-name">
                  Levi
                </div>
                <div className="read-invite-option-status">
                  {levi ? "已选择" : "点此选择"}
                </div>
              </button>

              <button
                type="button"
                className={
                  erwin
                    ? "read-invite-option is-on"
                    : "read-invite-option"
                }
                onClick={() => setErwin((v) => !v)}
              >
                <div className="read-invite-option-avatar">
                  {avatars.erwin ? (
                    <img src={avatars.erwin} alt="Erwin" />
                  ) : (
                    <span>E</span>
                  )}
                </div>
                <div className="read-invite-option-name">
                  Erwin
                </div>
                <div className="read-invite-option-status">
                  {erwin ? "已选择" : "点此选择"}
                </div>
              </button>
            </div>

            <div className="read-invite-footer">
              <button
                type="button"
                className="read-invite-btn ghost"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="read-invite-btn"
                onClick={handleConfirm}
                disabled={!levi && !erwin}
              >
                邀请
              </button>
            </div>
          </>
        )}

        {isWaiting && (
          <>
            <p className="read-invite-hint">
              正在等待回应…
            </p>

            <div className="read-invite-statuses">
              {states.map((s) => (
                <div
                  key={s.partner}
                  className="read-invite-status"
                >
                  <div className="read-invite-status-avatar">
                    {s.partner === "levi" ? (
                      avatars.levi ? (
                        <img
                          src={avatars.levi}
                          alt="Levi"
                        />
                      ) : (
                        <span>L</span>
                      )
                    ) : avatars.erwin ? (
                      <img
                        src={avatars.erwin}
                        alt="Erwin"
                      />
                    ) : (
                      <span>E</span>
                    )}
                  </div>
                  <div className="read-invite-status-name">
                    {s.partner === "levi" ? "Levi" : "Erwin"}
                  </div>
                  <div
                    className={`read-invite-status-state state-${s.status}`}
                  >
                    {s.status === "pending" && (
                      <>
                        <Loader2
                          size={13}
                          strokeWidth={2.4}
                          className="read-invite-spin"
                        />
                        等待中
                      </>
                    )}
                    {s.status === "accepted" && (
                      <>
                        <Check
                          size={13}
                          strokeWidth={2.6}
                        />
                        同意了
                      </>
                    )}
                    {s.status === "rejected" && (
                      <>
                        <XCircle
                          size={13}
                          strokeWidth={2.4}
                        />
                        没空
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="read-invite-footer">
              {!allDone && (
                <>
                  <button
                    type="button"
                    className="read-invite-btn ghost"
                    onClick={handleForceClose}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="read-invite-btn"
                    disabled
                  >
                    等待中…
                  </button>
                </>
              )}
              {allDone && accepted.length === 0 && (
                <>
                  <button
                    type="button"
                    className="read-invite-btn ghost"
                    onClick={onClose}
                  >
                    算了
                  </button>
                  <button
                    type="button"
                    className="read-invite-btn"
                    onClick={handleRetry}
                  >
                    再试一次
                  </button>
                </>
              )}
              {allDone && accepted.length > 0 && (
                <button
                  type="button"
                  className="read-invite-btn"
                  onClick={() =>
                    onInvite(
                      accepted.map((s) => s.partner)
                    )
                  }
                >
                  开始一起读
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}