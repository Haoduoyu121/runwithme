/* =========================================================================
   批量压缩所有图片
   - 遍历所有含图片的 IndexedDB
   - 逐张压缩后写回
   - 返回节省字节数
   ========================================================================= */

import { compressImage } from "@/lib/photoUtils";

type Target = {
  db: string;
  store: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  label: string;
};

const TARGETS: Target[] = [
  {
    db: "runwithme_photo_db",
    store: "photo_files",
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    label: "Photos",
  },
  {
    db: "runwithme_image_db",
    store: "image_files",
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    label: "Chat 图片",
  },
  {
    db: "runwithme_chat_files_db",
    store: "chat_files",
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    label: "Chat 附件",
  },
  {
    db: "runwithme_wallpaper_db",
    store: "wallpaper_files",
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    label: "壁纸 / 头像",
  },
  {
    db: "runwithme_app_icon_db",
    store: "app_icon_files",
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    label: "App 图标",
  },
  {
    db: "runwithme_sticker_db",
    store: "sticker_files",
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    label: "表情包",
  },
  {
    db: "runwithme_home_db",
    store: "home_files",
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
    label: "Home 小组件",
  },
  {
    db: "runwithme_icity_db",
    store: "icity_files",
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.82,
    label: "iCity",
  },
];

export type CompressProgress = {
  current: number;
  total: number;
  savedBytes: number;
  dbName: string;
};

export type CompressResult = {
  savedBytes: number;
  compressedCount: number;
  skippedCount: number;
};

/* ---------- 主流程 ---------- */

export async function compressAllImages(
  onProgress?: (p: CompressProgress) => void
): Promise<CompressResult> {
  let savedBytes = 0;
  let compressedCount = 0;
  let skippedCount = 0;

  /* 第一步：统计总数 */
  let total = 0;
  const itemsPerTarget: {
    target: Target;
    items: { key: string; blob: Blob }[];
  }[] = [];

  for (const target of TARGETS) {
    const items = await listImageBlobs(
      target.db,
      target.store
    );
    itemsPerTarget.push({ target, items });
    total += items.length;
  }

  onProgress?.({
    current: 0,
    total,
    savedBytes: 0,
    dbName: "准备中…",
  });

  /* 第二步：逐张压缩 */
  let done = 0;

  for (const { target, items } of itemsPerTarget) {
    for (const { key, blob } of items) {
      done++;

      try {
        const file = new File(
          [blob],
          `${key}.${(blob.type || "image/jpeg").split("/")[1] || "jpg"}`,
          { type: blob.type }
        );

        const result = await compressImage(file, {
          maxWidth: target.maxWidth,
          maxHeight: target.maxHeight,
          quality: target.quality,
          maxSizeBytes: blob.size,
        });

        if (result.compressedSize < blob.size) {
          const saved = blob.size - result.compressedSize;

          const ok = await writeBlob(
            target.db,
            target.store,
            key,
            result.blob
          );

          if (ok) {
            savedBytes += saved;
            compressedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (e) {
        console.error("压缩失败:", target.db, key, e);
        skippedCount++;
      }

      onProgress?.({
        current: done,
        total,
        savedBytes,
        dbName: target.label,
      });
    }
  }

  return { savedBytes, compressedCount, skippedCount };
}

/* ---------- 读取一个库的图片 ---------- */

function listImageBlobs(
  dbName: string,
  storeName: string
): Promise<{ key: string; blob: Blob }[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);

    const req = indexedDB.open(dbName);
    req.onupgradeneeded = () => {
      req.result.close();
      resolve([]);
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        return resolve([]);
      }

      const items: { key: string; blob: Blob }[] = [];
      const tx = db.transaction(storeName, "readonly");
      const st = tx.objectStore(storeName);
      const cursorReq = st.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          db.close();
          resolve(items);
          return;
        }

        const value = cursor.value;
        if (
          value instanceof Blob &&
          value.type.startsWith("image/") &&
          value.type !== "image/gif"
        ) {
          items.push({
            key: String(cursor.key),
            blob: value,
          });
        }
        cursor.continue();
      };

      cursorReq.onerror = () => {
        db.close();
        resolve(items);
      };
    };
    req.onerror = () => resolve([]);
  });
}

/* ---------- 写回 ---------- */

function writeBlob(
  dbName: string,
  storeName: string,
  key: string,
  blob: Blob
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    const req = indexedDB.open(dbName);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(blob, key);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    };
    req.onerror = () => resolve(false);
  });
}