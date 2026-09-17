"use client";

import KeepAlivePanel from "@/components/settings/KeepAlivePanel";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { cards as defaultCards } from "@/data/cards";

import {
  loadCards,
  saveCards,
  clearSavedCards,
} from "@/lib/storage";

import { useSystem } from "@/lib/SystemContext";

import {
  downloadExport,
  importAllData,
  clearAllData as clearAllDataLib,
} from "@/lib/dataExport";

import {
  compressAllImages,
  type CompressProgress,
} from "@/lib/imageCompressAll";

type StorageInfo = {
  usage: number;
  quota: number;
  localStorageSize: number;
  dbSizes: { name: string; size: number }[];
};

const DB_LABELS: Record<string, string> = {
  runwithme_image_db: "Chat 图片",
  runwithme_music_db: "Music MP3",
  runwithme_sticker_db: "表情包",
  runwithme_voice_db: "语音",
  runwithme_wallpaper_db: "壁纸 / 头像",
  runwithme_app_icon_db: "App 图标",
  runwithme_chat_files_db: "Chat 附件",
  runwithme_photo_db: "Photos",
  runwithme_icity_db: "iCity",
  runwithme_home_db: "Home 小组件",
};

const DB_STORES: Record<string, string> = {
  runwithme_image_db: "image_files",
  runwithme_music_db: "audio_files",
  runwithme_sticker_db: "sticker_files",
  runwithme_voice_db: "voice_files",
  runwithme_wallpaper_db: "wallpaper_files",
  runwithme_app_icon_db: "app_icon_files",
  runwithme_chat_files_db: "chat_files",
  runwithme_photo_db: "photo_files",
  runwithme_icity_db: "icity_files",
  runwithme_home_db: "home_files",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function getDBSize(
  dbName: string,
  storeName: string
): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(0);

    const req = indexedDB.open(dbName);
    req.onupgradeneeded = () => {
      req.result.close();
      resolve(0);
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        return resolve(0);
      }

      const tx = db.transaction(storeName, "readonly");
      const st = tx.objectStore(storeName);
      let size = 0;
      const cursorReq = st.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          db.close();
          resolve(size);
          return;
        }

        const v = cursor.value;
        if (v instanceof Blob) size += v.size;
        else if (typeof v === "string") size += v.length * 2;
        else size += 100;

        cursor.continue();
      };

      cursorReq.onerror = () => {
        db.close();
        resolve(size);
      };
    };
    req.onerror = () => resolve(0);
  });
}

