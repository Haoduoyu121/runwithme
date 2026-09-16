const DB_NAME = "runwithme_voice_db_v2";
const STORE_NAME = "voice_files";
const DB_VERSION = 1;

type VoiceRecord = {
  buffer: ArrayBuffer;
  mime: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVoiceFile(
  id: string,
  file: Blob
): Promise<void> {
  /* ★ 关键：同时保存 mimeType，避免 m4a/wav 被当成 mp3 解码 */
  const buffer = await file.arrayBuffer();
  const mime = file.type || "audio/mpeg";

  const record: VoiceRecord = { buffer, mime };

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      STORE_NAME,
      "readwrite"
    );
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

export async function getVoiceFile(
  id: string
): Promise<Blob | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      STORE_NAME,
      "readonly"
    );
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => {
      db.close();
      const result = req.result;

      if (!result) {
        resolve(null);
        return;
      }

      /* 新格式：{ buffer, mime } */
      if (
        result.buffer instanceof ArrayBuffer
      ) {
        resolve(
          new Blob([result.buffer], {
            type: result.mime || "audio/mpeg",
          })
        );
        return;
      }

      /* 兼容旧的 ArrayBuffer */
      if (result instanceof ArrayBuffer) {
        resolve(
          new Blob([result], {
            type: "audio/mpeg",
          })
        );
        return;
      }

      /* 兼容更早的 Blob */
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

export async function deleteVoiceFile(
  id: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      STORE_NAME,
      "readwrite"
    );
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

export async function clearVoiceFiles(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      STORE_NAME,
      "readwrite"
    );
    const store = tx.objectStore(STORE_NAME);

    store.clear();

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