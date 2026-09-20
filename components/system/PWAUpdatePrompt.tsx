"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // 页面加载时是否已经有 SW 接管
    // false 说明是首次安装，此时不提示
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

  function handleRefresh() {
    // 触发新 SW 立即接管
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SKIP_WAITING",
      });
    }
    // 强制刷新，绕过缓存
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