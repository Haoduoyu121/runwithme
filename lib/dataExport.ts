/* =========================================================================
   全量数据导出 / 导入
   - 打包所有 runwithme_ 前缀的 localStorage
   - 打包所有 IndexedDB 库（图片以 base64 存储）
   - PWA 兼容：优先 Web Share API，降级为可见链接
   ========================================================================= */

export type ExportData = {
  version: number;
  exportedAt: number;
  app: string;
  localStorage: Record<string, string>;
  indexedDB: Record<
    string,
    Record<string, Record<string, string>>
  >;
};

const APP_DBS: { db: string; store: string }[] = [
  { db: "runwithme_image_db", store: "image_files" },
  { db: "runwithme_music_db", store: "audio_files" },
  { db: "runwithme_sticker_db", store: "sticker_files" },
  { db: "runwithme_voice_db", store: "voice_files" },
  {
    db: "runwithme_wallpaper_db",
    store: "wallpaper_files",
  },
  { db: "runwithme_app_icon_db", store: "app_icon_files" },
  { db: "runwithme_chat_files_db", store: "chat_files" },
  { db: "runwithme_photo_db", store: "photo_files" },
  { db: "runwithme_icity_db", store: "icity_files" },
  { db: "runwithme_home_db", store: "home_files" },
];

/* ---------- base64 转换 ---------- */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("读取失败"));
        return;
      }
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(
  base64: string,
  mime: string
): Blob {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], {
    type: mime || "application/octet-stream",
  });
}

/* ---------- IndexedDB 打开 ---------- */

function openReadonly(
  name: string
): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve(null);
    }
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      req.result.close();
      resolve(null);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function openWritable(
  name: string,
  store: string
): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve(null);
    }
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/* ---------- 导出 ---------- */

export async function exportAllData(): Promise<ExportData> {
  const ls: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("runwithme_")) continue;
    const v = localStorage.getItem(key);
    if (v !== null) ls[key] = v;
  }

  const idb: ExportData["indexedDB"] = {};

  for (const { db: dbName, store } of APP_DBS) {
    const db = await openReadonly(dbName);
    if (!db) continue;

    if (!db.objectStoreNames.contains(store)) {
      db.close();
      continue;
    }

    /* ★ 第一步：事务里只做同步操作，把所有记录读进内存
       绝不能在这里 await / .then，否则事务会被 commit */
    const raw: { key: string; value: unknown }[] = [];

    await new Promise<void>((resolve) => {
      const tx = db.transaction(store, "readonly");
      const st = tx.objectStore(store);
      const cursorReq = st.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        raw.push({
          key: String(cursor.key),
          value: cursor.value,
        });
        cursor.continue(); /* 纯同步，事务安全 */
      };

      cursorReq.onerror = () => {
        resolve();
      };
      tx.onerror = () => {
        resolve();
      };
      tx.onabort = () => {
        resolve();
      };
    });

    db.close();

    /* ★ 第二步：事务已结束，安全地做异步编码 */
    const records: Record<string, string> = {};

    for (const { key, value } of raw) {
      if (value instanceof Blob) {
        try {
          const b64 = await blobToBase64(value);
          const mime =
            value.type || "application/octet-stream";
          records[key] = `${mime}|${b64}`;
        } catch (e) {
          console.warn(
            "[dataExport] blob 编码失败，跳过:",
            dbName,
            key,
            e
          );
        }
      } else if (typeof value === "string") {
        try {
          records[key] = `text/plain|${btoa(
            unescape(encodeURIComponent(value))
          )}`;
        } catch (e) {
          console.warn(
            "[dataExport] string 编码失败，跳过:",
            dbName,
            key,
            e
          );
        }
      } else if (value instanceof ArrayBuffer) {
        try {
          const blob = new Blob([value]);
          const b64 = await blobToBase64(blob);
          records[key] = `application/octet-stream|${b64}`;
        } catch (e) {
          console.warn(
            "[dataExport] ArrayBuffer 编码失败，跳过:",
            dbName,
            key,
            e
          );
        }
      }
      /* 其他类型（数字 / 对象等）忽略，原有逻辑也不处理 */
    }

    if (Object.keys(records).length > 0) {
      idb[dbName] = { [store]: records };
    }
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    app: "RunWithme",
    localStorage: ls,
    indexedDB: idb,
  };
}

/* -------------------------------------------------------
   下载 / 分享
   -------------------------------------------------------
   iOS PWA standalone 下 <a download> 无效 →
   优先 Web Share API（可以分享 File）
   降级：复制 JSON 到剪贴板
   ------------------------------------------------------- */

export type DownloadResult =
  | { ok: true; method: "download"; bytes: number }
  | { ok: true; method: "share"; bytes: number }
  | { ok: true; method: "clipboard"; bytes: number }
  | { ok: false; message: string };

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean })
      .standalone === true
  );
}

