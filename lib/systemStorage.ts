export type RunwithmeTheme = "light" | "dark";
export type RunwithmeVisualStyle = "macaron" | "mono";

/* ---------- App ---------- */

export type AppId =
  | "chat"
  | "music"
  | "photos"
  | "icity"
  | "cards"
  | "calendar"
  | "notes"
  | "questionnaire"
  | "checkin"
  | "letter"
  | "collection"
  | "study"
  | "watch"
  | "memory"
  | "random"
  | "search"
  | "read"
  | "fridge"
  | "ai"
  | "tarot"
  | "games"
  | "potato"
  | "shop";
export type AppIconState = "custom" | null;

/* ---------- Dock ---------- */

export type DockSlotId =
  | "slot-1"
  | "slot-2"
  | "slot-3"
  | "slot-4";

/* ---------- Chat 回复配置 ---------- */

export type ChatReplySettings = {
  replyCountMin: number;
  replyCountMax: number;
  replyIntervalMin: number;
  replyIntervalMax: number;
  userReplyDelayMin: number;
  userReplyDelayMax: number;
  autoReplyMin: number;
  autoReplyMax: number;
  singleAutoReplyMin?: number;
  singleAutoReplyMax?: number;
  quoteChance: number;
};

/* ---------- 头像自动切换 ---------- */

export type AvatarSwitchSettings = {
  /* —— 用户请求角色换头像 —— */
  requestEnabled: boolean;
  /** 答应概率 0~1 */
  requestChance: number;
  /** 考虑延迟（秒） */
  requestDelayMin: number;
  requestDelayMax: number;

  /* —— 后台主动换 —— */
  backgroundEnabled: boolean;
  /** 后台间隔（分钟） */
  backgroundIntervalMin: number;
  backgroundIntervalMax: number;
  /** 每次掷骰子概率 0~1 */
  backgroundChance: number;
  backgroundLevi: boolean;
  backgroundErwin: boolean;

  /* —— iCity 头像（角色发帖时触发） —— */
  icityChanceLevi: number;
  icityChanceErwin: number;

  /* —— 角色给用户换头像 —— */
  userAvatarEnabled: boolean;
  userAvatarChance: number;

  /* —— 用户请求角色换头像成功后，角色"回礼"给用户换的概率 —— */
  giftBackChance: number;
};

/* ---------- 钱包评价 ---------- */

export type WalletEvalSettings = {
  enabled: boolean;
  /** 触发概率 0~1 */
  chance: number;
  /** 延迟（秒） */
  delayMinSec: number;
  delayMaxSec: number;
  /** 冷却（秒） */
  cooldownSec: number;
};

/* ---------- 角色主动发红包 ---------- */

export type RoleRedPacketSettings = {
  enabled: boolean;
  /** 后台间隔（分钟） */
  intervalMin: number;
  intervalMax: number;
  /** 每次掷骰子概率 0~1 */
  chance: number;
  /** 金额范围 */
  amountMin: number;
  amountMax: number;
  /** 特殊金额概率 0~1 */
  specialChance: number;
  /** 特殊金额列表 */
  specialAmounts: number[];
  /** 谁发：随机 / 指定 */
  targetMode: "random" | "levi" | "erwin";
};

/* ---------- 角色自动记账 ---------- */

export type RoleBookkeepingSettings = {
  enabled: boolean;
  /** 后台间隔（分钟） */
  intervalMin: number;
  intervalMax: number;
  /** 每次掷骰子概率 0~1 */
  chance: number;
};

/* ---------- 角色改用户备注 ---------- */

export type RoleRemarkSettings = {
  enabled: boolean;
  /** 后台间隔（分钟） */
  intervalMin: number;
  intervalMax: number;
  /** 每次掷骰子概率 0~1 */
  chance: number;
  /** 用户改角色名字后，角色"回礼"改用户备注的概率 0~1 */
  retaliateChance: number;
};

/* ---------- 用户备注（角色给的） ---------- */

export type UserRemarks = {
  Levi: string | null;
  Erwin: string | null;
};

/* ---------- 购物物流 ---------- */

export type ShopDeliverySettings = {
  /** 速度倍率：1 = 正常，10 = 10 倍速 */
  speed: number;
};

/* ---------- 角色反向购买 ---------- */

export type RoleShoppingSettings = {
  enabled: boolean;
  intervalMin: number;
  intervalMax: number;
  chance: number;
  targetMode: "random" | "levi" | "erwin";
  aiChance: number;
  amountMin: number;
  amountMax: number;
};

/* ---------- AI 提示词 ---------- */

export type AiPromptsSettings = {
  productSystem: string;
  roleLevi: string;
  roleErwin: string;
};

