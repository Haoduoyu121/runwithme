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
import LetterApp from "@/components/apps/LetterApp";
import WatchApp from "@/components/apps/WatchApp";
import MemoryApp from "@/components/apps/MemoryApp";
import RandomApp from "@/components/apps/RandomApp";
import SearchApp from "@/components/apps/SearchApp";
import ReadApp from "@/components/apps/ReadApp";
import { runWorldCompensation } from "@/lib/worldClock";

import {
  loadSystemSettings,
  type SystemSettings,
  type AppId,
  type DockSlotId,
} from "@/lib/systemStorage";

import { wallpapers } from "@/data/wallpapers";

import {
  buildDefaultLayout,
  mergeHomePages,
  type HomeItem,
  type HomePages,
} from "@/data/home";

import {
  loadHomePages,
  saveHomePages,
} from "@/lib/homeStorage";

import { getWallpaperFile } from "@/lib/wallpaperFiles";
import { getAppIconFile } from "@/lib/appIconFiles";
import { useNotifications } from "@/lib/NotificationContext";

import HomeGrid from "@/components/home/HomeGrid";
import AddWidgetModal from "@/components/home/AddWidgetModal";
import WorldCard from "@/components/home/WorldCard";
import CollectionApp from "@/components/apps/CollectionApp";
import StudyApp from "@/components/apps/StudyApp";

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
  {
    id: "letter" as AppId,
    name: "Letter",
    icon: "✉",
    color: "cream",
  },
  {
    id: "collection" as AppId,
    name: "Collection",
    icon: "★",
    color: "pink",
  },
  {
    id: "study" as AppId,
    name: "Study",
    icon: "✎",
    color: "blue",
  },
  {
    id: "watch" as AppId,
    name: "Watch",
    icon: "▷",
    color: "blue",
  },
  {
    id: "memory" as AppId,
    name: "Memory",
    icon: "❋",
    color: "brown",
  },
  {
    id: "random" as AppId,
    name: "Random",
    icon: "⁂",
    color: "blue",
  },
  {
    id: "search" as AppId,
    name: "Search",
    icon: "⌕",
    color: "cream",
  },
  {
    id: "read" as AppId,
    name: "Read",
    icon: "▤",
    color: "brown",
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
  dockIconUrls,
  onOpenApp,
  onOpenSettings,
  onOpenHomeStudio,
  onOpenCalendar,
  onOpenCards,
}: {
  wallpaper: string;
  iconUrls: Partial<Record<AppId, string>>;
  dockIconUrls: Partial<Record<DockSlotId, string>>;
  onOpenApp: (app: AppId) => void;
  onOpenSettings: () => void;
  onOpenHomeStudio: () => void;
  onOpenCalendar: () => void;
  onOpenCards: () => void;
}) {
  const [pages, setPages] = useState<HomePages>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<HomeItem[]>(
    []
  );
  const [showAddWidget, setShowAddWidget] = useState(false);

  const items: HomeItem[] = pages[currentPage] ?? [];

  useEffect(() => {
    const defaultItems = buildDefaultLayout(
      APP_IDS_FOR_LAYOUT
    );
    const saved = loadHomePages(defaultItems);
    const merged = mergeHomePages(saved, defaultItems);
    setPages(merged);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const ok = saveHomePages(pages);
    if (!ok) {
      console.warn(
        "[Home] 布局保存失败，本次改动可能丢失"
      );
    }
  }, [pages, hydrated]);

  function updateCurrentPage(
    updater: (prev: HomeItem[]) => HomeItem[]
  ) {
    setPages((prev) => {
      const next = [...prev];
      next[currentPage] = updater(
        next[currentPage] ?? []
      );
      return next;
    });
  }

  function handleItemLongPress() {
    if (!editing) {
      setEditSnapshot(items);
      setEditing(true);
    }
  }

  function handleDoneEditing() {
    setEditing(false);
  }

  function handleCancelEditing() {
    setPages((prev) => {
      const next = [...prev];
      next[currentPage] = editSnapshot;
      return next;
    });
    setEditing(false);
  }

  const longPressTimerRef = {
    current: null as ReturnType<typeof setTimeout> | null,
  };

  const swipeRef = {
    current: null as {
      x: number;
      y: number;
      t: number;
      id: number;
    } | null,
  };

  function handlePointerDownCapture(
    e: React.PointerEvent
  ) {
    if (editing) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      handleItemLongPress();
    }, 550);

    swipeRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      id: e.pointerId,
    };
  }

  function handlePointerUpCapture(
    e: React.PointerEvent
  ) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const start = swipeRef.current;
    swipeRef.current = null;

    if (!start) return;
    if (start.id !== e.pointerId) return;
    if (editing) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;

    if (dt > 800) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < 60) return;

    if (dx < 0) {
      setCurrentPage((p) =>
        p < pages.length - 1 ? p + 1 : p
      );
    } else {
      setCurrentPage((p) => (p > 0 ? p - 1 : p));
    }
  }

  function handlePointerCancelCapture() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    swipeRef.current = null;
  }

  function handleAddPage() {
    setPages((prev) => [...prev, []]);
    setCurrentPage((prev) => prev + 1);
  }

  function handleCrossPageDrop(
    itemId: string,
    fromPage: number,
    toPage: number,
    toIdx: number | null
  ) {
    if (fromPage === toPage) return;

    setPages((prev) => {
      const next = prev.map((p) => [...p]);
      const fromList = next[fromPage];
      const toList = next[toPage];
      if (!fromList || !toList) return prev;

      const fi = fromList.findIndex(
        (it) => it.id === itemId
      );
      if (fi === -1) return prev;

      const [moved] = fromList.splice(fi, 1);

      if (
        toIdx === null ||
        toIdx < 0 ||
        toIdx > toList.length
      ) {
        toList.push(moved);
      } else {
        toList.splice(toIdx, 0, moved);
      }

      return next;
    });
  }

  function handleDeletePage() {
    if (pages.length <= 1) {
      window.alert("至少保留一页");
      return;
    }

    const current = pages[currentPage] ?? [];
    if (current.length > 0) {
      const ok = window.confirm(
        `这一页还有 ${current.length} 个图标。\n删除后这些图标会一起消失。\n\n继续？`
      );
      if (!ok) return;
    }

    setPages((prev) =>
      prev.filter((_, i) => i !== currentPage)
    );
    setCurrentPage((p) => Math.min(p, pages.length - 2));
  }

  function handleAddWidget(item: HomeItem) {
    updateCurrentPage((prev) => [...prev, item]);
  }

  function handleDeleteWidget(itemId: string) {
    if (!window.confirm("移除这个小组件？")) return;
    updateCurrentPage((prev) =>
      prev.filter((it) => it.id !== itemId)
    );
  }

  return (
    <main
      className="app-screen home-screen home-screen-v2"
      style={{ background: wallpaper }}
      onPointerDown={handlePointerDownCapture}
      onPointerUp={handlePointerUpCapture}
      onPointerCancel={handlePointerCancelCapture}
      onPointerLeave={handlePointerCancelCapture}
    >      <WorldCard />
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

      {editing && (
        <div className="home-edit-toolbar">
          <button
            className="home-edit-cancel"
            onClick={handleCancelEditing}
          >
            取消
          </button>
          <button
            className="home-edit-done"
            onClick={handleDoneEditing}
          >
            完成
          </button>
        </div>
      )}

      {editing && pages.length > 1 && (
        <>
          {currentPage > 0 && (
            <button
              className="home-pager-arrow is-left"
              onClick={() =>
                setCurrentPage((p) => Math.max(0, p - 1))
              }
              aria-label="上一页"
            >
              ‹
            </button>
          )}
          {currentPage < pages.length - 1 && (
            <button
              className="home-pager-arrow is-right"
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(pages.length - 1, p + 1)
                )
              }
              aria-label="下一页"
            >
              ›
            </button>
          )}
        </>
      )}

      <div className="home-v2-grid-wrap">
        <HomeGrid
          items={items}
          apps={apps}
          iconUrls={iconUrls}
          editing={editing}
          currentPage={currentPage}
          pageCount={pages.length}
          onOpenApp={(id) => {
            if (editing) return;
            onOpenApp(id);
          }}
          onChangeItems={(next) =>
            updateCurrentPage(() => next)
          }
          onCrossPageDrop={handleCrossPageDrop}
          onRequestPageChange={(dir) =>
            setCurrentPage((p) => {
              if (dir === "left") return Math.max(0, p - 1);
              return Math.min(pages.length - 1, p + 1);
            })
          }
          onDeleteWidget={handleDeleteWidget}
        />

        {items.length === 0 && (
          <div className="home-empty-page">
            <div className="home-empty-page-icon">✦</div>
            <div className="home-empty-page-title">
              这一页还是空的
            </div>
            <div className="home-empty-page-desc">
              长按进入编辑，从别的页面拖 App
              过来，或添加小组件
            </div>
          </div>
        )}
      </div>

      {!editing && pages.length > 1 && (
        <div className="home-pager-dots">
          {pages.map((_, i) => (
            <button
              key={i}
              className={
                "home-pager-dot" +
                (i === currentPage ? " active" : "")
              }
              onClick={() => setCurrentPage(i)}
              aria-label={`第 ${i + 1} 页`}
            />
          ))}
        </div>
      )}

      {editing && (
        <div className="home-v2-edit-bar">
          <button
            className="home-v2-add-widget-btn"
            onClick={() => setShowAddWidget(true)}
          >
            ＋ 小组件
          </button>
          <button
            className="home-v2-add-widget-btn"
            onClick={handleAddPage}
          >
            ＋ 新页
          </button>
          <button
            className="home-v2-add-widget-btn is-danger"
            onClick={handleDeletePage}
            disabled={pages.length <= 1}
          >
            − 删页
          </button>
        </div>
      )}

      <div className="dock">
        {(
          [
            {
              slot: "slot-1" as const,
              onClick: onOpenCalendar,
              label: "Calendar",
              fallback: (
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
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="3"
                  />
                  <path d="M3 10h18" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                </svg>
              ),
            },
            {
              slot: "slot-2" as const,
              onClick: onOpenCards,
              label: "Card Studio",
              fallback: "✎",
            },
            {
              slot: "slot-3" as const,
              onClick: onOpenHomeStudio,
              label: "Home Studio",
              fallback: "✦",
            },
            {
              slot: "slot-4" as const,
              onClick: onOpenSettings,
              label: "Settings",
              fallback: "⚙",
            },
          ] as const
        ).map((cfg) => {
          const customUrl = dockIconUrls[cfg.slot];
          return (
            <button
              key={cfg.slot}
              className={
                customUrl
                  ? "dock-icon dock-icon-custom"
                  : "dock-icon"
              }
              onClick={cfg.onClick}
              aria-label={cfg.label}
            >
              {customUrl ? (
                <img src={customUrl} alt={cfg.label} />
              ) : (
                cfg.fallback
              )}
            </button>
          );
        })}
      </div>

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
  isActive,
}: {
  app: AppId;
  onBack: () => void;
  isActive: boolean;
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
      {app === "letter" && <LetterApp onBack={onBack} />}
      {app === "collection" && (
        <CollectionApp onBack={onBack} />
      )}
      {app === "study" && <StudyApp onBack={onBack} />}
      {app === "watch" && <WatchApp onBack={onBack} />}
      {app === "memory" && <MemoryApp onBack={onBack} />}
      {app === "random" && <RandomApp onBack={onBack} />}
      {app === "search" && <SearchApp onBack={onBack} />}
      {app === "read" && (
        <ReadApp
          key={isActive ? "active" : "inactive"}
          onBack={onBack}
        />
      )}
    </div>
  );
}

