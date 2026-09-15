"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ChatApp from "@/components/apps/ChatApp";
import MusicApp from "@/components/apps/MusicApp";
import CardStudioApp from "@/components/apps/CardStudioApp";
import PhotosApp from "@/components/apps/PhotosApp";
import ICityApp from "@/components/apps/ICityApp";
import CalendarApp from "@/components/apps/CalendarApp";
import NotesApp from "@/components/apps/NotesApp";
import QuestionnaireApp from "@/components/apps/QuestionnaireApp";
import CheckInApp from "@/components/apps/CheckInApp";

import {
  loadSystemSettings,
  type SystemSettings,
  type AppId,
} from "@/lib/systemStorage";

import { wallpapers } from "@/data/wallpapers";

import {
  buildDefaultLayout,
  type HomeItem,
} from "@/data/home";

import {
  loadHomeLayout,
  saveHomeLayout,
} from "@/lib/homeStorage";

import { getWallpaperFile } from "@/lib/wallpaperFiles";
import { getAppIconFile } from "@/lib/appIconFiles";

import HomeGrid from "@/components/home/HomeGrid";
import AddWidgetModal from "@/components/home/AddWidgetModal";

const CUSTOM_LOCK_WALLPAPER = "uploaded-lock-wallpaper";
const CUSTOM_HOME_WALLPAPER = "uploaded-home-wallpaper";

/* 主屏 App 顺序 */
const apps = [
  {
    id: "chat" as AppId,
    name: "Chat",
    icon: "♡",
    color: "pink",
  },
  {
    id: "music" as AppId,
    name: "Music",
    icon: "♪",
    color: "cream",
  },
  {
    id: "photos" as AppId,
    name: "Photos",
    icon: "▧",
    color: "blue",
  },
  {
    id: "icity" as AppId,
    name: "iCity",
    icon: "✦",
    color: "brown",
  },
  {
    id: "notes" as AppId,
    name: "Notes",
    icon: "✎",
    color: "cream",
  },
  {
    id: "questionnaire" as AppId,
    name: "Q&A",
    icon: "?",
    color: "blue",
  },
  {
    id: "checkin" as AppId,
    name: "Check-in",
    icon: "☑",
    color: "pink",
  },
];

const APP_IDS_FOR_LAYOUT: AppId[] = apps.map((a) => a.id);

/* =========================================================
   Lock Screen
   ========================================================= */

function LockScreen({
  onUnlock,
  wallpaper,
}: {
  onUnlock: () => void;
  wallpaper: string;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const time = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main
      className="app-screen lock-screen"
      style={{ background: wallpaper }}
    >
      <div className="lock-content">
        <div className="lock-time">{time}</div>
        <div className="lock-date">{date}</div>
        <div className="lock-symbol">♡</div>
        <div className="lock-title">RunWithme</div>
        <div className="lock-subtitle">
          a little world beyond the walls
        </div>
      </div>

      <button className="unlock-button" onClick={onUnlock}>
        <span>Swipe to enter</span>
        <span className="unlock-arrow">↑</span>
      </button>
    </main>
  );
}

/* =========================================================
   Home Screen
   ========================================================= */