export default function SettingsPage() {
  const router = useRouter();

  /* ★ 新增 settings / updateSettings */
  const {
    theme,
    setTheme,
    settings,
    updateSettings,
  } = useSystem();

  const [cardCount, setCardCount] = useState(0);
  const [message, setMessage] = useState("");

  const [storageInfo, setStorageInfo] =
    useState<StorageInfo | null>(null);
  const [computing, setComputing] = useState(false);

  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] =
    useState<CompressProgress | null>(null);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }, []);

  /* ---------- 卡片数量 ---------- */
  useEffect(() => {
    setCardCount(loadCards(defaultCards).length);
  }, []);

  /* ---------- 内存信息 ---------- */
  const computeStorage = useCallback(async () => {
    setComputing(true);

    let usage = 0;
    let quota = 0;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.storage?.estimate
      ) {
        const est = await navigator.storage.estimate();
        usage = est.usage ?? 0;
        quota = est.quota ?? 0;
      }
    } catch {
      /* ignore */
    }

    let lsSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key);
        if (value)
          lsSize += (key.length + value.length) * 2;
      }
    } catch {
      /* ignore */
    }

    const dbSizes: { name: string; size: number }[] = [];
    for (const [dbName, storeName] of Object.entries(
      DB_STORES
    )) {
      const size = await getDBSize(dbName, storeName);
      if (size > 0) {
        dbSizes.push({
          name: DB_LABELS[dbName] ?? dbName,
          size,
        });
      }
    }
    dbSizes.sort((a, b) => b.size - a.size);

    setStorageInfo({
      usage,
      quota,
      localStorageSize: lsSize,
      dbSizes,
    });

    setComputing(false);
  }, []);

  useEffect(() => {
    void computeStorage();
  }, [computeStorage]);

  /* ---------- 顺滑主题切换 ---------- */
  function handleSetTheme(next: "light" | "dark") {
    if (next === theme) return;

    if (typeof document !== "undefined") {
      document.documentElement.classList.add(
        "theme-transition"
      );
      window.setTimeout(() => {
        document.documentElement.classList.remove(
          "theme-transition"
        );
      }, 520);
    }

    setTheme(next);
  }

  /* ---------- Cards 导出 / 导入 ---------- */
  const exportCards = () => {
    const currentCards = loadCards(defaultCards);
    const data = JSON.stringify(currentCards, null, 2);
    const blob = new Blob([data], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `runwithme-cards-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showMessage(`已导出 ${currentCards.length} 张卡片`);
  };

  const importCards = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) throw new Error();

        const valid = parsed.filter(
          (c) =>
            c &&
            typeof c.id === "string" &&
            (c.character === "Levi" ||
              c.character === "Erwin" ||
              c.character === "Shared") &&
            typeof c.category === "string" &&
            typeof c.text === "string" &&
            typeof c.enabled === "boolean"
        );

        if (valid.length === 0) throw new Error();

        saveCards(valid);
        setCardCount(valid.length);
        showMessage(`已导入 ${valid.length} 张卡片`);
      } catch {
        showMessage("导入失败：文件格式不正确");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetCards = () => {
    if (
      !window.confirm(
        "确定要恢复默认卡片吗？\n\n你在 Studio 中添加或修改的卡片将被覆盖。"
      )
    )
      return;

    clearSavedCards();
    setCardCount(loadCards(defaultCards).length);
    showMessage("已恢复默认卡片");
  };

  /* ---------- 全量导出 ---------- */
  const exportEverything = async () => {
    if (exporting) return;
    setExporting(true);
    showMessage("正在收集数据…");

    try {
      const bytes = await downloadExport();
      showMessage(
        `已导出备份（约 ${formatBytes(bytes)}）`
      );
    } catch (e) {
      console.error(e);
      showMessage("导出失败，请查看控制台。");
    } finally {
      setExporting(false);
    }
  };

  /* ---------- 全量导入 ---------- */
  const importEverything = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      !window.confirm(
        "导入备份会覆盖当前所有数据。\n\n建议先导出当前数据。继续？"
      )
    )
      return;

    setImporting(true);
    showMessage("正在导入…");

    try {
      const result = await importAllData(file);

      if (!result.ok) {
        showMessage(result.message);
        return;
      }

      showMessage("导入成功，正在刷新…");
      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (e) {
      console.error(e);
      showMessage("导入失败，请查看控制台。");
    } finally {
      setImporting(false);
    }
  };

  /* ---------- 图片压缩 ---------- */
  const compressImages = async () => {
    if (
      !window.confirm(
        "压缩所有已保存的图片？\n\n原图会以压缩后的版本覆盖。\n\n建议先导出备份。"
      )
    )
      return;

    setCompressing(true);
    setCompressProgress({
      current: 0,
      total: 0,
      savedBytes: 0,
      dbName: "准备中…",
    });

    try {
      const result = await compressAllImages((p) => {
        setCompressProgress(p);
      });

      showMessage(
        `完成：处理 ${result.compressedCount} 张 · 节省 ${formatBytes(result.savedBytes)}`
      );

      await computeStorage();
    } catch (e) {
      console.error(e);
      showMessage("压缩失败，请查看控制台。");
    } finally {
      setCompressing(false);
      setCompressProgress(null);
    }
  };

  /* ---------- 清空所有 ---------- */
  const clearAll = async () => {
    if (
      !window.confirm(
        "确定要清除 RunWithme 的全部本地数据吗？\n\n包括：所有 App 数据、聊天记录、照片、音乐、头像、图标、壁纸…\n\n此操作不可撤销。"
      )
    )
      return;

    showMessage("正在清除…");

    await clearAllDataLib();

    showMessage("已清除，正在刷新…");
    window.setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  /* ---------- 字体缩放 ---------- */
  const fontScale = settings?.fontScale ?? 1;

  function handleDecFontScale() {
    const next =
      Math.round((fontScale - 0.05) * 100) / 100;
    if (next < 0.85) return;
    updateSettings({ fontScale: next });
  }

  function handleIncFontScale() {
    const next =
      Math.round((fontScale + 0.05) * 100) / 100;
    if (next > 1.3) return;
    updateSettings({ fontScale: next });
  }

  function handleResetFontScale() {
    updateSettings({ fontScale: 1 });
  }

  const usedPercent =
    storageInfo && storageInfo.quota > 0
      ? Math.min(
          100,
          (storageInfo.usage / storageInfo.quota) * 100
        )
      : 0;

  return (
    <main
      className={`studio-page studio-settings-page studio-${theme}`}
    >
      <header className="studio-header">
        <div>
          <div className="studio-eyebrow">
            RUNWITHME STUDIO
          </div>
          <h1>Settings</h1>
          <p>
            Control the little world behind the screen.
          </p>
        </div>

        <button
          className="studio-back-link"
          onClick={() => router.push("/")}
        >
          ← Home
        </button>
      </header>

      {message && (
        <div className="studio-toast">{message}</div>
      )}

      <div className="settings-sections">
        {/* ---------- APPEARANCE ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                APPEARANCE
              </span>
              <h2>外观</h2>
            </div>
            <span className="settings-section-icon">◐</span>
          </div>

          <div className="settings-card">
            {/* 主题 */}
            <div className="settings-row">
              <div>
                <strong>RunWithme Theme</strong>
                <span>
                  控制整个 RunWithme 的日间与夜间模式
                </span>
              </div>

              <div className="settings-segment">
                <button
                  className={
                    theme === "light" ? "active" : ""
                  }
                  onClick={() => handleSetTheme("light")}
                >
                  ☼ Light
                </button>
                <button
                  className={
                    theme === "dark" ? "active" : ""
                  }
                  onClick={() => handleSetTheme("dark")}
                >
                  ☾ Dark
                </button>
              </div>
            </div>

            <div className="settings-divider" />

            {/* ★ 字体大小 */}
            <div className="settings-row">
              <div>
                <strong>字体大小</strong>
                <span>
                  调整整个 RunWithme 的显示比例
                </span>
              </div>

              <div className="settings-font-scale">
                <button
                  onClick={handleDecFontScale}
                  disabled={fontScale <= 0.85}
                  aria-label="缩小"
                >
                  A−
                </button>

                <span className="settings-font-scale-value">
                  {Math.round(fontScale * 100)}%
                </span>

                <button
                  onClick={handleIncFontScale}
                  disabled={fontScale >= 1.3}
                  aria-label="放大"
                >
                  A+
                </button>

                <button
                  className="settings-font-scale-reset"
                  onClick={handleResetFontScale}
                  disabled={fontScale === 1}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- BACKGROUND / KEEPALIVE ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                BACKGROUND
              </span>
              <h2>通知与保活</h2>
            </div>
            <span className="settings-section-icon">◐</span>
          </div>

          <div className="settings-card">
            <KeepAlivePanel />
          </div>
        </section>

        {/* ---------- BACKGROUND / KEEPALIVE ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                BACKGROUND
              </span>
              <h2>通知与保活</h2>
            </div>
            <span className="settings-section-icon">◐</span>
          </div>

          <div className="settings-card">
            <KeepAlivePanel />
          </div>
        </section>

        {/* ---------- STORAGE ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                STORAGE
              </span>
              <h2>存储</h2>
            </div>
            <span className="settings-section-icon">◫</span>
          </div>

          <div className="settings-card">
            <div className="settings-storage-summary">
              <div className="settings-storage-top">
                <div>
                  <strong>
                    {storageInfo
                      ? formatBytes(storageInfo.usage)
                      : "计算中…"}
                  </strong>
                  <span>
                    已使用
                    {storageInfo && storageInfo.quota > 0
                      ? ` / ${formatBytes(
                          storageInfo.quota
                        )}`
                      : ""}
                  </span>
                </div>

                <button
                  className="settings-mini-btn"
                  onClick={() => void computeStorage()}
                  disabled={computing}
                >
                  {computing ? "…" : "重新计算"}
                </button>
              </div>

              <div className="settings-storage-bar">
                <div
                  className="settings-storage-bar-fill"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>

              {storageInfo && (
                <div className="settings-storage-note">
                  LocalStorage{" "}
                  {formatBytes(storageInfo.localStorageSize)}
                </div>
              )}
            </div>

            {storageInfo &&
              storageInfo.dbSizes.length > 0 && (
                <div className="settings-storage-list">
                  {storageInfo.dbSizes.map((d) => (
                    <div
                      key={d.name}
                      className="settings-storage-item"
                    >
                      <span className="settings-storage-item-name">
                        {d.name}
                      </span>
                      <span className="settings-storage-item-size">
                        {formatBytes(d.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            <div className="settings-divider" />

            <div className="settings-row settings-storage-compress">
              <div>
                <strong>压缩图片</strong>
                <span>
                  将已保存的图片压缩到合理尺寸，节省空间
                </span>
              </div>

              <button
                className="settings-danger-button settings-action-primary"
                onClick={() => void compressImages()}
                disabled={compressing}
              >
                {compressing ? "压缩中…" : "开始压缩"}
              </button>
            </div>

            {compressing && compressProgress && (
              <div className="settings-compress-progress">
                <div className="settings-compress-bar">
                  <div
                    className="settings-compress-bar-fill"
                    style={{
                      width:
                        compressProgress.total > 0
                          ? `${
                              (compressProgress.current /
                                compressProgress.total) *
                              100
                            }%`
                          : "0%",
                    }}
                  />
                </div>
                <div className="settings-compress-text">
                  {compressProgress.dbName} ·{" "}
                  {compressProgress.current} /{" "}
                  {compressProgress.total} · 已节省{" "}
                  {formatBytes(
                    compressProgress.savedBytes
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- BACKUP ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                BACKUP
              </span>
              <h2>备份</h2>
            </div>
            <span className="settings-section-icon">⇅</span>
          </div>

          <div className="settings-card">
            <div className="settings-actions">
              <button
                className="settings-action"
                onClick={() => void exportEverything()}
                disabled={exporting}
              >
                <span className="settings-action-icon">
                  ↑
                </span>
                <span>
                  <strong>
                    {exporting
                      ? "Exporting…"
                      : "Export All"}
                  </strong>
                  <small>
                    导出全部数据（含图片、音乐、设置）
                  </small>
                </span>
              </button>

              <label className="settings-action">
                <span className="settings-action-icon">
                  ↓
                </span>
                <span>
                  <strong>
                    {importing
                      ? "Importing…"
                      : "Import All"}
                  </strong>
                  <small>
                    从备份文件恢复全部数据
                  </small>
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importEverything}
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* ---------- CHAT CARDS ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                CHAT DATA
              </span>
              <h2>Chat Cards</h2>
            </div>
            <span className="settings-section-icon">♡</span>
          </div>

          <div className="settings-card">
            <div className="settings-data-summary">
              <div className="settings-data-number">
                {cardCount}
              </div>
              <div>
                <strong>当前卡片</strong>
                <span>所有角色与分类的卡片总数</span>
              </div>
            </div>

            <div className="settings-actions">
              <button
                className="settings-action"
                onClick={exportCards}
              >
                <span className="settings-action-icon">
                  ↑
                </span>
                <span>
                  <strong>Export Cards</strong>
                  <small>导出为 JSON 文件</small>
                </span>
              </button>

              <label className="settings-action">
                <span className="settings-action-icon">
                  ↓
                </span>
                <span>
                  <strong>Import Cards</strong>
                  <small>从 JSON 文件恢复</small>
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importCards}
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* ---------- DANGER ---------- */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <div>
              <span className="settings-section-label">
                RESET
              </span>
              <h2>数据管理</h2>
            </div>
            <span className="settings-section-icon">⚙</span>
          </div>

          <div className="settings-card">
            <div className="settings-row settings-danger-row">
              <div>
                <strong>Restore Default Cards</strong>
                <span>
                  删除当前卡片修改，恢复最初的默认卡片
                </span>
              </div>
              <button
                className="settings-danger-button"
                onClick={resetCards}
              >
                Restore
              </button>
            </div>

            <div className="settings-divider" />

            <div className="settings-row settings-danger-row">
              <div>
                <strong>Clear Local Data</strong>
                <span>
                  清除浏览器中保存的所有 RunWithme 数据
                </span>
              </div>
              <button
                className="settings-danger-button"
                onClick={() => void clearAll()}
              >
                Clear All
              </button>
            </div>
          </div>
        </section>

        <section className="settings-about">
          <div className="settings-about-symbol">♡</div>
          <div>
            <strong>RunWithme</strong>
            <span>
              a little world beyond the walls
            </span>
            <small>Studio · local edition</small>
          </div>
        </section>
      </div>
    </main>
  );
}