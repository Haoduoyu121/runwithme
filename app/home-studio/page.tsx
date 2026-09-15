"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSystem } from "@/lib/SystemContext";

import {
  wallpapers,
  type WallpaperId,
} from "@/data/wallpapers";

import {
  saveWallpaperFile,
  getWallpaperFile,
  deleteWallpaperFile,
} from "@/lib/wallpaperFiles";

import {
  saveAppIconFile,
  getAppIconFile,
  deleteAppIconFile,
} from "@/lib/appIconFiles";

import type {
  AppId,
  DockSlotId,
} from "@/lib/systemStorage";

const CUSTOM_LOCK_KEY = "uploaded-lock-wallpaper";
const CUSTOM_HOME_KEY = "uploaded-home-wallpaper";

const appIconFileKey = (id: AppId) => `app-icon-${id}`;
const dockIconFileKey = (id: DockSlotId) =>
  `dock-icon-${id}`;

type AppEntry = {
  id: AppId;
  name: string;
  icon: string;
};

const APP_ENTRIES: AppEntry[] = [
  { id: "chat", name: "Chat", icon: "♡" },
  { id: "music", name: "Music", icon: "♪" },
  { id: "photos", name: "Photos", icon: "▧" },
  { id: "icity", name: "iCity", icon: "✦" },
  { id: "cards", name: "Cards", icon: "✎" },
  { id: "notes", name: "Notes", icon: "✎" },
  { id: "calendar", name: "Calendar", icon: "◫" },
];

type DockEntry = {
  id: DockSlotId;
  label: string;
  fallback: string;
  description: string;
};

const DOCK_SLOTS: DockEntry[] = [
  {
    id: "slot-1",
    label: "Slot 1",
    fallback: "♡",
    description: "装饰按钮",
  },
  {
    id: "slot-2",
    label: "Slot 2",
    fallback: "✎",
    description: "打开 Card Studio",
  },
  {
    id: "slot-3",
    label: "Slot 3",
    fallback: "✦",
    description: "打开 Home Studio",
  },
  {
    id: "slot-4",
    label: "Slot 4",
    fallback: "⚙",
    description: "打开 Settings",
  },
];

