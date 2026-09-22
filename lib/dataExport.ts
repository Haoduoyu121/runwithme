/* =========================================================================
   全量数据导出 / 导入 v2
   - ZIP 打包（fflate），二进制直存，不用 base64
   - 兼容旧 JSON 备份导入
   ========================================================================= */

import {
  zip,
  unzip,
  strToU8,
  strFromU8,
  type AsyncZippable,
} from "fflate";

/* ==================== 类型 ==================== */

/* v1（旧 JSON）*/
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

/* v2（新 ZIP）*/
type ManifestV2 = {
  version: 2;
  exportedAt: number;
  app: string;
  localStorage: Record<string, string>;
  dbs: {
    db: string;
    store: string;
    records: {
      key: string;
      file: string; /* zip 内路径 */
      mime: string;
    }[];
  }[];
};

const MANIFEST_PATH = "manifest.json";

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

/* ==================== IDB 打开 ==================== */

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

/* 把 IDB store 全部同步读进内存（不 await，事务安全） */
function readStoreRaw(
  db: IDBDatabase,
  store: string
): Promise<{ key: string; value: unknown }[]> {
  return new Promise((resolve) => {
    const raw: { key: string; value: unknown }[] = [];
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).openCursor();

    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(raw);
        return;
      }
      raw.push({
        key: String(cursor.key),
        value: cursor.value,
      });
      cursor.continue(); /* 纯同步，事务安全 */
    };
    req.onerror = () => resolve(raw);
    tx.onerror = () => resolve(raw);
    tx.onabort = () => resolve(raw);
  });
}

/* ==================== 工具 ==================== */

async function blobToU8(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function zipAsync(files: AsyncZippable): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    zip(files, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      /* 拷贝成干净的 ArrayBuffer，避免 TS 的 ArrayBufferLike 兼容问题 */
      const buf = new ArrayBuffer(data.byteLength);
      new Uint8Array(buf).set(data);
      resolve(buf);
    });
  });
}

function unzipAsync(
  u8: Uint8Array
): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(u8, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/* ==================== 导出 ==================== */

export type DownloadResult =
  | { ok: true; method: "download" | "share" | "clipboard"; bytes: number }
  | { ok: false; message: string };

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean })
      .standalone === true
  );
}

export async function downloadExport(
  onProgress?: (msg: string) => void
): Promise<DownloadResult> {
  const log = (m: string) => {
    try {
      onProgress?.(m);
    } catch {
      /* 忽略进度回调里的错误 */
    }
  };

  /* ---------- 1. localStorage ---------- */
  log("读取本地设置…");
  const ls: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith("runwithme_")) continue;
    const v = localStorage.getItem(key);
    if (v !== null) ls[key] = v;
  }

  /* ---------- 2. 遍历 IDB ---------- */
  const files: AsyncZippable = {};
  const dbs: ManifestV2["dbs"] = [];

  for (let i = 0; i < APP_DBS.length; i++) {
    const { db: dbName, store } = APP_DBS[i];
    log(
      `读取数据库 ${i + 1}/${APP_DBS.length}：${dbName}`
    );

    const db = await openReadonly(dbName);
    if (!db) continue;
    if (!db.objectStoreNames.contains(store)) {
      db.close();
      continue;
    }

    const raw = await readStoreRaw(db, store);
    db.close();

    const records: ManifestV2["dbs"][0]["records"] = [];
    let idx = 0;
    const dir = `idb/${dbName}__${store}`;

    for (const { key, value } of raw) {
      if (value instanceof Blob) {
        try {
          const u8 = await blobToU8(value);
          const path = `${dir}/${idx}.bin`;
          files[path] = u8;
          records.push({
            key,
            file: path,
            mime:
              value.type || "application/octet-stream",
          });
        } catch (e) {
          console.warn(
            "[dataExport] blob 读取失败，跳过:",
            dbName,
            key,
            e
          );
        }
      } else if (typeof value === "string") {
        const path = `${dir}/${idx}.txt`;
        files[path] = strToU8(value);
        records.push({
          key,
          file: path,
          mime: "text/plain",
        });
      } else if (value instanceof ArrayBuffer) {
        const path = `${dir}/${idx}.bin`;
        files[path] = new Uint8Array(value);
        records.push({
          key,
          file: path,
          mime: "application/octet-stream",
        });
      }
      /* 其他类型忽略 */
      idx++;
    }

    if (records.length > 0) {
      dbs.push({ db: dbName, store, records });
    }
  }

  /* ---------- 3. manifest ---------- */
  const manifest: ManifestV2 = {
    version: 2,
    exportedAt: Date.now(),
    app: "RunWithme",
    localStorage: ls,
    dbs,
  };
  files[MANIFEST_PATH] = strToU8(JSON.stringify(manifest));

  /* ---------- 4. ZIP ---------- */
  log("打包压缩…（数据多时会慢，请稍等）");
  let zipped: ArrayBuffer;
  try {
    zipped = await zipAsync(files);
  } catch (e) {
    return {
      ok: false,
      message:
        "打包失败：" +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  const blob = new Blob([zipped], {
    type: "application/zip",
  });
  const bytes = blob.size;

  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-");
  const filename = `runwithme-backup-${stamp}.zip`;

  /* ---------- 5. 输出：PWA 优先 Share ---------- */
  if (isStandalonePWA()) {
    try {
      const file = new File([blob], filename, {
        type: "application/zip",
      });
      const nav = window.navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean;
        share?: (d: {
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
        log("弹出分享菜单…");
        await nav.share({
          files: [file],
          title: "RunWithme Backup",
          text: "RunWithme 全量数据备份",
        });
        return { ok: true, method: "share", bytes };
      }
    } catch (e) {
      console.warn("[dataExport] Web Share 失败:", e);
    }
  }

  try {
    log("开始下载…");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    return { ok: true, method: "download", bytes };
  } catch (e) {
    console.warn("[dataExport] a.download 失败:", e);
  }

  return {
    ok: false,
    message:
      "导出失败：当前环境不支持下载或分享，请在 Safari / Chrome 里打开 RunWithme 后重试。",
  };
}

/* ==================== 导入 ==================== */

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
    const isZip =
      file.name.toLowerCase().endsWith(".zip") ||
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";

    if (isZip) {
      return importZipV2(file);
    }
    return importJsonV1(file);
  } catch (e) {
    return {
      ok: false,
      message:
        "导入失败：" +
        (e instanceof Error ? e.message : String(e)),
    };
  }
}

