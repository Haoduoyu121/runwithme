const DB_NAME = "runwithme_ai_db";
const DB_VERSION = 2;
const STORE = "chats";

export type StoredHighlight = {
  id: string;
  start: number;
  end: number;
  text: string;
  kind: "highlight" | "note";
  note?: string;
  createdAt: number;
};

export type StoredMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  highlights?: StoredHighlight[];
};

type StoredChat = {
  cardId: string;
  messages: StoredMessage[];
  updatedAt: number;
};

function genId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return (
    "m-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

function normalizeMessage(raw: unknown): StoredMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const role = m.role;
  if (
    role !== "system" &&
    role !== "user" &&
    role !== "assistant"
  )
    return null;
  const content = typeof m.content === "string" ? m.content : "";
  const id =
    typeof m.id === "string" && m.id ? m.id : genId();
  const highlights = Array.isArray(m.highlights)
    ? (m.highlights as StoredHighlight[]).filter(
        (h) =>
          h &&
          typeof h.id === "string" &&
          typeof h.start === "number" &&
          typeof h.end === "number" &&
          typeof h.text === "string" &&
          (h.kind === "highlight" || h.kind === "note")
      )
    : [];
  return { id, role, content, highlights };
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
        db.createObjectStore(STORE, { keyPath: "cardId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadChat(
  cardId: string
): Promise<StoredMessage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(cardId);
      req.onsuccess = () => {
        db.close();
        const v = req.result as StoredChat | undefined;
        const raw = v?.messages || [];
        const out: StoredMessage[] = [];
        for (const r of raw) {
          const m = normalizeMessage(r);
          if (m) out.push(m);
        }
        resolve(out);
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

export async function saveChat(
  cardId: string,
  messages: StoredMessage[]
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        cardId,
        messages,
        updatedAt: Date.now(),
      });
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

export async function deleteChat(cardId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(cardId);
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

export function createMessage(
  role: "system" | "user" | "assistant",
  content: string
): StoredMessage {
  return { id: genId(), role, content, highlights: [] };
}

export function newHighlightId(): string {
  return genId();
}