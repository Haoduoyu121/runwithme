/* =========================================================================
   全量数据导出 / 导入
   - 打包所有 runwithme_ 前缀的 localStorage
   - 打包所有 IndexedDB 库（图片以 base64 存储）
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
      /* 库不存在 → 直接关闭，返回 null */
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
  /* localStorage */
  const ls: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("runwithme_")) continue;
    const v = localStorage.getItem(key);
    if (v !== null) ls[key] = v;
  }

  /* IndexedDB */
  const idb: ExportData["indexedDB"] = {};

  for (const { db: dbName, store } of APP_DBS) {
    const db = await openReadonly(dbName);
    if (!db) continue;

    if (!db.objectStoreNames.contains(store)) {
      db.close();
      continue;
    }

    const records: Record<string, string> = {};

    await new Promise<void>((resolve) => {
      const tx = db.transaction(store, "readonly");
      const st = tx.objectStore(store);
      const cursorReq = st.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          db.close();
          resolve();
          return;
        }

        const key = String(cursor.key);
        const value = cursor.value;

        if (value instanceof Blob) {
          blobToBase64(value)
            .then((b64) => {
              const mime =
                value.type || "application/octet-stream";
              records[key] = `${mime}|${b64}`;
              cursor.continue();
            })
            .catch(() => {
              cursor.continue();
            });
        } else if (typeof value === "string") {
          records[key] = `text/plain|${btoa(
            unescape(encodeURIComponent(value))
          )}`;
          cursor.continue();
        } else {
          cursor.continue();
        }
      };

      cursorReq.onerror = () => {
        db.close();
        resolve();
      };
    });

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

/* ---------- 下载 ---------- */

export async function downloadExport(): Promise<number> {
  const data = await exportAllData();
  const str = JSON.stringify(data);

  const blob = new Blob([str], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");

  a.href = url;
  a.download = `runwithme-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return str.length * 2; /* 粗略字节数 */
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

    /* localStorage */
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

    /* IndexedDB */
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
  /* localStorage */
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("runwithme_")) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));

  /* IndexedDB */
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