export const DEFAULT_AI_PROMPTS: AiPromptsSettings = {
  productSystem: `你是一个虚构电商系统的店铺与商品生成器。
输出严格的 JSON，不要任何解释或 Markdown 代码块。
格式：
{
  "shop": {
    "name": "店铺名",
    "description": "一句话简介",
    "emoji": "单个 emoji",
    "category": "主分类",
    "tags": ["标签1", "标签2"]
  },
  "products": [
    {
      "name": "商品名",
      "description": "一句话描述",
      "emoji": "单个 emoji",
      "price": 数字,
      "category": "分类（中文 2-4 字）",
      "tags": ["标签1", "标签2"]
    }
  ]
}

要求：
- 所有内容虚构，不要出现真实品牌 / 真实公司 / 真实地址
- 商品价格在 {priceMin} ～ {priceMax} 之间
- 每个商品必须有一个 emoji
- 分类优先从：服饰,家居,食品,数码,文具,美妆,宠物,杂货,礼物；外卖时用：奶茶,咖啡,汉堡,日料,甜品,火锅,小吃`,
  roleLevi: "实用的、耐用的、克制的生活用品。不要花哨。",
  roleErwin: "能让人感觉被照顾的小礼物。温和、有品味。",
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
  visualStyle: RunwithmeVisualStyle;

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

  fontScale: number;
  chatFontScale: number;
  chatTextCardChance: number;
  chatWorldQuoteChance: number;

  patMessages: {
    levi: string[];
    erwin: string[];
  };

  characterNames: CharacterNames;

  chatReply: ChatReplySettings;

  avatarSwitch: AvatarSwitchSettings;

  walletEval: WalletEvalSettings;
  roleRedPacket: RoleRedPacketSettings;
  roleBookkeeping: RoleBookkeepingSettings;
  roleRemark: RoleRemarkSettings;
  userRemarks: UserRemarks;
  shopDelivery: ShopDeliverySettings;
  roleShopping: RoleShoppingSettings;
  aiPrompts: AiPromptsSettings;

  chatCustomCSS: string;
};

const SETTINGS_KEY = "runwithme_system_settings";

const defaultSettings: SystemSettings = {
  theme: "light",
  visualStyle: "macaron",

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
    letter: null,
    collection: null,
    study: null,
    watch: null,
    memory: null,
    random: null,
    search: null,
    read: null,
    fridge: null,
    ai: null,
    tarot: null,
    games: null,
    potato: null,
    shop: null,
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
  chatFontScale: 1.15,
  chatTextCardChance: 0.05,
  chatWorldQuoteChance: 0.3,
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
    singleAutoReplyMin: 5,
    singleAutoReplyMax: 30,
    quoteChance: 0.25,
  },
  avatarSwitch: {
    requestEnabled: true,
    requestChance: 0.7,
    requestDelayMin: 10,
    requestDelayMax: 60,

    backgroundEnabled: true,
    backgroundIntervalMin: 30,
    backgroundIntervalMax: 180,
    backgroundChance: 0.3,
    backgroundLevi: true,
    backgroundErwin: true,

    icityChanceLevi: 0.02,
    icityChanceErwin: 0.02,

    userAvatarEnabled: false,
    userAvatarChance: 0.15,

    giftBackChance: 0.2,
  },
  walletEval: {
    enabled: true,
    chance: 0.4,
    delayMinSec: 5,
    delayMaxSec: 30,
    cooldownSec: 30,
  },
  roleRedPacket: {
    enabled: true,
    intervalMin: 60,
    intervalMax: 240,
    chance: 0.25,
    amountMin: 5,
    amountMax: 50,
    specialChance: 0.15,
    specialAmounts: [5.2, 13.14, 52, 131.4, 520],
    targetMode: "random",
  },
  roleBookkeeping: {
    enabled: true,
    intervalMin: 60,
    intervalMax: 240,
    chance: 0.3,
  },
  roleRemark: {
    enabled: false,
    intervalMin: 60,
    intervalMax: 240,
    chance: 0.15,
    retaliateChance: 0.3,
  },
  userRemarks: {
    Levi: null,
    Erwin: null,
  },
  shopDelivery: {
    speed: 5,
  },
  roleShopping: {
    enabled: false,
    intervalMin: 120,
    intervalMax: 480,
    chance: 0.15,
    targetMode: "random",
    aiChance: 0.5,
    amountMin: 50,
    amountMax: 300,
  },
  aiPrompts: { ...DEFAULT_AI_PROMPTS },
  chatCustomCSS: "",
};

function clamp01(v: unknown, fallback: number): number {
  return typeof v === "number"
    ? Math.min(1, Math.max(0, v))
    : fallback;
}

