export type ChatMessageType =
  | "text"
  | "image"
  | "sticker"
  | "voice"
  | "call"
  | "pat"
  | "system"
  | "textcard";

export type ChatSender = "You" | "Levi" | "Erwin";

export type CallCharacter = "Levi" | "Erwin" | "Both";

export type ChatQuote = {
  messageId: string;
  sender: ChatSender;
  text: string;
};

export type CallStatus =
  | "completed"
  | "no-answer"
  | "rejected"
  | "cancelled"
  | "declined"
  | "missed";

export type CallDirection = "outgoing" | "incoming";

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  type: ChatMessageType;

  text?: string;
  timestamp: number;

  mediaUrl?: string;
  mediaId?: string;
    textCardSnapshot?: {
    author: "Levi" | "Erwin";
    place: string;
    weather: string;
    person: string;
    action: string;
    mood: string;
  };

  duration?: number;

  callDuration?: number;
  callStatus?: CallStatus;
  callDirection?: CallDirection;
  callCharacter?: CallCharacter;

  recalled?: boolean;
  deleted?: boolean;

    quote?: {
    messageId: string;
    sender: ChatSender;
    text: string;
    /** 引用的来源 App（如 "icity"）；E1 阶段仅存储，不跳转 */
    sourceApp?: string;
    /** 引用的来源对象 id */
    sourceId?: string;
  };
};

export function createMessageId(): string {
  return `message-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}