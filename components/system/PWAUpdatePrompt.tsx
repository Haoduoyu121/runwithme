"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  /* ---- 监听新 SW 接管 ---- */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    let refreshing = false;

    function onChange() {
      if (refreshing) return;
      if (!hadController) return; // 首次安装，不提示
      setShowUpdate(true);
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onChange
      );
    };
  }, []);

  /* ---- 主动检查更新（关键：iOS PWA 不会自己查） ---- */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    async function checkUpdate() {
      try {
        const reg =
          await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        await reg.update();
      } catch {
        /* ignore */
      }
    }

    /* 打开 3 秒后查一次（避开首屏） */
    const firstCheck = window.setTimeout(checkUpdate, 3000);

    /* 每 30 分钟查一次 */
    const timer = window.setInterval(
      checkUpdate,
      30 * 60 * 1000
    );

    /* 每次从后台切回前台也查一次 */
    function onVisible() {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    }
    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      window.clearTimeout(firstCheck);
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  function handleRefresh() {
    /* 触发新 SW 立即接管 */
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SKIP_WAITING",
      });
    }
    /* 强制刷新，绕过缓存 */
    window.location.reload();
  }

  if (!showUpdate) return null;

  return (
    <div className="pwa-update-toast">
      <span className="pwa-update-text">有新版本</span>
      <button
        className="pwa-update-btn"
        onClick={handleRefresh}
      >
        <RefreshCw size={13} strokeWidth={2.4} />
        刷新
      </button>
    </div>
  );
}