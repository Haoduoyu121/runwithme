const DB_NAME = "runwithme_voice_db_v2";
const STORE_NAME = "voice_files";
const DB_VERSION = 1;

type VoiceRecord = {
  buffer: ArrayBuffer;
  mime: string;
};

/* 从字节头猜 mime，万无一失 */
function guessMime(buffer: ArrayBuffer): string {
  const b = new Uint8Array(
    buffer.slice(0, Math.min(16, buffer.byteLength))
  );

  /* MP3: ID3 或 frame sync */
  if (
    (b[0] === 0x49 &&
      b[1] === 0x44 &&
      b[2] === 0x33) ||
    (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)
  ) {
    return "audio/mpeg";
  }

  /* M4A / MP4: 第 4 字节起是 "ftyp" */
  if (
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70
  ) {
    return "audio/mp4";
  }

  /* WAV: "RIFF" */
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46
  ) {
    return "audio/wav";
  }

  /* OGG: "OggS" */
  if (
    b[0] === 0x4f &&
    b[1] === 0x67 &&
    b[2] === 0x67 &&
    b[3] === 0x53
  ) {
    return "audio/ogg";
  }

  /* 兜底 */
  return "audio/mpeg";
}

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
  /* 立即把字节读进内存，防止 iOS 提前释放 */
  const buffer = await file.arrayBuffer();

  /* 如果 file.type 为空，从字节头猜 */
  const mime = file.type || guessMime(buffer);

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
        const buf: ArrayBuffer = result.buffer;

        /* ★ 关键：即使存的 mime 是错的，也从字节头重猜一次 */
        const guessed = guessMime(buf);
        const stored = result.mime as
          | string
          | undefined;

        /* 如果存的 mime 是空或 "audio/mpeg" 但实际是 mp4，用猜的 */
        const mime =
          !stored ||
          (stored === "audio/mpeg" &&
            guessed !== "audio/mpeg")
            ? guessed
            : stored;

        resolve(new Blob([buf], { type: mime }));
        return;
      }

      /* 兼容旧的纯 ArrayBuffer */
      if (result instanceof ArrayBuffer) {
        const buf: ArrayBuffer = result;
        resolve(
          new Blob([buf], {
            type: guessMime(buf),
          })
        );
        return;
      }

      /* 兼容旧的 Blob */
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