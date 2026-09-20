const STORAGE_KEY = "runwithme_music_chat_messages";

export type MusicChatMessage = {
  id: string;
  sender: "You" | "Levi" | "Erwin" | "System";
  type: "text" | "system";
  text: string;
  timestamp: number;
};

export function loadMusicChatMessages(): MusicChatMessage[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          typeof m.id === "string" &&
          typeof m.text === "string" &&
          typeof m.timestamp === "number"
      )
      .map(
        (m): MusicChatMessage => ({
          id: m.id,
          sender:
            m.sender === "You" ||
            m.sender === "Levi" ||
            m.sender === "Erwin" ||
            m.sender === "System"
              ? m.sender
              : "You",
          type: m.type === "system" ? "system" : "text",
          text: m.text,
          timestamp: m.timestamp,
        })
      );
  } catch {
    return [];
  }
}

export function saveMusicChatMessages(
  msgs: MusicChatMessage[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(msgs)
  );
}

export function clearMusicChatMessages(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}