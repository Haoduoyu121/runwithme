/* =========================================================
   RunWithme · Voice Files (IndexedDB)
   每张语音卡的 mp3 文件
   ========================================================= */

const DB_NAME = "runwithme_voice_files";
const DB_VERSION = 2;
const STORE = "files";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB 不可用"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVoiceFile(
  id: string,
  blob: Blob
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    let settled = false;

    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);

    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch {}
      resolve();
    };

    tx.onerror = () => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch {}
      reject(tx.error ?? new Error("IndexedDB 写入失败"));
    };

    tx.onabort = () => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch {}
      reject(new Error("IndexedDB 事务被中止"));
    };
  });
}

export async function getVoiceFile(
  id: string
): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () =>
      resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVoiceFile(
  id: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}