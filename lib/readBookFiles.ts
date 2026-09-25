/**
 * Read 书籍正文存储（IndexedDB）
 *
 * 单独一个 DB，不跟 music / chat 混。
 * TXT 可能是几 MB 的字符串，localStorage 放不下，所以放 IndexedDB。
 */

const DB_NAME = "runwithme_read_db";
const STORE_NAME = "books";
const DB_VERSION = 1;

type BookRecord = {
  text: string;
  savedAt: number;
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

export async function saveBookText(
  id: string,
  text: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record: BookRecord = { text, savedAt: Date.now() };
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

export async function getBookText(
  id: string
): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      db.close();
      const r = req.result;
      if (!r) {
        resolve(null);
        return;
      }
      if (typeof r === "string") {
        resolve(r);
        return;
      }
      if (
        typeof r === "object" &&
        typeof (r as BookRecord).text === "string"
      ) {
        resolve((r as BookRecord).text);
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

export async function deleteBookText(id: string): Promise<void> {
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