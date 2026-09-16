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

/* ---------- Chat 回复配置 ---------- */

export type ChatReplySettings = {
  /* 一次生成几条回复 */
  replyCountMin: number;
  replyCountMax: number;

  /* 多条回复之间的间隔（秒） */
  replyIntervalMin: number;
  replyIntervalMax: number;

  /* 用户发消息后多久开始回复（秒） */
  userReplyDelayMin: number;
  userReplyDelayMax: number;

  /* 后台自动发消息的间隔（分钟） */
  autoReplyMin: number;
  autoReplyMax: number;

  /* 引用用户消息的概率（0~1） */
  quoteChance: number;
};

/* ---------- 角色显示名 ---------- */

export type CharacterNames = {
  you: string;
  levi: string;
  erwin: string;
};

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

  /* 字体缩放（0.85 ~ 1.3） */
  fontScale: number;

  /* 拍一拍内容 */
  patMessages: {
    levi: string[];
    erwin: string[];
  };

  /* 角色显示名 */
  characterNames: CharacterNames;

  /* Chat 回复配置 */
  chatReply: ChatReplySettings;

    /* Chat 自定义 CSS */
  chatCustomCSS: string;
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
  patMessages: {
    levi: [
      "拍了拍 Levi 的头像",
      "轻轻戳了戳 Levi",
      "从背后抱住了 Levi",
      "揉了揉 Levi 的头发",
    ],
    erwin: [
      "拍了拍 Erwin 的头像",
      "拉了拉 Erwin 的衣角",
      "戳了戳 Erwin 的手臂",
      "靠在了 Erwin 的肩膀上",
    ],
  },
  characterNames: {
    you: "You",
    levi: "Levi",
    erwin: "Erwin",
  },
  chatReply: {
    replyCountMin: 1,
    replyCountMax: 3,
    replyIntervalMin: 2,
    replyIntervalMax: 6,
    userReplyDelayMin: 2,
    userReplyDelayMax: 8,
    autoReplyMin: 3,
    autoReplyMax: 30,
    quoteChance: 0.25,
  },
    chatCustomCSS: "",
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
      fontScale:
        typeof parsed.fontScale === "number"
          ? Math.min(1.3, Math.max(0.85, parsed.fontScale))
          : 1,
      patMessages: {
        levi:
          Array.isArray(parsed.patMessages?.levi) &&
          parsed.patMessages.levi.length > 0
            ? parsed.patMessages.levi
            : defaultSettings.patMessages.levi,
        erwin:
          Array.isArray(parsed.patMessages?.erwin) &&
          parsed.patMessages.erwin.length > 0
            ? parsed.patMessages.erwin
            : defaultSettings.patMessages.erwin,
      },
      characterNames: {
        ...defaultSettings.characterNames,
        ...(parsed.characterNames ?? {}),
      },
      chatReply: {
        ...defaultSettings.chatReply,
        ...(parsed.chatReply ?? {}),
      },
            chatCustomCSS:
        typeof parsed.chatCustomCSS === "string"
          ? parsed.chatCustomCSS
          : "",
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
    patMessages: {
      ...current.patMessages,
      ...(updates.patMessages ?? {}),
    },
    characterNames: {
      ...current.characterNames,
      ...(updates.characterNames ?? {}),
    },
    chatReply: {
      ...current.chatReply,
      ...(updates.chatReply ?? {}),
    },
  };

  saveSystemSettings(next);
  return next;
}

export function clearSystemSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SETTINGS_KEY);
}