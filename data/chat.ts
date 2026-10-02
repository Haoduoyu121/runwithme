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
  | "forward"
  | "gallery"
  | "redpacket"
  | "avatar-request"
  | "gift";

/* ★ 物流阶段 */
export type DeliveryStage =
  | "placed"       // 已下单
  | "accepted"     // 外卖：商家已接单
  | "shipped"      // 商场：商家已发货
  | "picked"       // 外卖：骑手已取餐
  | "in-transit"   // 商场：运输中
  | "delivering"   // 派送中
  | "delivered"    // 已送达（等待角色接受/拒绝）
  | "signed"       // 已签收（角色接受）
  | "returned";    // 已退回（角色拒绝）

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

  /* ★ 红包数据 */
  redpacket?: {
    amount: number;
    from: ChatSender;
    to: ChatSender;
    claimed: boolean;
    claimedAt?: number;
    note?: string;
  };

  /* ★ 换头像请求 */
  avatarRequest?: {
    from: ChatSender;
    to: ChatSender;
    /** IDB 里的文件 id */
    avatarFileId: string;
    status: "pending" | "accepted" | "rejected";
    resolvedAt?: number;
  };

  /* ★ 礼物 / 外卖 */
  gift?: {
    itemId: string;
    itemName: string;
    itemEmoji: string;
    price: number;
    category: "goods" | "food";
    buyer: ChatSender;
    receiver: ChatSender;
    note?: string;
    status: "pending" | "accepted" | "rejected";
    resolvedAt?: number;

    /* ★ 物流 */
    delivery?: {
      stage: DeliveryStage;
      trackingNo: string;
      history: { stage: DeliveryStage; at: number }[];
      /** 用户给快递/外卖的评价 1~5 */
      rating?: number;
      ratingComment?: string;
      ratedAt?: number;
    };
  };
};

export function createMessageId(): string {
  return `message-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}