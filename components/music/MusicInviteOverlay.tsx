"use client";

import { useMusicInvite } from "@/lib/MusicInviteContext";

export default function MusicInviteOverlay() {
  const {
    systemInvite,
    remaining,
    accept,
    decline,
  } = useMusicInvite();

  if (!systemInvite) return null;

  return (
    <div className="music-invite-overlay">
      <div className="music-sys-invite">
        <div className="music-sys-invite-text">
          <span className="music-sys-invite-icon">♪</span>
          <strong>
            {systemInvite.from === "Both"
              ? "Levi & Erwin"
              : systemInvite.from}
          </strong>
          <span> 邀请你一起听歌</span>
          <span className="music-sys-invite-countdown">
            {remaining}s
          </span>
        </div>
        <div className="music-sys-invite-actions">
          <button
            className="music-sys-invite-accept"
            onClick={accept}
          >
            接受
          </button>
          <button
            className="music-sys-invite-decline"
            onClick={decline}
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  );
}