/* =========================================================
   Home（默认导出）
   ========================================================= */

export default function Home() {
  const router = useRouter();
  const { registerLauncher } = useNotifications();

  const [unlocked, setUnlocked] = useState<boolean | null>(
    null
  );

  const [currentApp, setCurrentApp] =
    useState<AppId | null>(null);

  const [mountedApps, setMountedApps] = useState<AppId[]>(
    []
  );

  const [systemSettings, setSystemSettings] =
    useState<SystemSettings | null>(null);

  const [customLockWallpaper, setCustomLockWallpaper] =
    useState<string | null>(null);

  const [customHomeWallpaper, setCustomHomeWallpaper] =
    useState<string | null>(null);

  const [appIconUrls, setAppIconUrls] = useState<
    Partial<Record<AppId, string>>
  >({});

    const [dockIconUrls, setDockIconUrls] = useState<
    Partial<Record<DockSlotId, string>>
  >({});

    /* ★ 加载底部栏自定义图标 */
  useEffect(() => {
    if (!systemSettings) return;

    let cancelled = false;
    const created: string[] = [];

    async function loadDockIcons() {
      const next: Partial<Record<DockSlotId, string>> = {};
      const slots: DockSlotId[] = [
        "slot-1",
        "slot-2",
        "slot-3",
        "slot-4",
      ];

      for (const slot of slots) {
        if (systemSettings?.dockIcons?.[slot] !== "custom") {
          continue;
        }

        const file = await getAppIconFile(`dock-icon-${slot}`);
        if (!file) continue;

        const url = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(url);
          continue;
        }
        created.push(url);
        next[slot] = url;
      }

      if (!cancelled) setDockIconUrls(next);
    }

    void loadDockIcons();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [systemSettings]);

    /* ★ Step 9a：世界在转 —— 启动 + 从后台切回前台时触发补偿 */
  useEffect(() => {
    const result = runWorldCompensation();
    if (result.triggered && result.generated > 0) {
      console.log(
        `[世界在转] 你不在的 ${Math.floor(
          result.offlineMs / 60000
        )} 分钟里，发生了 ${result.generated} 件事`
      );
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        runWorldCompensation();
      }
    }
    document.addEventListener(
      "visibilitychange",
      onVisibility
    );
    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
    };
  }, []);

  useEffect(() => {
    registerLauncher((appId) => {
      if (!unlocked) {
        sessionStorage.setItem(
          "runwithme_unlocked",
          "true"
        );
        setUnlocked(true);
      }
      setCurrentApp(appId);
    });
  }, [registerLauncher, unlocked]);

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
    if (!currentApp) return;
    setMountedApps((prev) =>
      prev.includes(currentApp)
        ? prev
        : [...prev, currentApp]
    );
  }, [currentApp]);

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

    const getWp = (id: string) => {
      const w = wallpapers.find((x) => x.id === id);
      return w ?? wallpapers[0];
    };

    const lockDefault = getWp(
      systemSettings.lockScreenWallpaper
    );
    const homeDefault = getWp(
      systemSettings.homeWallpaper
    );

    const lockWp = customLockWallpaper
      ? `url("${customLockWallpaper}")`
      : lockDefault.background;

    const homeWp = customHomeWallpaper
      ? `url("${customHomeWallpaper}")`
      : homeDefault.background;

    const current = !unlocked ? lockWp : homeWp;

    document.documentElement.style.setProperty(
      "--rw-bg",
      current
    );
  }, [
    unlocked,
    systemSettings,
    customLockWallpaper,
    customHomeWallpaper,
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
        ) : (
          <>
            {currentApp === null && (
              <HomeScreen
                wallpaper={homeWallpaper}
                iconUrls={appIconUrls}
                dockIconUrls={dockIconUrls}
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

            {mountedApps.map((appId) => (
              <div
                key={appId}
                className="app-window-slot"
                style={{
                  display:
                    currentApp === appId
                      ? undefined
                      : "none",
                }}
                aria-hidden={currentApp !== appId}
              >
                <AppWindow
                  app={appId}
                  onBack={handleBackHome}
                  isActive={currentApp === appId}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}