function HomeScreen({
  wallpaper,
  iconUrls,
  onOpenApp,
  onOpenSettings,
  onOpenHomeStudio,
  onOpenCalendar,
  onOpenCards,
}: {
  wallpaper: string;
  iconUrls: Partial<Record<AppId, string>>;
  onOpenApp: (app: AppId) => void;
  onOpenSettings: () => void;
  onOpenHomeStudio: () => void;
  onOpenCalendar: () => void;
  onOpenCards: () => void;
}) {
  /* ★ 初始为空数组，等 hydrate 后再填 */
const [items, setItems] = useState<HomeItem[]>([]);
const [hydrated, setHydrated] = useState(false);

const [editing, setEditing] = useState(false);
const [showAddWidget, setShowAddWidget] = useState(false);

/* 首次挂载：从 localStorage 恢复 */
useEffect(() => {
  const defaultItems = buildDefaultLayout(
    APP_IDS_FOR_LAYOUT
  );
  const saved = loadHomeLayout(defaultItems);
  setItems(saved);
  setHydrated(true);
}, []);

/* 保存：hydrate 完成后才允许保存，避免覆盖 */
useEffect(() => {
  if (!hydrated) return;
  saveHomeLayout(items);
}, [items, hydrated]);

  /* 长按任意 item 进入编辑模式 */
  function handleItemLongPress() {
    if (!editing) setEditing(true);
  }

  /* 使用长按检测（在 HomeGrid 外部包一层） */
  const longPressTimerRef = {
    current: null as ReturnType<typeof setTimeout> | null,
  };

  function handlePointerDownCapture() {
    if (editing) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      handleItemLongPress();
    }, 550);
  }

  function handlePointerUpCapture() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleAddWidget(item: HomeItem) {
    setItems((prev) => [...prev, item]);
  }

  function handleDeleteWidget(itemId: string) {
    if (!window.confirm("移除这个小组件？")) return;
    setItems((prev) =>
      prev.filter((it) => it.id !== itemId)
    );
  }

  return (
    <main
      className="app-screen home-screen home-screen-v2"
      style={{ background: wallpaper }}
      onPointerDown={handlePointerDownCapture}
      onPointerUp={handlePointerUpCapture}
      onPointerCancel={handlePointerUpCapture}
      onPointerLeave={handlePointerUpCapture}
    >
      {/* 顶部小状态栏 */}
      <div className="home-v2-top">
        {editing ? (
          <button
            className="home-v2-done-btn"
            onClick={() => setEditing(false)}
          >
            完成
          </button>
        ) : (
          <span className="home-v2-brand">
            RUNWITHME
          </span>
        )}

        <span className="home-v2-clock">
          {new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>

      {/* 网格 */}
      <div className="home-v2-grid-wrap">
        <HomeGrid
          items={items}
          apps={apps}
          iconUrls={iconUrls}
          editing={editing}
          onOpenApp={(id) => {
            if (editing) return;
            onOpenApp(id);
          }}
          onChangeItems={setItems}
          onDeleteWidget={handleDeleteWidget}
        />
      </div>

      {/* 编辑模式底部按钮 */}
      {editing && (
        <div className="home-v2-edit-bar">
          <button
            className="home-v2-add-widget-btn"
            onClick={() => setShowAddWidget(true)}
          >
            ＋ 添加小组件
          </button>
        </div>
      )}

      {/* dock */}
      <div className="dock">
        <button
          className="dock-icon"
          onClick={onOpenCalendar}
          aria-label="Calendar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
          </svg>
        </button>

        <button
          className="dock-icon"
          onClick={onOpenCards}
          aria-label="Open Card Studio"
        >
          ✎
        </button>

        <button
          className="dock-icon"
          onClick={onOpenHomeStudio}
          aria-label="Open Home Studio"
        >
          ✦
        </button>

        <button
          className="dock-icon"
          onClick={onOpenSettings}
          aria-label="Open Settings"
        >
          ⚙
        </button>
      </div>

      {/* 添加小组件弹窗 */}
      {showAddWidget && (
        <AddWidgetModal
          onAdd={handleAddWidget}
          onClose={() => setShowAddWidget(false)}
        />
      )}
    </main>
  );
}

/* =========================================================
   App Window
   ========================================================= */

function AppWindow({
  app,
  onBack,
}: {
  app: AppId;
  onBack: () => void;
}) {
  return (
    <div className="app-screen">
      {app === "chat" && <ChatApp onBack={onBack} />}
      {app === "music" && <MusicApp onBack={onBack} />}
      {app === "cards" && <CardStudioApp onBack={onBack} />}
      {app === "photos" && <PhotosApp onBack={onBack} />}
      {app === "icity" && <ICityApp onBack={onBack} />}
      {app === "calendar" && <CalendarApp onBack={onBack} />}
      {app === "notes" && <NotesApp onBack={onBack} />}
      {app === "questionnaire" && (
        <QuestionnaireApp onBack={onBack} />
      )}
      {app === "checkin" && <CheckInApp onBack={onBack} />}
    </div>
  );
}

/* =========================================================
   Home（默认导出）
   ========================================================= */

