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

    let disposed = false;
    let refreshing = false;

    /* 第一次加载时，若新 SW 接管控制 → reload */
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      }
    );

    /* 主动检查更新 */
    async function checkUpdate() {
      try {
        const reg =
          await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        await reg.update();

        /* 找到 waiting 状态的 SW → 通知它立刻接管 */
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      } catch (e) {
        /* ignore */
      }
    }

    /* 每 30 分钟检查一次 */
    const timer = window.setInterval(checkUpdate, 30 * 60 * 1000);

    /* 每次页面重新可见时检查（iOS PWA 从后台切回来） */
    function onVisible() {
      if (document.visibilityState === "visible") {
        checkUpdate();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    /* 首次 3 秒后也检查一次（避开首屏加载） */
    const firstCheck = window.setTimeout(checkUpdate, 3000);

    return () => {
      disposed = true;
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