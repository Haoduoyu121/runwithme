export type ThreadId = "group" | "levi" | "erwin";

export type ChatMessageType =
  | "text"
  | "image"
  | "sticker"
  | "voice"
  | "call"
  | "pat"
  | "system"
  | "textcard"
  | "forward";

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

/* ★ 被转发的单条消息（只支持 text / pat） */
export type ForwardItem = {
  sender: ChatSender;
  type: "text" | "pat";
  text: string;
  timestamp: number;
};

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

  /* ★ 转发的消息内容 */
  forwardItems?: ForwardItem[];
  /* ★ 从哪个 thread 转发的（来源），目前用于显示 / 未来跳转 */
  forwardFrom?: ThreadId;

  /* ★ 是否由"自由造句"生成 */
  sentence?: boolean;
};

export function createMessageId(): string {
  return `message-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}