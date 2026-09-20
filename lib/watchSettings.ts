/* =========================================================================
   Watch App · 设置
   Key: runwithme_watch_settings_v1
   ========================================================================= */

export type WatchSettings = {
  /* 播放中角色是否会主动发消息 */
  autoMessageEnabled: boolean;
  /* 看完后发 iCity 动态的概率 0~1 */
  icityPostChance: number;
};

const KEY = "runwithme_watch_settings_v1";

const DEFAULT_SETTINGS: WatchSettings = {
  autoMessageEnabled: true,
  icityPostChance: 0.5,
};

export function loadWatchSettings(): WatchSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const raw = window.localStorage.getItem(KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const rawChance =
        typeof parsed.icityPostChance === "number"
          ? parsed.icityPostChance
          : DEFAULT_SETTINGS.icityPostChance;
      return {
        autoMessageEnabled:
          typeof parsed.autoMessageEnabled === "boolean"
            ? parsed.autoMessageEnabled
            : DEFAULT_SETTINGS.autoMessageEnabled,
        icityPostChance: Math.min(
          1,
          Math.max(0, rawChance)
        ),
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