import type {
  CharacterCard,
  Character,
} from "@/data/cards";

import type { ChatMessage } from "@/data/chat";

import { getStickerFile } from "@/lib/stickerFiles";
import { getVoiceFile } from "@/lib/voiceFiles";

export type ReplyMediaUrl = {
  messageId: string;
  url: string;
};

export type CreateReplyResult = {
  message: ChatMessage | null;
  mediaUrl: ReplyMediaUrl | null;
};

export async function createReplyMessage(
  card: CharacterCard,
  sender: Character,
  textOverride?: string
): Promise<CreateReplyResult> {
  const messageId = `message-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  const text = textOverride ?? card.text;

  /* 拍一拍 */
  if (card.type === "pat") {
    return {
      message: {
        id: messageId,
        sender,
        type: "pat",
        text,
        timestamp: Date.now(),
      },
      mediaUrl: null,
    };
  }

  /* 文本 */
  if (card.type === "text") {
    return {
      message: {
        id: messageId,
        sender,
        type: "text",
        text,
        timestamp: Date.now(),
      },
      mediaUrl: null,
    };
  }

  /* 语音 / 表情包 */
  if (!card.mediaId) {
    console.warn(
      `Character Card ${card.id} 没有 mediaId`
    );
    return { message: null, mediaUrl: null };
  }

  if (card.type === "voice") {
    const file = await getVoiceFile(card.mediaId);
    if (!file) {
      console.warn(`找不到语音: ${card.mediaId}`);
      return { message: null, mediaUrl: null };
    }

    const url = URL.createObjectURL(file);

    return {
      message: {
        id: messageId,
        sender,
        type: "voice",
        text: card.text,
        mediaId: card.mediaId,
        mediaUrl: url,
        timestamp: Date.now(),
      },
      mediaUrl: { messageId, url },
    };
  }

  if (card.type === "sticker") {
    const file = await getStickerFile(card.mediaId);
    if (!file) {
      console.warn(`找不到表情包: ${card.mediaId}`);
      return { message: null, mediaUrl: null };
    }

    const url = URL.createObjectURL(file);

    return {
      message: {
        id: messageId,
        sender,
        type: "sticker",
        text: card.text,
        mediaId: card.mediaId,
        mediaUrl: url,
        timestamp: Date.now(),
      },
      mediaUrl: { messageId, url },
    };
  }

  return { message: null, mediaUrl: null };
}