function clampNum(
  v: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
}

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

      visualStyle:
        parsed.visualStyle === "mono"
          ? "mono"
          : "macaron",

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
      chatFontScale:
        typeof parsed.chatFontScale === "number"
          ? Math.min(
              1.3,
              Math.max(0.9, parsed.chatFontScale)
            )
          : 1.15,
      chatTextCardChance:
        typeof parsed.chatTextCardChance === "number"
          ? Math.min(
              0.5,
              Math.max(0, parsed.chatTextCardChance)
            )
          : 0.05,
      chatWorldQuoteChance:
        typeof parsed.chatWorldQuoteChance === "number"
          ? Math.min(
              1,
              Math.max(0, parsed.chatWorldQuoteChance)
            )
          : 0.3,
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
      avatarSwitch: (() => {
        const a = parsed.avatarSwitch ?? {};
        const d = defaultSettings.avatarSwitch;
        return {
          requestEnabled:
            typeof a.requestEnabled === "boolean"
              ? a.requestEnabled
              : d.requestEnabled,
          requestChance: clamp01(
            a.requestChance,
            d.requestChance
          ),
          requestDelayMin: clampNum(
            a.requestDelayMin,
            1,
            600,
            d.requestDelayMin
          ),
          requestDelayMax: clampNum(
            a.requestDelayMax,
            1,
            600,
            d.requestDelayMax
          ),

          backgroundEnabled:
            typeof a.backgroundEnabled === "boolean"
              ? a.backgroundEnabled
              : d.backgroundEnabled,
          backgroundIntervalMin: clampNum(
            a.backgroundIntervalMin,
            1,
            1440,
            d.backgroundIntervalMin
          ),
          backgroundIntervalMax: clampNum(
            a.backgroundIntervalMax,
            1,
            1440,
            d.backgroundIntervalMax
          ),
          backgroundChance: clamp01(
            a.backgroundChance,
            d.backgroundChance
          ),
          backgroundLevi:
            typeof a.backgroundLevi === "boolean"
              ? a.backgroundLevi
              : d.backgroundLevi,
          backgroundErwin:
            typeof a.backgroundErwin === "boolean"
              ? a.backgroundErwin
              : d.backgroundErwin,

          icityChanceLevi: clamp01(
            a.icityChanceLevi,
            d.icityChanceLevi
          ),
          icityChanceErwin: clamp01(
            a.icityChanceErwin,
            d.icityChanceErwin
          ),
          userAvatarEnabled:
            typeof a.userAvatarEnabled === "boolean"
              ? a.userAvatarEnabled
              : d.userAvatarEnabled,
          userAvatarChance: clamp01(
            a.userAvatarChance,
            d.userAvatarChance
          ),
          giftBackChance: clamp01(
            a.giftBackChance,
            d.giftBackChance
          ),
        };
      })(),
      walletEval: (() => {
        const w = parsed.walletEval ?? {};
        const d = defaultSettings.walletEval;
        return {
          enabled:
            typeof w.enabled === "boolean"
              ? w.enabled
              : d.enabled,
          chance: clamp01(w.chance, d.chance),
          delayMinSec: clampNum(
            w.delayMinSec,
            0,
            3600,
            d.delayMinSec
          ),
          delayMaxSec: clampNum(
            w.delayMaxSec,
            0,
            3600,
            d.delayMaxSec
          ),
          cooldownSec: clampNum(
            w.cooldownSec,
            0,
            3600,
            d.cooldownSec
          ),
        };
      })(),
      roleRedPacket: (() => {
        const r = parsed.roleRedPacket ?? {};
        const d = defaultSettings.roleRedPacket;
        return {
          enabled:
            typeof r.enabled === "boolean"
              ? r.enabled
              : d.enabled,
          intervalMin: clampNum(
            r.intervalMin,
            1,
            1440,
            d.intervalMin
          ),
          intervalMax: clampNum(
            r.intervalMax,
            1,
            1440,
            d.intervalMax
          ),
          chance: clamp01(r.chance, d.chance),
          amountMin: clampNum(
            r.amountMin,
            0.01,
            1000000,
            d.amountMin
          ),
          amountMax: clampNum(
            r.amountMax,
            0.01,
            1000000,
            d.amountMax
          ),
          specialChance: clamp01(
            r.specialChance,
            d.specialChance
          ),
          specialAmounts: Array.isArray(r.specialAmounts)
            ? r.specialAmounts.filter(
                (x: unknown): x is number =>
                  typeof x === "number" && x > 0
              )
            : [...d.specialAmounts],
          targetMode:
            r.targetMode === "levi" ||
            r.targetMode === "erwin" ||
            r.targetMode === "random"
              ? r.targetMode
              : d.targetMode,
        };
      })(),
      roleBookkeeping: (() => {
        const r = parsed.roleBookkeeping ?? {};
        const d = defaultSettings.roleBookkeeping;
        return {
          enabled:
            typeof r.enabled === "boolean"
              ? r.enabled
              : d.enabled,
          intervalMin: clampNum(
            r.intervalMin,
            1,
            1440,
            d.intervalMin
          ),
          intervalMax: clampNum(
            r.intervalMax,
            1,
            1440,
            d.intervalMax
          ),
          chance: clamp01(r.chance, d.chance),
        };
      })(),
      roleRemark: (() => {
        const r = parsed.roleRemark ?? {};
        const d = defaultSettings.roleRemark;
        return {
          enabled:
            typeof r.enabled === "boolean"
              ? r.enabled
              : d.enabled,
          intervalMin: clampNum(
            r.intervalMin,
            1,
            1440,
            d.intervalMin
          ),
          intervalMax: clampNum(
            r.intervalMax,
            1,
            1440,
            d.intervalMax
          ),
          chance: clamp01(r.chance, d.chance),
          retaliateChance: clamp01(
            r.retaliateChance,
            d.retaliateChance
          ),
        };
      })(),
      userRemarks: (() => {
        const r = parsed.userRemarks ?? {};
        return {
          Levi:
            typeof r.Levi === "string" && r.Levi.length > 0
              ? r.Levi
              : null,
          Erwin:
            typeof r.Erwin === "string" &&
            r.Erwin.length > 0
              ? r.Erwin
              : null,
        };
      })(),
      shopDelivery: (() => {
        const s = parsed.shopDelivery ?? {};
        const d = defaultSettings.shopDelivery;
        return {
          speed:
            typeof s.speed === "number" &&
            Number.isFinite(s.speed) &&
            s.speed > 0
              ? Math.min(100, Math.max(0.1, s.speed))
              : d.speed,
        };
      })(),
      roleShopping: (() => {
        const r = parsed.roleShopping ?? {};
        const d = defaultSettings.roleShopping;
        return {
          enabled:
            typeof r.enabled === "boolean"
              ? r.enabled
              : d.enabled,
          intervalMin: clampNum(
            r.intervalMin,
            1,
            1440,
            d.intervalMin
          ),
          intervalMax: clampNum(
            r.intervalMax,
            1,
            1440,
            d.intervalMax
          ),
          chance: clamp01(r.chance, d.chance),
          targetMode:
            r.targetMode === "levi" ||
            r.targetMode === "erwin" ||
            r.targetMode === "random"
              ? r.targetMode
              : d.targetMode,
          aiChance: clamp01(r.aiChance, d.aiChance),
          amountMin: clampNum(
            r.amountMin,
            1,
            100000,
            d.amountMin
          ),
          amountMax: clampNum(
            r.amountMax,
            1,
            100000,
            d.amountMax
          ),
        };
      })(),
      aiPrompts: (() => {
        const p = parsed.aiPrompts ?? {};
        const d = DEFAULT_AI_PROMPTS;
        return {
          productSystem:
            typeof p.productSystem === "string" &&
            p.productSystem.length > 0
              ? p.productSystem
              : d.productSystem,
          roleLevi:
            typeof p.roleLevi === "string"
              ? p.roleLevi
              : d.roleLevi,
          roleErwin:
            typeof p.roleErwin === "string"
              ? p.roleErwin
              : d.roleErwin,
        };
      })(),
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
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch (e) {
    console.error(
      "[systemStorage] 保存设置失败:",
      e
    );
  }
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
    avatarSwitch: {
      ...current.avatarSwitch,
      ...(updates.avatarSwitch ?? {}),
    },
    walletEval: {
      ...current.walletEval,
      ...(updates.walletEval ?? {}),
    },
    roleRedPacket: {
      ...current.roleRedPacket,
      ...(updates.roleRedPacket ?? {}),
    },
    roleBookkeeping: {
      ...current.roleBookkeeping,
      ...(updates.roleBookkeeping ?? {}),
    },
    roleRemark: {
      ...current.roleRemark,
      ...(updates.roleRemark ?? {}),
    },
    userRemarks: {
      ...current.userRemarks,
      ...(updates.userRemarks ?? {}),
    },
    shopDelivery: {
      ...current.shopDelivery,
      ...(updates.shopDelivery ?? {}),
    },
    roleShopping: {
      ...current.roleShopping,
      ...(updates.roleShopping ?? {}),
    },
    aiPrompts: {
      ...current.aiPrompts,
      ...(updates.aiPrompts ?? {}),
    },
  };

  saveSystemSettings(next);
  return next;
}

export function clearSystemSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SETTINGS_KEY);
}