export async function downloadExport(): Promise<DownloadResult> {
  let data: ExportData;
  try {
    data = await exportAllData();
  } catch (e) {
    return {
      ok: false,
      message:
        "收集数据失败：" +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  const str = JSON.stringify(data);
  const bytes = str.length * 2;

  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `runwithme-backup-${stamp}.json`;

  const blob = new Blob([str], {
    type: "application/json",
  });

  /* ---------- 1. iOS PWA standalone → 优先 Web Share ---------- */
  if (isStandalonePWA()) {
    try {
      const file = new File([blob], filename, {
        type: "application/json",
      });

      const nav = window.navigator as Navigator & {
        canShare?: (data: {
          files?: File[];
        }) => boolean;
        share?: (data: {
          files?: File[];
          title?: string;
          text?: string;
        }) => Promise<void>;
      };

      if (
        nav.share &&
        nav.canShare &&
        nav.canShare({ files: [file] })
      ) {
        await nav.share({
          files: [file],
          title: "RunWithme Backup",
          text: "RunWithme 全量数据备份",
        });
        return { ok: true, method: "share", bytes };
      }
    } catch (e) {
      /* 用户取消分享 or 失败，继续走降级 */
      console.warn("[dataExport] Web Share 失败:", e);
    }
  }

  /* ---------- 2. 常规浏览器 → a.download ---------- */
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();

    /* 延迟 revoke，给 iOS 一点缓冲 */
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 4000);

    return { ok: true, method: "download", bytes };
  } catch (e) {
    console.warn("[dataExport] a.download 失败:", e);
  }

  /* ---------- 3. 兜底：复制到剪贴板 ---------- */
  try {
    await navigator.clipboard.writeText(str);
    return { ok: true, method: "clipboard", bytes };
  } catch (e) {
    return {
      ok: false,
      message:
        "导出失败，请用系统浏览器（Safari / Chrome）打开 RunWithme 后再试。\n\n" +
        (e instanceof Error ? e.message : String(e)),
    };
  }
}

/* ---------- 导入 ---------- */

export type ImportResult = {
  ok: boolean;
  message: string;
  counts?: {
    localStorageKeys: number;
    dbRecords: number;
  };
};

export async function importAllData(
  file: File
): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    if (
      !data ||
      typeof data !== "object" ||
      data.version !== 1
    ) {
      return {
        ok: false,
        message: "备份文件格式不正确或版本不兼容。",
      };
    }

    let lsCount = 0;
    let dbCount = 0;

    if (
      data.localStorage &&
      typeof data.localStorage === "object"
    ) {
      for (const [key, value] of Object.entries(
        data.localStorage
      )) {
        if (!key.startsWith("runwithme_")) continue;
        if (typeof value !== "string") continue;
        localStorage.setItem(key, value);
        lsCount++;
      }
    }

    if (
      data.indexedDB &&
      typeof data.indexedDB === "object"
    ) {
      for (const [dbName, stores] of Object.entries(
        data.indexedDB
      )) {
        if (!dbName.startsWith("runwithme_")) continue;

        for (const [storeName, records] of Object.entries(
          stores
        )) {
          const db = await openWritable(
            dbName,
            storeName
          );
          if (!db) continue;

          await new Promise<void>((resolve) => {
            const tx = db.transaction(
              storeName,
              "readwrite"
            );
            const st = tx.objectStore(storeName);

            for (const [id, encoded] of Object.entries(
              records
            )) {
              const idx = encoded.indexOf("|");
              if (idx < 0) continue;

              const mime = encoded.slice(0, idx);
              const b64 = encoded.slice(idx + 1);

              try {
                const blob = base64ToBlob(b64, mime);
                st.put(blob, id);
                dbCount++;
              } catch (e) {
                console.error("导入失败:", dbName, id, e);
              }
            }

            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              resolve();
            };
          });
        }
      }
    }

    return {
      ok: true,
      message: "导入成功。",
      counts: {
        localStorageKeys: lsCount,
        dbRecords: dbCount,
      },
    };
  } catch (e) {
    return {
      ok: false,
      message:
        "导入失败：" +
        (e instanceof Error ? e.message : String(e)),
    };
  }
}

/* ---------- 全量清空 ---------- */

export async function clearAllData(): Promise<void> {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("runwithme_")) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));

  const knownDbs = APP_DBS.map((x) => x.db);

  try {
    const anyIDB = indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>;
    };

    if (typeof anyIDB.databases === "function") {
      const list = await anyIDB.databases();
      for (const info of list) {
        if (
          info.name &&
          info.name.startsWith("runwithme_")
        ) {
          indexedDB.deleteDatabase(info.name);
        }
      }
    } else {
      for (const name of knownDbs) {
        indexedDB.deleteDatabase(name);
      }
    }
  } catch {
    for (const name of knownDbs) {
      indexedDB.deleteDatabase(name);
    }
  }
}