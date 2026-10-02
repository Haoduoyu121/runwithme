"use client";

import { useEffect, useState } from "react";

import {
  Bell,
  BellOff,
  Check,
  Smartphone,
} from "lucide-react";

import {
  getPermission,
  getSubscriptionState,
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/webPushClient";

export default function PushSettingsCard() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<{
    supported: boolean;
    standalone: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  }>({
    supported: true,
    standalone: false,
    permission: "default",
    subscribed: false,
  });

  async function refresh() {
    const s = await getSubscriptionState();
    setState(s);
  }

  useEffect(() => {
    void refresh();
    /* 回到前台时刷新一次 */
    function onVis() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVis
      );
    };
  }, []);

  async function handleToggle() {
    setLoading(true);
    try {
      if (state.subscribed) {
        const ok = await unsubscribePush();
        if (!ok) window.alert("关闭失败，请稍后再试");
      } else {
        const r = await subscribePush();
        if (!r.ok) {
          switch (r.reason) {
            case "unsupported":
              window.alert(
                "当前浏览器不支持推送（需要 iOS 16.4+ 且从主屏打开）"
              );
              break;
            case "not-standalone":
              window.alert(
                "请在 iPhone 上先「添加到主屏幕」，然后从主屏幕的图标打开 RunWithme，再来开启推送。"
              );
              break;
            case "permission-denied":
              window.alert(
                "你拒绝了通知权限。请到 iPhone 设置 → 通知 → RunWithme 里重新允许。"
              );
              break;
            case "server-no-key":
              window.alert(
                "服务器未配置推送密钥，请联系管理员。"
              );
              break;
            default:
              window.alert("订阅失败，请稍后再试");
          }
        }
      }
    } finally {
      await refresh();
      setLoading(false);
    }
  }

  const disabled =
    loading ||
    !state.supported ||
    (!state.standalone && !state.subscribed);

  return (
    <div className="potato-push-card">
      <div className="potato-push-row">
        <div className="potato-push-icon">
          {state.subscribed ? (
            <Bell size={18} strokeWidth={2.2} />
          ) : (
            <BellOff size={18} strokeWidth={2.2} />
          )}
        </div>
        <div className="potato-push-info">
          <div className="potato-push-title">
            系统推送
          </div>
          <div className="potato-push-desc">
            {!state.supported
              ? "当前浏览器不支持推送"
              : !state.standalone && !state.subscribed
                ? "请从主屏幕打开 RunWithme 后再开启"
                : state.permission === "denied"
                  ? "已被系统拒绝，请到 设置 → 通知 里允许"
                  : state.subscribed
                    ? "已开启，锁屏 / 关掉 App 也能收到"
                    : "开启后，角色活动会通过系统通知推送给你"}
          </div>
        </div>
      </div>

      {state.supported && (
        <button
          type="button"
          className={
            "potato-push-btn" +
            (state.subscribed ? " is-on" : "")
          }
          onClick={handleToggle}
          disabled={disabled}
          style={
            disabled
              ? { opacity: 0.5, cursor: "not-allowed" }
              : undefined
          }
        >
          {state.subscribed ? (
            <>
              <Check size={14} strokeWidth={2.8} />
              <span>{loading ? "处理中…" : "已开启 · 点击关闭"}</span>
            </>
          ) : (
            <>
              <Smartphone size={14} strokeWidth={2.4} />
              <span>{loading ? "处理中…" : "开启系统推送"}</span>
            </>
          )}
        </button>
      )}

      {!state.standalone && state.supported && (
        <div className="potato-push-hint">
          iPhone 上需要：Safari 打开网站 → 分享 →
          添加到主屏幕 → 从主屏图标启动 → 再回来开启
        </div>
      )}
    </div>
  );
}