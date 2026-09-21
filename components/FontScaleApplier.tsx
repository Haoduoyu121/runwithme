"use client";

import { useEffect } from "react";
import { useSystem } from "@/lib/SystemContext";

export default function FontScaleApplier() {
  const { settings } = useSystem();

  useEffect(() => {
    const scale = settings.fontScale ?? 1;

    const isIOS =
      typeof navigator !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" &&
          navigator.maxTouchPoints > 1));

    if (isIOS) {
      document.documentElement.style.removeProperty("zoom");
      document.body.style.removeProperty("transform");
      document.body.style.removeProperty("transformOrigin");
      document.body.style.removeProperty("width");
      document.body.style.removeProperty("height");
      document.documentElement.style.setProperty("--font-scale", "1");
      return;
    }

    document.documentElement.style.setProperty(
      "zoom",
      String(scale)
    );
    document.documentElement.style.setProperty(
      "--font-scale",
      String(scale)
    );
  }, [settings.fontScale]);

  return null;
}