export default function Home() {
  const router = useRouter();

  const [unlocked, setUnlocked] = useState<boolean | null>(
    null
  );

  const [currentApp, setCurrentApp] =
    useState<AppId | null>(null);

  const [systemSettings, setSystemSettings] =
    useState<SystemSettings | null>(null);

  const [customLockWallpaper, setCustomLockWallpaper] =
    useState<string | null>(null);

  const [customHomeWallpaper, setCustomHomeWallpaper] =
    useState<string | null>(null);

  const [appIconUrls, setAppIconUrls] = useState<
    Partial<Record<AppId, string>>
  >({});

  useEffect(() => {
    const loaded = loadSystemSettings();

    setSystemSettings(loaded);

    document.documentElement.setAttribute(
      "data-runwithme-theme",
      loaded.theme
    );

    const hasUnlocked =
      sessionStorage.getItem("runwithme_unlocked") ===
      "true";

    setUnlocked(hasUnlocked);
  }, []);

  useEffect(() => {
    if (!systemSettings) return;

    let lockUrl: string | null = null;
    let homeUrl: string | null = null;

    let cancelled = false;

    async function loadCustomWallpapers() {
      if (
        systemSettings?.lockScreenWallpaper ===
        CUSTOM_LOCK_WALLPAPER
      ) {
        const file = await getWallpaperFile(
          CUSTOM_LOCK_WALLPAPER
        );

        if (file && !cancelled) {
          lockUrl = URL.createObjectURL(file);
          setCustomLockWallpaper(lockUrl);
        }
      } else {
        setCustomLockWallpaper(null);
      }

      if (
        systemSettings?.homeWallpaper ===
        CUSTOM_HOME_WALLPAPER
      ) {
        const file = await getWallpaperFile(
          CUSTOM_HOME_WALLPAPER
        );

        if (file && !cancelled) {
          homeUrl = URL.createObjectURL(file);
          setCustomHomeWallpaper(homeUrl);
        }
      } else {
        setCustomHomeWallpaper(null);
      }
    }

    void loadCustomWallpapers();

    return () => {
      cancelled = true;
      if (lockUrl) URL.revokeObjectURL(lockUrl);
      if (homeUrl) URL.revokeObjectURL(homeUrl);
    };
  }, [
    systemSettings?.lockScreenWallpaper,
    systemSettings?.homeWallpaper,
  ]);

  useEffect(() => {
    if (!systemSettings) return;

    let cancelled = false;
    const created: string[] = [];

    async function loadAppIcons() {
      const next: Partial<Record<AppId, string>> = {};

      for (const app of apps) {
        if (
          systemSettings?.appIcons?.[app.id] !== "custom"
        ) {
          continue;
        }

        const file = await getAppIconFile(
          `app-icon-${app.id}`
        );

        if (!file) continue;

        const url = URL.createObjectURL(file);

        if (cancelled) {
          URL.revokeObjectURL(url);
          continue;
        }

        created.push(url);
        next[app.id] = url;
      }

      if (!cancelled) setAppIconUrls(next);
    }

    void loadAppIcons();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [systemSettings]);

  if (
    systemSettings === null ||
    unlocked === null
  ) {
    return (
      <div className="site">
        <div className="runwithme-app" />
      </div>
    );
  }

  const getDefaultWallpaper = (id: string) => {
    const wallpaper = wallpapers.find(
      (item) => item.id === id
    );

    return wallpaper ?? wallpapers[0];
  };

  const lockDefault = getDefaultWallpaper(
    systemSettings.lockScreenWallpaper
  );

  const homeDefault = getDefaultWallpaper(
    systemSettings.homeWallpaper
  );

  const lockWallpaper = customLockWallpaper
    ? `url("${customLockWallpaper}")`
    : lockDefault.background;

  const homeWallpaper = customHomeWallpaper
    ? `url("${customHomeWallpaper}")`
    : homeDefault.background;

  const handleUnlock = () => {
    sessionStorage.setItem(
      "runwithme_unlocked",
      "true"
    );
    setUnlocked(true);
  };

  const handleBackHome = () => setCurrentApp(null);

  return (
    <div className="site">
      <div className="runwithme-app">
        {!unlocked ? (
          <LockScreen
            wallpaper={lockWallpaper}
            onUnlock={handleUnlock}
          />
        ) : currentApp ? (
          <AppWindow
            app={currentApp}
            onBack={handleBackHome}
          />
        ) : (
          <HomeScreen
            wallpaper={homeWallpaper}
            iconUrls={appIconUrls}
            onOpenApp={setCurrentApp}
            onOpenSettings={() => {
              router.push("/studio/settings");
            }}
            onOpenHomeStudio={() => {
              router.push("/home-studio");
            }}
            onOpenCalendar={() => {
              setCurrentApp("calendar" as AppId);
            }}
            onOpenCards={() => {
              setCurrentApp("cards" as AppId);
            }}
          />
        )}
      </div>
    </div>
  );
}