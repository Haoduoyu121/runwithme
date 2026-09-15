"use client";

import { useEffect } from "react";
import { useSystem } from "@/lib/SystemContext";

export default function FontScaleApplier() {
  const { settings } = useSystem();

  useEffect(() => {
    const scale = settings.fontScale ?? 1;

    /* 用 zoom 全站等比缩放 */
    document.documentElement.style.setProperty(
      "zoom",
      String(scale)
    );

    /* 兼容 Firefox（不支持 zoom 时用 transform） */
    if (!("zoom" in document.documentElement.style)) {
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = "top left";
      document.body.style.width = `${100 / scale}%`;
      document.body.style.height = `${100 / scale}%`;
    }

    /* 同步 CSS 变量，供需要单独读取的地方使用 */
    document.documentElement.style.setProperty(
      "--font-scale",
      String(scale)
    );
  }, [settings.fontScale]);

  return null;
}