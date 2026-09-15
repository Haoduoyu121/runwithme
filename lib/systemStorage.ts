export type RunwithmeTheme = "light" | "dark";

/* ---------- App ---------- */

export type AppId =
  | "chat"
  | "music"
  | "photos"
  | "icity"
  | "notes"
  | "calendar"
  | "cards"
  | "questionnaire"
  | "checkin";

export type AppIconState = "custom" | null;

/* ---------- Dock ---------- */

export type DockSlotId =
  | "slot-1"
  | "slot-2"
  | "slot-3"
  | "slot-4";

/* ---------- Settings ---------- */

export type SystemSettings = {
  theme: RunwithmeTheme;
  lockScreenWallpaper: string;
  homeWallpaper: string;
  avatars: {
    you: string | null;
    levi: string | null;
    erwin: string | null;
  };
  appIcons: Record<AppId, AppIconState>;
  dockIcons: Record<DockSlotId, AppIconState>;
  chatName: string;
  chatBackground: string | null;

  /* ★ 新增：字体缩放（0.85 ~ 1.3） */
  fontScale: number;
};

const SETTINGS_KEY = "runwithme_system_settings";

const defaultSettings: SystemSettings = {
  theme: "light",
  lockScreenWallpaper: "default-rose",
  homeWallpaper: "default-rose",
  avatars: {
    you: null,
    levi: null,
    erwin: null,
  },
  appIcons: {
    chat: null,
    music: null,
    photos: null,
    icity: null,
    notes: null,
    calendar: null,
    cards: null,
    questionnaire: null,
    checkin: null,
  },
  dockIcons: {
    "slot-1": null,
    "slot-2": null,
    "slot-3": null,
    "slot-4": null,
  },
  chatName: "Levi & Erwin",
  chatBackground: null,
  fontScale: 1,
};

export function loadSystemSettings(): SystemSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const saved = window.localStorage.getItem(SETTINGS_KEY);

  if (!saved) {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(defaultSettings)
    );
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...defaultSettings,
      ...parsed,
      avatars: {
        ...defaultSettings.avatars,
        ...(parsed.avatars ?? {}),
      },
      appIcons: {
        ...defaultSettings.appIcons,
        ...(parsed.appIcons ?? {}),
      },
      dockIcons: {
        ...defaultSettings.dockIcons,
        ...(parsed.dockIcons ?? {}),
      },
      /* ★ 兼容旧数据 + 范围限制 */
      fontScale:
        typeof parsed.fontScale === "number"
          ? Math.min(
              1.3,
              Math.max(0.85, parsed.fontScale)
            )
          : 1,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSystemSettings(
  settings: SystemSettings
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}

export function updateSystemSettings(
  updates: Partial<SystemSettings>
): SystemSettings {
  const current = loadSystemSettings();

  const next: SystemSettings = {
    ...current,
    ...updates,
    avatars: {
      ...current.avatars,
      ...(updates.avatars ?? {}),
    },
    appIcons: {
      ...current.appIcons,
      ...(updates.appIcons ?? {}),
    },
    dockIcons: {
      ...current.dockIcons,
      ...(updates.dockIcons ?? {}),
    },
  };

  saveSystemSettings(next);
  return next;
}

export function clearSystemSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SETTINGS_KEY);
}