const DB_NAME = "runwithme_tarot_db";
const DB_VERSION = 1;
const STORE = "records";

export type DrawnCard = {
  cardId: string;
  reversed: boolean;
};

export type TarotMode = "today" | "three" | "custom";

export type TarotRecord = {
  id: string;
  ts: number;
  deckId: string;
  mode: TarotMode;
  asker: "" | "levi" | "erwin";
  question: string;
  cards: DrawnCard[];
  aiReading?: string;
};

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "tr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("no window"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listRecords(): Promise<TarotRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        db.close();
        const all = (req.result || []) as TarotRecord[];
        all.sort((a, b) => b.ts - a.ts);
        resolve(all);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export async function addRecord(
  rec: Omit<TarotRecord, "id" | "ts"> & { id?: string; ts?: number }
): Promise<TarotRecord> {
  const full: TarotRecord = {
    id: rec.id || genId(),
    ts: rec.ts || Date.now(),
    deckId: rec.deckId,
    mode: rec.mode,
    asker: rec.asker,
    question: rec.question,
    cards: rec.cards,
    aiReading: rec.aiReading,
  };
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(full);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* ignore */
  }
  return full;
}

export async function updateRecord(
  id: string,
  patch: Partial<TarotRecord>
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const st = tx.objectStore(STORE);
      const g = st.get(id);
      g.onsuccess = () => {
        const cur = g.result as TarotRecord | undefined;
        if (cur) st.put({ ...cur, ...patch, id });
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* ignore */
  }
}

export async function deleteRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* ignore */
  }
}

/* ---------- 抽牌核心 ---------- */

/** Fisher-Yates 洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 从 78 张里随机抽 n 张 */
export function drawRandom<T extends { id: string }>(
  deck: T[],
  n: number
): T[] {
  if (deck.length <= n) return shuffle(deck);
  return shuffle(deck).slice(0, n);
}

/** 正逆位随机（各 50%） */
export function randomReversed(): boolean {
  return Math.random() < 0.5;
}