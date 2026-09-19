"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import {
  loadPendingReadInvite,
  savePendingReadInvite,
  loadLastSysInviteAt,
  saveLastSysInviteAt,
} from "@/lib/readInviteStorage";

type Partner = "levi" | "erwin";

const CHECK_MIN_MS = 90 * 1000;
const CHECK_MAX_MS = 180 * 1000;
const TRIGGER_CHANCE = 0.07;
const MIN_GAP_MS = 30 * 60 * 1000;

export default function ReadInviteScheduler() {
  const [invite, setInvite] = useState<{
    from: Partner[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    function scheduleNext() {
      if (cancelled) return;
      const wait =
        CHECK_MIN_MS +
        Math.random() * (CHECK_MAX_MS - CHECK_MIN_MS);
      timer = window.setTimeout(() => {
        maybeTrigger();
        scheduleNext();
      }, wait);
    }

    function maybeTrigger() {
      if (cancelled) return;
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") return;

      const last = loadLastSysInviteAt();
      if (Date.now() - last < MIN_GAP_MS) return;

      if (loadPendingReadInvite()) return;

      if (Math.random() >= TRIGGER_CHANCE) return;

      const from: Partner[] = [];
      if (Math.random() < 0.7) from.push("levi");
      if (Math.random() < 0.7) from.push("erwin");
      if (from.length === 0) {
        from.push(Math.random() < 0.5 ? "levi" : "erwin");
      }

      saveLastSysInviteAt(Date.now());
      setInvite({ from });
    }

    scheduleNext();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  function handleAccept() {
    if (!invite) return;
    savePendingReadInvite({
      id: `pi-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      from: invite.from,
      createdAt: Date.now(),
    });
    setInvite(null);
  }

  function handleReject() {
    setInvite(null);
  }

  if (!invite) return null;

  const names = invite.from
    .map((p) => (p === "levi" ? "Levi" : "Erwin"))
    .join(" & ");

  return (
    <div className="read-invite-sys-backdrop">
      <div className="read-invite-sys">
        <div className="read-invite-sys-icon">
          <BookOpen size={22} strokeWidth={1.8} />
        </div>
        <div className="read-invite-sys-title">一起读</div>
        <div className="read-invite-sys-text">
          {names} 想和你一起读一本书
        </div>
        <div className="read-invite-sys-actions">
          <button
            className="read-invite-sys-btn ghost"
            onClick={handleReject}
          >
            下次吧
          </button>
          <button
            className="read-invite-sys-btn"
            onClick={handleAccept}
          >
            好呀
          </button>
        </div>
      </div>
    </div>
  );
}