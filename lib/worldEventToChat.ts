import type { WorldEvent } from "@/data/worldEvents";
import type { ChatMessage } from "@/data/chat";
import { createMessageId } from "@/data/chat";

export type ConvertResult = {
  immediate: ChatMessage[];
  quoteCandidate: WorldEvent | null;
};

export function convertWorldEvent(
  ev: WorldEvent
): ConvertResult {
  const immediate: ChatMessage[] = [];
  let quoteCandidate: WorldEvent | null = null;

  /* ---------- watch ---------- */
  if (ev.app === "watch" && ev.type === "session-end") {
    immediate.push({
      id: createMessageId(),
      sender: "You",
      type: "system",
      text: ev.title,
      timestamp: ev.timestamp,
    });
    return { immediate, quoteCandidate: null };
  }

  /* ---------- music ---------- */
  if (
    ev.app === "music" &&
    (ev.type === "invite-accepted" ||
      ev.type === "track-change")
  ) {
    immediate.push({
      id: createMessageId(),
      sender: "You",
      type: "system",
      text: ev.title,
      timestamp: ev.timestamp,
    });
    return { immediate, quoteCandidate: null };
  }

  /* ---------- icity ---------- */
  if (ev.app !== "icity") {
    return { immediate, quoteCandidate: null };
  }

  const actorLabel = ev.actor === "You" ? "你" : ev.actor;

  if (ev.type === "post") {
    if (ev.actor === "You") {
      immediate.push({
        id: createMessageId(),
        sender: "You",
        type: "system",
        text: `你在 iCity 发布了新动态`,
        timestamp: ev.timestamp,
      });
    } else {
      immediate.push({
        id: createMessageId(),
        sender: "You",
        type: "system",
        text: `${ev.actor} 在 iCity 发了新动态`,
        timestamp: ev.timestamp,
      });
    }
    quoteCandidate = ev;
    return { immediate, quoteCandidate };
  }

  if (ev.type === "like") {
    immediate.push({
      id: createMessageId(),
      sender: "You",
      type: "system",
      text:
        ev.actor === "You"
          ? `你赞了一条动态`
          : `${actorLabel} 赞了你的帖子`,
      timestamp: ev.timestamp,
    });
    return { immediate, quoteCandidate: null };
  }

  if (ev.type === "comment") {
    immediate.push({
      id: createMessageId(),
      sender: "You",
      type: "system",
      text:
        ev.actor === "You"
          ? `你评论了一条动态`
          : `${actorLabel} 评论了你的帖子`,
      timestamp: ev.timestamp,
    });
    quoteCandidate = ev;
    return { immediate, quoteCandidate };
  }

  return { immediate, quoteCandidate: null };
}