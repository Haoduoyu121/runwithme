"use client";

import {
  formatCallDuration,
  type ActiveCall,
} from "@/lib/CallContext";

type CallOverlayProps = {
  call: ActiveCall;
  seconds: number;
  onAccept: () => void;
  onDecline: () => void;
  onHangup: () => void;
  onMinimize: () => void;
};

export default function CallOverlay({
  call,
  seconds,
  onAccept,
  onDecline,
  onHangup,
  onMinimize,
}: CallOverlayProps) {
  const { phase, direction, target } = call;

  const isCalling = phase === "outgoing";
  const isRinging = phase === "incoming";
  const isConnected = phase === "connected";

  let statusText = "";
  if (isCalling) statusText = "正在呼叫…";
  else if (isRinging)
    statusText =
      direction === "incoming" ? "来电" : "正在响铃…";
  else if (isConnected)
    statusText = formatCallDuration(seconds);

  const displayName =
    target === "Both" ? "Levi & Erwin" : target;

  const avatarText =
    target === "Both"
      ? "L&E"
      : target === "Levi"
        ? "L"
        : "E";

  return (
    <div className="call-overlay">
      <div className="call-overlay-content">
        <div className="call-avatar">{avatarText}</div>

        <div className="call-name">{displayName}</div>

        <div className="call-status">{statusText}</div>
      </div>

      <div className="call-actions">
        {isRinging && (
          <>
            <button
              className="call-btn decline"
              onClick={onDecline}
              type="button"
            >
              拒绝
            </button>

            <button
              className="call-btn accept"
              onClick={onAccept}
              type="button"
            >
              接听
            </button>
          </>
        )}

        {isCalling && (
          <button
            className="call-btn hangup"
            onClick={onHangup}
            type="button"
          >
            挂断
          </button>
        )}

        {isConnected && (
          <>
            <button
              className="call-btn minimize"
              onClick={onMinimize}
              type="button"
            >
              最小化
            </button>

            <button
              className="call-btn hangup"
              onClick={onHangup}
              type="button"
            >
              挂断
            </button>
          </>
        )}
      </div>
    </div>
  );
}