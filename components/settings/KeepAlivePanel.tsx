"use client";

import { useEffect, useState } from "react";

import { useKeepAlive } from "@/lib/KeepAliveContext";
import { useNotifications } from "@/lib/NotificationContext";

export default function KeepAlivePanel() {
  const {
    enabled,
    audioUrl,
    isPlaying,
    error,
    setEnabled,
    setAudioUrl,
  } = useKeepAlive();

  const { permission, requestPermission } =
    useNotifications();

  const [draftUrl, setDraftUrl] = useState(audioUrl);

  useEffect(() => {
    setDraftUrl(audioUrl);
  }, [audioUrl]);

  async function handleRequestPermission() {
    await requestPermission();
  }

  function handleSaveUrl() {
    setAudioUrl(draftUrl.trim());
  }

  function handleClearUrl() {
    setAudioUrl("");
    setDraftUrl("");
  }

  return (
    <div className="settings-keepalive">
      {/* 通知权限 */}
      <div className="settings-keepalive-row">
        <div className="settings-keepalive-info">
          <strong>通知权限</strong>
          <small>
            允许 RunWithme 在后台推送系统通知
          </small>
        </div>

        {permission === "granted" ? (
          <span className="settings-keepalive-badge">
            已授权
          </span>
        ) : permission === "denied" ? (
          <span className="settings-keepalive-badge is-denied">
            已拒绝
          </span>
        ) : permission === "unsupported" ? (
          <span className="settings-keepalive-badge is-denied">
            不支持
          </span>
        ) : (
          <button
            className="settings-keepalive-btn"
            onClick={handleRequestPermission}
          >
            授权
          </button>
        )}
      </div>

      {/* 保活开关 */}
      <div className="settings-keepalive-row">
        <div className="settings-keepalive-info">
          <strong>后台保活</strong>
          <small>
            页面隐藏时循环播放你提供的音频，避免 iOS
            PWA 被系统挂起
          </small>
        </div>

        <button
          className={
            "settings-keepalive-switch" +
            (enabled ? " on" : "")
          }
          onClick={() => setEnabled(!enabled)}
          aria-label="切换保活"
        >
          <span />
        </button>
      </div>

      {enabled && (
        <>
          <div className="settings-keepalive-hint">
            支持 mp3 / wav / m4a。建议 1~5
            秒的静音音频循环。播放视频/听歌时会自动停用。
          </div>

          <div className="settings-keepalive-url-row">
            <input
              type="text"
              className="settings-keepalive-input"
              placeholder="粘贴音频 URL（https://...）"
              value={draftUrl}
              onChange={(e) =>
                setDraftUrl(e.target.value)
              }
              onBlur={handleSaveUrl}
            />
            <button
              className="settings-keepalive-save"
              onClick={handleSaveUrl}
              disabled={draftUrl.trim() === audioUrl}
            >
              保存
            </button>
          </div>

          {audioUrl && (
            <div className="settings-keepalive-preview">
              <span className="settings-keepalive-preview-icon">
                ♪
              </span>
              <span className="settings-keepalive-preview-name">
                {audioUrl.length > 60
                  ? audioUrl.slice(0, 60) + "…"
                  : audioUrl}
              </span>
              <button
                className="settings-keepalive-clear"
                onClick={handleClearUrl}
              >
                清除
              </button>
            </div>
          )}

          <div className="settings-keepalive-status">
            {error
              ? `播放失败：${error}`
              : isPlaying
                ? "保活运行中（页面隐藏）"
                : "待命（切到后台时激活）"}
          </div>
        </>
      )}
    </div>
  );
}