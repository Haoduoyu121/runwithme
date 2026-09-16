"use client";

import { useEffect } from "react";

import { useICity } from "@/lib/ICityContext";
import { formatTimeAgo } from "@/data/icity";

type ICityNotificationPanelProps = {
  onClose: () => void;
  onOpenPost: (postId: string) => void;
};

export default function ICityNotificationPanel({
  onClose,
  onOpenPost,
}: ICityNotificationPanelProps) {
  const {
    notifications,
    markAllNotificationsRead,
    clearNotifications,
  } = useICity();

  /* 打开即全部已读（延迟到下一帧，避免和面板打开动画叠加） */
  useEffect(() => {
    if (!notifications.some((n) => !n.read)) return;
    const id = requestAnimationFrame(() => {
      markAllNotificationsRead();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="icity-notif-backdrop"
      onClick={onClose}
    >
      <div
        className="icity-notif-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="icity-notif-header">
          <h2>互动消息</h2>
          <div className="icity-notif-header-actions">
            {notifications.length > 0 && (
              <button
                className="icity-notif-clear"
                onClick={() => {
                  if (
                    window.confirm(
                      "清空所有互动消息？"
                    )
                  ) {
                    clearNotifications();
                  }
                }}
              >
                清空
              </button>
            )}
            <button
              className="icity-notif-close"
              onClick={onClose}
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>

        <div className="icity-notif-body">
          {notifications.length === 0 ? (
            <div className="icity-notif-empty">
              <div className="icity-notif-empty-icon">
                ♡
              </div>
              <div className="icity-notif-empty-title">
                还没有互动
              </div>
              <div className="icity-notif-empty-desc">
                别人给你的帖子点赞或评论时会显示在这里
              </div>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={`icity-notif-item${
                  n.read ? "" : " is-unread"
                }`}
                onClick={() => {
                  onOpenPost(n.postId);
                  onClose();
                }}
              >
                <div
                  className={`icity-avatar icity-avatar-small ${
                    n.from === "Levi"
                      ? "icity-avatar-levi"
                      : "icity-avatar-erwin"
                  }`}
                >
                  {n.from.charAt(0)}
                </div>

                <div className="icity-notif-item-body">
                  <div className="icity-notif-item-head">
                    <strong>{n.from}</strong>
                    <span className="icity-notif-item-action">
                      {n.type === "like"
                        ? "赞了你的动态"
                        : "评论了你的动态"}
                    </span>
                    <span className="icity-notif-item-time">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>

                  <div className="icity-notif-item-preview">
                    {n.type === "comment" &&
                    n.commentText ? (
                      <>
                        <span className="icity-notif-item-text">
                          “{n.commentText}”
                        </span>
                        <span className="icity-notif-item-post">
                          原帖：{n.postPreview}
                        </span>
                      </>
                    ) : (
                      n.postPreview
                    )}
                  </div>
                </div>

                {!n.read && (
                  <span className="icity-notif-item-dot" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}