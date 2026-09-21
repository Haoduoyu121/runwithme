"use client";

import { useEffect } from "react";

/**
 * PWA 更新检测：
 * 1. 每 30 分钟主动拉一次 sw.js
 * 2. 每次页面可见时也拉一次
 * 3. 检测到新版本 → 自动 reload
 */
export default function PwaUpdater() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    /* 新 SW 接管控制 → reload */
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    /* 主动检查更新 */
    async function checkUpdate() {
      try {
        const reg =
          await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        await reg.update();

        /* waiting 状态的 SW → 通知它立刻接管 */
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch {
        /* ignore */
      }
    }

    const timer = window.setInterval(
      checkUpdate,
      30 * 60 * 1000
    );

    function onVisible() {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    }
    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    const firstCheck = window.setTimeout(checkUpdate, 3000);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      window.clearInterval(timer);
      window.clearTimeout(firstCheck);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, []);

  return null;
}