/* --------- v2 ZIP 导入 --------- */

async function importZipV2(
  file: File
): Promise<ImportResult> {
  const u8 = new Uint8Array(await file.arrayBuffer());
  const entries = await unzipAsync(u8);

  const manifestU8 = entries[MANIFEST_PATH];
  if (!manifestU8) {
    return {
      ok: false,
      message: "ZIP 里找不到 manifest.json，可能不是 RunWithme 备份。",
    };
  }

  let manifest: ManifestV2;
  try {
    manifest = JSON.parse(strFromU8(manifestU8));
  } catch {
    return {
      ok: false,
      message: "manifest.json 解析失败。",
    };
  }

  if (manifest.version !== 2 || manifest.app !== "RunWithme") {
    return {
      ok: false,
      message: "备份文件版本不兼容。",
    };
  }

  let lsCount = 0;
  let dbCount = 0;

  if (manifest.localStorage) {
    for (const [key, value] of Object.entries(
      manifest.localStorage
    )) {
      if (!key.startsWith("runwithme_")) continue;
      if (typeof value !== "string") continue;
      localStorage.setItem(key, value);
      lsCount++;
    }
  }

  for (const dbEntry of manifest.dbs || []) {
    const { db: dbName, store, records } = dbEntry;
    if (!dbName.startsWith("runwithme_")) continue;

    const db = await openWritable(dbName, store);
    if (!db) continue;

    await new Promise<void>((resolve) => {
      const tx = db.transaction(store, "readwrite");
      const st = tx.objectStore(store);

      for (const rec of records) {
        const payload = entries[rec.file];
        if (!payload) continue;
        try {
          /* slice 出干净的 ArrayBuffer，避免共享底层内存 */
          const copy = new Uint8Array(payload.length);
          copy.set(payload);
          const blob = new Blob([copy], {
            type: rec.mime || "application/octet-stream",
          });
          st.put(blob, rec.key);
          dbCount++;
        } catch (e) {
          console.error(
            "[dataExport] 写入失败:",
            dbName,
            rec.key,
            e
          );
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
      tx.onabort = () => {
        db.close();
        resolve();
      };
    });
  }

  return {
    ok: true,
    message: "导入成功。",
    counts: { localStorageKeys: lsCount, dbRecords: dbCount },
  };
}

/* --------- v1 JSON 导入（兼容旧备份） --------- */

async function importJsonV1(
  file: File
): Promise<ImportResult> {
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

  if (data.localStorage) {
    for (const [key, value] of Object.entries(
      data.localStorage
    )) {
      if (!key.startsWith("runwithme_")) continue;
      if (typeof value !== "string") continue;
      localStorage.setItem(key, value);
      lsCount++;
    }
  }

  if (data.indexedDB) {
    for (const [dbName, stores] of Object.entries(
      data.indexedDB
    )) {
      if (!dbName.startsWith("runwithme_")) continue;

      for (const [storeName, records] of Object.entries(
        stores
      )) {
        const db = await openWritable(dbName, storeName);
        if (!db) continue;

        await new Promise<void>((resolve) => {
          const tx = db.transaction(storeName, "readwrite");
          const st = tx.objectStore(storeName);

          for (const [id, encoded] of Object.entries(
            records
          )) {
            const idx = encoded.indexOf("|");
            if (idx < 0) continue;
            const mime = encoded.slice(0, idx);
            const b64 = encoded.slice(idx + 1);

            try {
              const binary = atob(b64);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              st.put(
                new Blob([bytes], {
                  type: mime || "application/octet-stream",
                }),
                id
              );
              dbCount++;
            } catch (e) {
              console.error(
                "[dataExport] v1 导入失败:",
                dbName,
                id,
                e
              );
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
          tx.onabort = () => {
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
    counts: { localStorageKeys: lsCount, dbRecords: dbCount },
  };
}

/* ==================== 清空 ==================== */

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