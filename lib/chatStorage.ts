import type { ChatMessage, ThreadId } from "@/data/chat";

const KEYS: Record<ThreadId, string> = {
  group: "runwithme_chat_messages",
  levi: "runwithme_chat_messages_levi",
  erwin: "runwithme_chat_messages_erwin",
};

export function loadThreadMessages(
  threadId: ThreadId,
  defaultMessages: ChatMessage[]
): ChatMessage[] {
  if (typeof window === "undefined") {
    return defaultMessages;
  }

  const key = KEYS[threadId];
  const saved = window.localStorage.getItem(key);

  if (!saved) {
    if (defaultMessages.length > 0) {
      window.localStorage.setItem(
        key,
        JSON.stringify(defaultMessages)
      );
    }
    return defaultMessages;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return defaultMessages;
    }
    return parsed;
  } catch {
    return defaultMessages;
  }
}

export function saveThreadMessages(
  threadId: ThreadId,
  messages: ChatMessage[]
): void {
  if (typeof window === "undefined") return;

  /*
   * mediaUrl 是 URL.createObjectURL() 产生的临时地址，
   * 不能作为聊天记录的永久数据保存。
   * 真正需要保存的是 mediaId。
   */
  const persistentMessages = messages.map(
    (message): ChatMessage => {
      if (!message.mediaUrl) return message;
      const { mediaUrl, ...rest } = message;
      return rest;
    }
  );

  window.localStorage.setItem(
    KEYS[threadId],
    JSON.stringify(persistentMessages)
  );
}

export function clearThreadMessages(
  threadId: ThreadId
): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEYS[threadId]);
}

/* ---------- 旧 API 兼容（默认操作 group） ---------- */

export function loadMessages(
  defaultMessages: ChatMessage[]
): ChatMessage[] {
  return loadThreadMessages("group", defaultMessages);
}

export function saveMessages(
  messages: ChatMessage[]
): void {
  saveThreadMessages("group", messages);
}

export function clearSavedMessages(): void {
  clearThreadMessages("group");
}