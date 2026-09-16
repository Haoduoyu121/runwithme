const STORAGE_KEY = "runwithme_music_chat_messages";

export type MusicChatMessage = {
  id: string;
  sender: "You" | "Levi" | "Erwin";
  type: "text";
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
    return parsed;
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