/* 换了个新 DB 名，避开历史遗留的坏库 */
const DB_NAME = "runwithme_voice_db_v2";
const STORE_NAME = "voice_files";
const DB_VERSION = 1;

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

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveVoiceFile(
  id: string,
  file: Blob
): Promise<void> {
  const buffer = await file.arrayBuffer();

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.put(buffer, id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getVoiceFile(
  id: string
): Promise<Blob | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      db.close();

      const result = request.result;

      if (!result) {
        resolve(null);
        return;
      }

      if (result instanceof Blob) {
        resolve(result);
        return;
      }

      if (result instanceof ArrayBuffer) {
        resolve(
          new Blob([result], {
            type: "audio/mpeg",
          })
        );
        return;
      }

      resolve(null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteVoiceFile(
  id: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function clearVoiceFiles(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}