const DB_NAME = "runwithme_music_covers_db";
const STORE_NAME = "covers";
const DB_VERSION = 2;

type CoverRecord = {
  buffer: ArrayBuffer;
  mime: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB only in browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMusicCover(
  id: string,
  file: Blob
): Promise<void> {
  const buffer = await file.arrayBuffer();
  const mime = file.type || "image/jpeg";
  const record: CoverRecord = { buffer, mime };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(record, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getMusicCover(
  id: string
): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      db.close();
      const result = req.result;
      if (!result) {
        resolve(null);
        return;
      }
      if (
        result.buffer instanceof ArrayBuffer
      ) {
        resolve(
          new Blob([result.buffer], {
            type: result.mime || "image/jpeg",
          })
        );
        return;
      }
      if (result instanceof Blob) {
        resolve(result);
        return;
      }
      resolve(null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteMusicCover(
  id: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}