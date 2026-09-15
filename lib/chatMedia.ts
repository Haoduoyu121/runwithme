import {
  getImageFile,
} from "@/lib/imageFiles";

import {
  getStickerFile,
} from "@/lib/stickerFiles";

import {
  getVoiceFile,
} from "@/lib/voiceFiles";

import type { ChatMessage } from "@/data/chat";

export type RestoredMedia = {
  messageId: string;
  url: string;
};

export async function restoreMessageMedia(
  messages: ChatMessage[]
): Promise<RestoredMedia[]> {
  const result: RestoredMedia[] = [];

  for (const message of messages) {
    if (
      !message.mediaId ||
      message.mediaUrl ||
      message.deleted ||
      message.recalled
    ) {
      continue;
    }

    let file: Blob | null = null;

    try {
      if (message.type === "image") {
        file = await getImageFile(
          message.mediaId
        );
      }

      if (message.type === "sticker") {
        file = await getStickerFile(
          message.mediaId
        );
      }

      if (message.type === "voice") {
        file = await getVoiceFile(
          message.mediaId
        );
      }

      if (!file) {
        continue;
      }

      result.push({
        messageId: message.id,
        url: URL.createObjectURL(file),
      });
    } catch (error) {
      console.error(
        "恢复聊天媒体失败:",
        message.mediaId,
        error
      );
    }
  }

  return result;
}