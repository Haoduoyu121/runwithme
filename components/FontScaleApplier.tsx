"use client";

import { useEffect, useRef } from "react";
import { useSystem } from "@/lib/SystemContext";

export default function FontScaleApplier() {
  const { settings } = useSystem();

  const mountedRef = useRef(false);
  const prevScaleRef = useRef<number | null>(null);
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const scale = settings.fontScale ?? 1;

    /* 应用 zoom / transform */
    document.documentElement.style.setProperty(
      "zoom",
      String(scale)
    );

    if (!("zoom" in document.documentElement.style)) {
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = "top left";
      document.body.style.width = `${100 / scale}%`;
      document.body.style.height = `${100 / scale}%`;
    }

    document.documentElement.style.setProperty(
      "--font-scale",
      String(scale)
    );

    /* 首次挂载：不刷新 */
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevScaleRef.current = scale;
      return;
    }

    /* 后续变更：scale 真的变了才处理 */
    if (prevScaleRef.current === scale) return;
    prevScaleRef.current = scale;

    /* ★ iOS PWA：动态改 zoom 会让 file input 热区失效
       唯一可靠的修复是刷新页面。加 debounce 让用户
       连续点 +/- 时只刷新一次。 */
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
      }
      reloadTimerRef.current = window.setTimeout(() => {
        window.location.reload();
      }, 700);
    }

    return () => {
      if (reloadTimerRef.current !== null) {
        window.clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
    };
  }, [settings.fontScale]);

  return null;
}