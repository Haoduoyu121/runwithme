/* =========================================================
   RunWithme · Focus Settings (localStorage)
   ========================================================= */

export type FocusWallpaperType = "none" | "image" | "video";

import type { BubbleFrequency } from "@/data/checkinVoiceCards";

export type FocusSettings = {
  wallpaperType: FocusWallpaperType;
  wallpaperMime: string;
  /* 白噪音是否默认开启（上传了文件才有意义） */
  noiseDefaultOn: boolean;
  /* 语音气泡频率 */
  bubbleFrequency: BubbleFrequency;
};

const KEY = "runwithme_focus_settings_v1";

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  wallpaperType: "none",
  wallpaperMime: "",
  noiseDefaultOn: true,
  bubbleFrequency: "medium",
};

export function loadFocusSettings(): FocusSettings {
  if (typeof window === "undefined") {
    return DEFAULT_FOCUS_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_FOCUS_SETTINGS;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.wallpaperType === "none" ||
        parsed.wallpaperType === "image" ||
        parsed.wallpaperType === "video") &&
      typeof parsed.wallpaperMime === "string"
    ) {
      const freq =
        parsed.bubbleFrequency === "low" ||
        parsed.bubbleFrequency === "medium" ||
        parsed.bubbleFrequency === "high"
          ? parsed.bubbleFrequency
          : "medium";

      return {
        wallpaperType: parsed.wallpaperType,
        wallpaperMime: parsed.wallpaperMime,
        noiseDefaultOn:
          typeof parsed.noiseDefaultOn === "boolean"
            ? parsed.noiseDefaultOn
            : true,
        bubbleFrequency: freq,
      };
    }
    return DEFAULT_FOCUS_SETTINGS;
  } catch {
    return DEFAULT_FOCUS_SETTINGS;
  }
}
/* ★ 改为 patch 模式：只传要改的字段，其余保留原值 */
export function saveFocusSettings(
  patch: Partial<FocusSettings>
): void {
  if (typeof window === "undefined") return;
  const current = loadFocusSettings();
  const next: FocusSettings = {
    ...current,
    ...patch,
  };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}