export default function HomeStudioPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSystem();

  const [lockPreview, setLockPreview] = useState<string | null>(
    null
  );
  const [homePreview, setHomePreview] = useState<string | null>(
    null
  );
  const [iconPreviews, setIconPreviews] = useState<
    Partial<Record<AppId, string>>
  >({});
  const [dockIconPreviews, setDockIconPreviews] = useState<
    Partial<Record<DockSlotId, string>>
  >({});

  /* 加载预览 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const nextLock = await loadWallpaperPreview(
        CUSTOM_LOCK_KEY,
        settings.lockScreenWallpaper === CUSTOM_LOCK_KEY
      );

      const nextHome = await loadWallpaperPreview(
        CUSTOM_HOME_KEY,
        settings.homeWallpaper === CUSTOM_HOME_KEY
      );

      const nextIcons: Partial<Record<AppId, string>> = {};

      for (const entry of APP_ENTRIES) {
        if (settings.appIcons[entry.id] !== "custom") continue;

        const file = await getAppIconFile(
          appIconFileKey(entry.id)
        );

        if (file) {
          const url = URL.createObjectURL(file);
          created.push(url);
          nextIcons[entry.id] = url;
        }
      }

      const nextDockIcons: Partial<
        Record<DockSlotId, string>
      > = {};

      for (const slot of DOCK_SLOTS) {
        if (settings.dockIcons[slot.id] !== "custom") {
          continue;
        }

        const file = await getAppIconFile(
          dockIconFileKey(slot.id)
        );

        if (file) {
          const url = URL.createObjectURL(file);
          created.push(url);
          nextDockIcons[slot.id] = url;
        }
      }

      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      if (nextLock) {
        created.push(nextLock);
        setLockPreview(nextLock);
      }
      if (nextHome) {
        created.push(nextHome);
        setHomePreview(nextHome);
      }

      setIconPreviews(nextIcons);
      setDockIconPreviews(nextDockIcons);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [
    settings.lockScreenWallpaper,
    settings.homeWallpaper,
    settings.appIcons,
    settings.dockIcons,
  ]);

  /* 壁纸 */
  async function selectWallpaper(
    target: "lock" | "home",
    id: WallpaperId
  ) {
    if (target === "lock") {
      updateSettings({ lockScreenWallpaper: id });
    } else {
      updateSettings({ homeWallpaper: id });
    }
  }

  async function uploadWallpaper(
    target: "lock" | "home",
    file: File
  ) {
    const key =
      target === "lock" ? CUSTOM_LOCK_KEY : CUSTOM_HOME_KEY;

    await saveWallpaperFile(key, file);

    const url = URL.createObjectURL(file);

    if (target === "lock") {
      setLockPreview(url);
      updateSettings({ lockScreenWallpaper: key });
    } else {
      setHomePreview(url);
      updateSettings({ homeWallpaper: key });
    }
  }

  async function removeCustomWallpaper(target: "lock" | "home") {
    const key =
      target === "lock" ? CUSTOM_LOCK_KEY : CUSTOM_HOME_KEY;

    await deleteWallpaperFile(key);

    if (target === "lock") {
      if (lockPreview) URL.revokeObjectURL(lockPreview);
      setLockPreview(null);
      updateSettings({ lockScreenWallpaper: "default-rose" });
    } else {
      if (homePreview) URL.revokeObjectURL(homePreview);
      setHomePreview(null);
      updateSettings({ homeWallpaper: "default-rose" });
    }
  }

  /* App 图标 */
  async function uploadAppIcon(id: AppId, file: File) {
    const key = appIconFileKey(id);

    await saveAppIconFile(key, file);

    const url = URL.createObjectURL(file);

    setIconPreviews((prev) => ({ ...prev, [id]: url }));

    updateSettings({
      appIcons: {
        ...settings.appIcons,
        [id]: "custom",
      },
    });
  }

  async function removeAppIcon(id: AppId) {
    await deleteAppIconFile(appIconFileKey(id));

    setIconPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    updateSettings({
      appIcons: {
        ...settings.appIcons,
        [id]: null,
      },
    });
  }

  /* Dock 图标 */
  async function uploadDockIcon(
    id: DockSlotId,
    file: File
  ) {
    const key = dockIconFileKey(id);

    await saveAppIconFile(key, file);

    const url = URL.createObjectURL(file);

    setDockIconPreviews((prev) => ({ ...prev, [id]: url }));

    updateSettings({
      dockIcons: {
        ...settings.dockIcons,
        [id]: "custom",
      },
    });
  }

  async function removeDockIcon(id: DockSlotId) {
    await deleteAppIconFile(dockIconFileKey(id));

    setDockIconPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    updateSettings({
      dockIcons: {
        ...settings.dockIcons,
        [id]: null,
      },
    });
  }

  /* 壁纸解析 */
  const currentLockBackground = lockPreview
    ? `url("${lockPreview}")`
    : (
        wallpapers.find(
          (w) => w.id === settings.lockScreenWallpaper
        ) ?? wallpapers[0]
      ).background;

  const currentHomeBackground = homePreview
    ? `url("${homePreview}")`
    : (
        wallpapers.find(
          (w) => w.id === settings.homeWallpaper
        ) ?? wallpapers[0]
      ).background;

  const isActiveWallpaper = (
    id: string,
    target: "lock" | "home"
  ) => {
    if (target === "lock") {
      return settings.lockScreenWallpaper === id;
    }
    return settings.homeWallpaper === id;
  };

  return (
    <main className="hs-page">
      <div className="hs-inner">
        <header className="hs-header">
          <div className="hs-header-left">
            <div className="hs-eyebrow">HOME STUDIO</div>
            <h1 className="hs-title">Customize</h1>
            <p className="hs-subtitle">
              装修你的小世界——壁纸、App 图标、底部栏。
            </p>
          </div>

          <button
            className="hs-back"
            onClick={() => router.push("/")}
          >
            ← Home
          </button>
        </header>

        {/* Home Preview */}
        <section className="hs-section">
          <div className="hs-section-head">
            <div>
              <div className="hs-section-label">PREVIEW</div>
              <h2 className="hs-section-title">Home</h2>
            </div>
          </div>

          <div className="hs-card">
            <div
              className="hs-preview"
              style={{ background: currentHomeBackground }}
            >
              <div className="hs-preview-top">
                <span>RUNWITHME</span>
                <span>⌁</span>
              </div>

              <div className="hs-preview-center">
                <div className="hs-preview-time">13:14</div>
                <div className="hs-preview-date">
                  SEPTEMBER 13
                </div>
              </div>

              <div className="hs-preview-grid">
                {APP_ENTRIES.slice(0, 4).map((entry) => (
                  <div
                    key={entry.id}
                    className="hs-preview-app"
                  >
                    {iconPreviews[entry.id] ? (
                      <img
                        src={iconPreviews[entry.id]}
                        alt={entry.name}
                      />
                    ) : (
                      <span>{entry.icon}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="hs-preview-dock">
                {DOCK_SLOTS.map((slot) => (
                  <div
                    key={slot.id}
                    className="hs-preview-dock-icon"
                  >
                    {dockIconPreviews[slot.id] ? (
                      <img
                        src={dockIconPreviews[slot.id]}
                        alt={slot.label}
                      />
                    ) : (
                      <span>{slot.fallback}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Wallpaper */}
        <section className="hs-section">
          <div className="hs-section-head">
            <div>
              <div className="hs-section-label">
                WALLPAPER
              </div>
              <h2 className="hs-section-title">壁纸</h2>
            </div>
          </div>

          <div className="hs-card">
            <div className="hs-wallpaper-group">
              <div className="hs-wallpaper-group-title">
                <span>Home Screen</span>
                {homePreview && (
                  <button
                    className="hs-small-button hs-remove"
                    onClick={() =>
                      void removeCustomWallpaper("home")
                    }
                  >
                    移除自定义
                  </button>
                )}
              </div>

              <div className="hs-wallpaper-grid">
                {wallpapers.map((w) => (
                  <button
                    key={w.id}
                    className={`hs-wallpaper-option ${
                      isActiveWallpaper(w.id, "home") &&
                      !homePreview
                        ? "active"
                        : ""
                    }`}
                    style={{ background: w.background }}
                    onClick={() =>
                      void selectWallpaper("home", w.id)
                    }
                  >
                    <span className="hs-wallpaper-option-label">
                      {w.name}
                    </span>
                  </button>
                ))}

                <label
                  className={`hs-wallpaper-option hs-upload-option ${
                    homePreview ? "active" : ""
                  }`}
                >
                  <span>↑</span>
                  <span>上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hs-hidden-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void uploadWallpaper("home", file);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="hs-wallpaper-group">
              <div className="hs-wallpaper-group-title">
                <span>Lock Screen</span>
                {lockPreview && (
                  <button
                    className="hs-small-button hs-remove"
                    onClick={() =>
                      void removeCustomWallpaper("lock")
                    }
                  >
                    移除自定义
                  </button>
                )}
              </div>

              <div className="hs-wallpaper-grid">
                {wallpapers.map((w) => (
                  <button
                    key={w.id}
                    className={`hs-wallpaper-option ${
                      isActiveWallpaper(w.id, "lock") &&
                      !lockPreview
                        ? "active"
                        : ""
                    }`}
                    style={{ background: w.background }}
                    onClick={() =>
                      void selectWallpaper("lock", w.id)
                    }
                  >
                    <span className="hs-wallpaper-option-label">
                      {w.name}
                    </span>
                  </button>
                ))}

                <label
                  className={`hs-wallpaper-option hs-upload-option ${
                    lockPreview ? "active" : ""
                  }`}
                >
                  <span>↑</span>
                  <span>上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hs-hidden-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void uploadWallpaper("lock", file);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Dock Icons */}
        <section className="hs-section">
          <div className="hs-section-head">
            <div>
              <div className="hs-section-label">DOCK</div>
              <h2 className="hs-section-title">
                底部栏图标
              </h2>
            </div>
          </div>

          <div className="hs-card">
            <div className="hs-icon-grid">
              {DOCK_SLOTS.map((slot) => {
                const preview =
                  dockIconPreviews[slot.id];

                return (
                  <div
                    key={slot.id}
                    className="hs-icon-item"
                  >
                    <div className="hs-icon-preview hs-icon-dock">
                      {preview ? (
                        <img
                          src={preview}
                          alt={slot.label}
                        />
                      ) : (
                        <span>{slot.fallback}</span>
                      )}
                    </div>

                    <div className="hs-icon-info">
                      <strong>{slot.label}</strong>
                      <small>{slot.description}</small>
                    </div>

                    <div className="hs-icon-actions">
                      <label className="hs-small-button">
                        {preview ? "更换" : "上传"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hs-hidden-input"
                          onChange={(e) => {
                            const file =
                              e.target.files?.[0];
                            if (file) {
                              void uploadDockIcon(
                                slot.id,
                                file
                              );
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {preview && (
                        <button
                          className="hs-small-button hs-remove"
                          onClick={() =>
                            void removeDockIcon(slot.id)
                          }
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* App Icons */}
        <section className="hs-section">
          <div className="hs-section-head">
            <div>
              <div className="hs-section-label">
                APP ICONS
              </div>
              <h2 className="hs-section-title">图标</h2>
            </div>
          </div>

          <div className="hs-card">
            <div className="hs-icon-grid">
              {APP_ENTRIES.map((entry) => {
                const preview = iconPreviews[entry.id];

                return (
                  <div
                    key={entry.id}
                    className="hs-icon-item"
                  >
                    <div
                      className={`hs-icon-preview hs-icon-${entry.id}`}
                    >
                      {preview ? (
                        <img
                          src={preview}
                          alt={entry.name}
                        />
                      ) : (
                        <span>{entry.icon}</span>
                      )}
                    </div>

                    <div className="hs-icon-info">
                      <strong>{entry.name}</strong>
                      <small>
                        {preview
                          ? "已使用自定义图标"
                          : "默认图标"}
                      </small>
                    </div>

                    <div className="hs-icon-actions">
                      <label className="hs-small-button">
                        {preview ? "更换" : "上传"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hs-hidden-input"
                          onChange={(e) => {
                            const file =
                              e.target.files?.[0];
                            if (file) {
                              void uploadAppIcon(
                                entry.id,
                                file
                              );
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {preview && (
                        <button
                          className="hs-small-button hs-remove"
                          onClick={() =>
                            void removeAppIcon(entry.id)
                          }
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadWallpaperPreview(
  key: string,
  isActive: boolean
): Promise<string | null> {
  if (!isActive) return null;

  const file = await getWallpaperFile(key);

  if (!file) return null;

  return URL.createObjectURL(file);
}