"use client";

import { useEffect, useState } from "react";

import { Check, X } from "lucide-react";

import type { ChatMessage } from "@/data/chat";
import { getChatFile } from "@/lib/chatFiles";

type Props = {
  message: ChatMessage;
  names: { levi: string; erwin: string; you: string };
  onAccept?: () => void;
  onReject?: () => void;
};

export default function AvatarRequestBubble({
  message,
  names,
  onAccept,
  onReject,
}: Props) {
  const req = message.avatarRequest;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!req?.avatarFileId) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    void (async () => {
      const blob = await getChatFile(req.avatarFileId);
      if (!blob || cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setUrl(createdUrl);
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [req?.avatarFileId]);

  if (!req) return null;

  const fromName =
    req.from === "Levi"
      ? names.levi
      : req.from === "Erwin"
        ? names.erwin
        : req.from === "You"
          ? names.you
          : req.from;

  const toName =
    req.to === "Levi"
      ? names.levi
      : req.to === "Erwin"
        ? names.erwin
        : req.to === "You"
          ? names.you
          : req.to;

  const isFromYou = req.from === "You";
  const canRespond =
    req.to === "You" &&
    req.status === "pending" &&
    !!onAccept &&
    !!onReject;

  const title = isFromYou
    ? `你希望 ${toName} 用这个头像`
    : `${fromName} 希望你用这个头像`;

  return (
    <div
      className={
        "avatar-req-bubble" +
        (req.status === "accepted" ? " is-accepted" : "") +
        (req.status === "rejected" ? " is-rejected" : "")
      }
    >
      <div className="avatar-req-bubble-title">{title}</div>

      <div className="avatar-req-bubble-avatar">
        {url ? (
          <img src={url} alt="头像" />
        ) : (
          <div className="avatar-req-bubble-avatar-loading">
            …
          </div>
        )}
      </div>

      {canRespond ? (
        <div className="avatar-req-bubble-actions">
          <button
            type="button"
            className="avatar-req-bubble-btn reject"
            onClick={(e) => {
              e.stopPropagation();
              onReject?.();
            }}
          >
            <X size={14} strokeWidth={2.6} />
            <span>拒绝</span>
          </button>
          <button
            type="button"
            className="avatar-req-bubble-btn accept"
            onClick={(e) => {
              e.stopPropagation();
              onAccept?.();
            }}
          >
            <Check size={14} strokeWidth={2.6} />
            <span>接受</span>
          </button>
        </div>
      ) : (
        <div className="avatar-req-bubble-status">
          {req.status === "pending" && "等待回应…"}
          {req.status === "accepted" && (
            <>
              <Check size={12} strokeWidth={3} />
              <span>已换</span>
            </>
          )}
          {req.status === "rejected" && (
            <>
              <X size={12} strokeWidth={3} />
              <span>已拒绝</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}