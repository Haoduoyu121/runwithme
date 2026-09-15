import type { ChatMessage } from "@/data/chat";

const CHAT_STORAGE_KEY = "runwithme_chat_messages";

export function loadMessages(
  defaultMessages: ChatMessage[]
): ChatMessage[] {
  if (typeof window === "undefined") {
    return defaultMessages;
  }

  const saved = window.localStorage.getItem(
    CHAT_STORAGE_KEY
  );

  if (!saved) {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(defaultMessages)
    );

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

export function saveMessages(
  messages: ChatMessage[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  /*
   * mediaUrl 是 URL.createObjectURL() 产生的临时地址，
   * 不能作为聊天记录的永久数据保存。
   *
   * 真正需要保存的是 mediaId。
   *
   * 这样重新进入 Chat 后，
   * ChatApp 可以根据 mediaId 从 IndexedDB
   * 重新获取文件并生成新的 Blob URL。
   */
  const persistentMessages = messages.map(
    (message): ChatMessage => {
      if (!message.mediaUrl) {
        return message;
      }

      const { mediaUrl, ...messageWithoutUrl } = message;

      return messageWithoutUrl;
    }
  );

  window.localStorage.setItem(
    CHAT_STORAGE_KEY,
    JSON.stringify(persistentMessages)
  );
}

export function clearSavedMessages(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    CHAT_STORAGE_KEY
  );
}