"use client";

import {
  useNotifications,
  type NotificationCharacter,
} from "@/lib/NotificationContext";

function avatarChar(c: NotificationCharacter): string {
  if (c === "Levi") return "L";
  if (c === "Erwin") return "E";
  if (c === "you") return "Y";
  return "·";
}

function avatarClass(c: NotificationCharacter): string {
  if (c === "Levi") return "notif-avatar-levi";
  if (c === "Erwin") return "notif-avatar-erwin";
  if (c === "you") return "notif-avatar-you";
  return "notif-avatar-sys";
}

export default function NotificationOverlay() {
  const { notifications, dismiss, launchApp } =
    useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notif-overlay">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="notif-card"
          role="button"
          tabIndex={0}
          onClick={() => {
            launchApp(n.appId);
            dismiss(n.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              launchApp(n.appId);
              dismiss(n.id);
            }
          }}
        >
          <span
            className={
              "notif-avatar " + avatarClass(n.character)
            }
          >
            {avatarChar(n.character)}
          </span>

          <div className="notif-body">
            <div className="notif-title">{n.title}</div>
            <div className="notif-text">{n.body}</div>
          </div>

          <button
            className="notif-close"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(n.id);
            }}
            aria-label="关闭通知"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}