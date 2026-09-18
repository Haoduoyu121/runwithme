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

import {
  loadSystemSettings,
  type SystemSettings,
  type AppId,
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
  /* ★ 分页 state：pages = HomePages，currentPage 是当前页下标 */
  const [pages, setPages] = useState<HomePages>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<HomeItem[]>(
    []
  );
  const [showAddWidget, setShowAddWidget] = useState(false);

  /* 当前页的 items（空页时返回空数组） */
  const items: HomeItem[] = pages[currentPage] ?? [];

  /* 首次挂载：从 localStorage 恢复 + 补全新增 App */
  useEffect(() => {
    const defaultItems = buildDefaultLayout(
      APP_IDS_FOR_LAYOUT
    );
    const saved = loadHomePages(defaultItems);
    const merged = mergeHomePages(saved, defaultItems);
    setPages(merged);
    setHydrated(true);
  }, []);

  /* 保存：hydrate 完成后才允许保存，避免覆盖 */
  useEffect(() => {
    if (!hydrated) return;
    const ok = saveHomePages(pages);
    if (!ok) {
      console.warn(
        "[Home] 布局保存失败，本次改动可能丢失"
      );
    }
  }, [pages, hydrated]);

  /* 修改当前页 */
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

  /* 长按任意 item 进入编辑模式 */
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

  /* 使用长按检测（在 HomeGrid 外部包一层） */
  const longPressTimerRef = {
    current: null as ReturnType<typeof setTimeout> | null,
  };

  /* 翻页手势 */
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

    /* 时间过长 或 垂直位移更大 → 不是翻页手势 */
    if (dt > 800) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < 60) return;

    if (dx < 0) {
      /* 向左滑 → 下一页 */
      setCurrentPage((p) =>
        p < pages.length - 1 ? p + 1 : p
      );
    } else {
      /* 向右滑 → 上一页 */
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

  /* 添加新页面 */
  function handleAddPage() {
    setPages((prev) => [...prev, []]);
    setCurrentPage((prev) => prev + 1);
  }

    /* 跨页拖动 */
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

  /* 删除当前页 */
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
    /* 夹紧 currentPage 到新范围 */
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

      {/* 编辑模式：悬浮工具栏（取消 / 完成） */}
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

      {/* 编辑模式：左右翻页箭头 */}
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

      {/* 网格 */}
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

      {/* 页点指示器（非编辑模式） */}
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

      {/* 编辑模式底部按钮 */}
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
            {app === "letter" && <LetterApp onBack={onBack} />}
      {app === "collection" && (
        <CollectionApp onBack={onBack} />
      )}
      {app === "study" && <StudyApp onBack={onBack} />}
      {app === "watch" && <WatchApp onBack={onBack} />}
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

    /* 已经打开过的 App 列表；一旦加入永不移除 */
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

    /* 注册 App 启动器，供全局通知点击时调用 */
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

     /* 一旦打开过某个 App，就把它加进常驻列表 */
  useEffect(() => {
    if (!currentApp) return;
    setMountedApps((prev) =>
      prev.includes(currentApp)
        ? prev
        : [...prev, currentApp]
    );
  }, [currentApp]);

  /* 加载自定义壁纸（锁屏 + 主屏） */
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

  /* 把当前壁纸同步到 html 的 --rw-bg，覆盖 iOS PWA 底部安全区 */
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

  /* 加载自定义 App 图标 */
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
            {/* Home 只在没有打开 App 时挂载 */}
            {currentApp === null && (
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

            {/* 打开过的 App 都常驻，切换只切显隐 */}
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
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}