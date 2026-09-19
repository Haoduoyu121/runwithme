const STORAGE_KEY = "runwithme_read_chat_v1";

export type ReadChatSender = "You" | "Levi" | "Erwin";

export type ReadChatMessage = {
  id: string;
  bookId: string;
  sender: ReadChatSender;
  text: string;
  timestamp: number;
  chapterIndex: number;
  pageIndex: number;
};

type Store = Record<string, ReadChatMessage[]>;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Store;
  } catch (e) {
    console.error("[readChatStorage] 加载失败:", e);
    return {};
  }
}

function saveStore(s: Store): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(s)
    );
    return true;
  } catch (e) {
    console.error("[readChatStorage] 保存失败:", e);
    return false;
  }
}

export function createReadChatMessageId(): string {
  return `rc-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function loadReadChat(
  bookId: string
): ReadChatMessage[] {
  const store = loadStore();
  return store[bookId] ?? [];
}

export function addReadChatMessage(
  msg: ReadChatMessage
): ReadChatMessage[] {
  const store = loadStore();
  const list = store[msg.bookId] ?? [];
  const next = [...list, msg];
  store[msg.bookId] = next;
  saveStore(store);
  return next;
}

export function clearReadChat(bookId: string): void {
  const store = loadStore();
  if (!store[bookId]) return;
  delete store[bookId];
  saveStore(store);
}