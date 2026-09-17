/* =========================================================================
   Watch App · 设置
   Key: runwithme_watch_settings_v1
   ========================================================================= */

export type WatchSettings = {
  /* 播放中角色是否会主动发消息 */
  autoMessageEnabled: boolean;
};

const KEY = "runwithme_watch_settings_v1";

const DEFAULT_SETTINGS: WatchSettings = {
  autoMessageEnabled: true,
};

export function loadWatchSettings(): WatchSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const raw = window.localStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        autoMessageEnabled:
          typeof parsed.autoMessageEnabled === "boolean"
            ? parsed.autoMessageEnabled
            : DEFAULT_SETTINGS.autoMessageEnabled,
      };
    }
  } catch {
    /* 忽略 */
  }

  return DEFAULT_SETTINGS;
}

export function saveWatchSettings(s: WatchSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}