"use client";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
  type ThreadId,
} from "@/data/chat";

import {
  saveChatFile,
  getChatFile,
  deleteChatFile,
} from "@/lib/chatFiles";

import {
  loadAvatarLibraryByOwner,
} from "@/lib/avatarLibraryStorage";

import {
  getAvatarLibraryFile,
} from "@/lib/avatarLibraryFiles";

import { writeAvatar } from "@/lib/avatarSwitcher";
import { loadSystemSettings } from "@/lib/systemStorage";

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

const ACCEPT_LINES = ["好，我换了", "行，就用这个吧", "嗯，换了"];
const REJECT_LINES = ["不想换头像哦", "现在不想换", "这个不太合适"];

function pickLine(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/* =========================================================
   用户主动请求角色换头像
   ========================================================= */

export async function sendAvatarRequestFromUser(params: {
  owner: "Levi" | "Erwin";
  blob: Blob;
  threadId: ThreadId;
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
}): Promise<void> {
  const {
    owner,
    blob,
    threadId,
    addMessage,
    updateThreadMessages,
  } = params;

  const cfg = loadSystemSettings().avatarSwitch;
  if (!cfg.requestEnabled) {
    window.alert("换头像请求已被关闭");
    return;
  }

  const messageId = createMessageId();
  const avatarFileId = `avatar-req-${messageId}`;

  await saveChatFile(avatarFileId, blob);

  addMessage(
    {
      id: messageId,
      sender: "You",
      type: "avatar-request",
      timestamp: Date.now(),
      avatarRequest: {
        from: "You",
        to: owner as ChatSender,
        avatarFileId,
        status: "pending",
      },
    },
    { threadId }
  );

  /* 延迟 → 角色决定 */
  const minMs = cfg.requestDelayMin * 1000;
  const maxMs = cfg.requestDelayMax * 1000;
  const delay = randomInt(minMs, maxMs);

  window.setTimeout(async () => {
    const cfgNow = loadSystemSettings().avatarSwitch;
    if (!cfgNow.requestEnabled) return;

    const accepted = Math.random() < cfgNow.requestChance;

    const reqBlob = await getChatFile(avatarFileId);
    if (!reqBlob) return;

    if (accepted) {
      const ok = await writeAvatar("chat", owner, reqBlob);
      if (!ok) return;

      updateThreadMessages(threadId, (prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.avatarRequest) return m;
          return {
            ...m,
            avatarRequest: {
              ...m.avatarRequest,
              status: "accepted",
              resolvedAt: Date.now(),
            },
          };
        })
      );

      addMessage(
        {
          id: createMessageId(),
          sender: owner as ChatSender,
          type: "text",
          text: pickLine(ACCEPT_LINES),
          timestamp: Date.now(),
        },
        { threadId }
      );

      /* ★ 回礼：角色接受后，偶尔反过来请求用户换头像 */
      const giftBackChance =
        loadSystemSettings().avatarSwitch.giftBackChance ?? 0.2;
      if (Math.random() < giftBackChance) {
        const giftDelay = randomInt(3000, 12000);
        window.setTimeout(async () => {
          try {
            await sendAvatarRequestFromRole({
              owner,
              threadId,
              addMessage,
            });
          } catch (e) {
            console.error("角色回礼请求失败:", e);
          }
        }, giftDelay);
      }
    } else {
      updateThreadMessages(threadId, (prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.avatarRequest) return m;
          return {
            ...m,
            avatarRequest: {
              ...m.avatarRequest,
              status: "rejected",
              resolvedAt: Date.now(),
            },
          };
        })
      );

      addMessage(
        {
          id: createMessageId(),
          sender: owner as ChatSender,
          type: "text",
          text: pickLine(REJECT_LINES),
          timestamp: Date.now(),
        },
        { threadId }
      );
    }
  }, delay);
}

/* =========================================================
   角色主动请求用户换头像（从用户头像库随机抽）
   ========================================================= */

export async function sendAvatarRequestFromRole(params: {
  owner: "Levi" | "Erwin";
  threadId: ThreadId;
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
}): Promise<boolean> {
  const { owner, threadId, addMessage } = params;

  const pool = loadAvatarLibraryByOwner("You", "chat").filter(
    (a) => a.enabled
  );
  if (pool.length === 0) return false;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  const blob = await getAvatarLibraryFile(pick.id);
  if (!blob) return false;

  const messageId = createMessageId();
  const avatarFileId = `avatar-req-${messageId}`;

  await saveChatFile(avatarFileId, blob);

  addMessage(
    {
      id: messageId,
      sender: owner as ChatSender,
      type: "avatar-request",
      timestamp: Date.now(),
      avatarRequest: {
        from: owner as ChatSender,
        to: "You",
        avatarFileId,
        status: "pending",
      },
    },
    { threadId }
  );

  return true;
}

/* =========================================================
   用户接受 / 拒绝角色的换头像请求
   ========================================================= */

export async function resolveAvatarRequestAsUser(params: {
  messageId: string;
  accepted: boolean;
  threadId: ThreadId;
  addMessage: (
    msg: ChatMessage,
    options?: { threadId?: ThreadId }
  ) => void;
  updateThreadMessages: (
    threadId: ThreadId,
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
}): Promise<void> {
  const {
    messageId,
    accepted,
    threadId,
    addMessage,
    updateThreadMessages,
  } = params;

  /* 从消息里读 blob */
  const threadsBlob = await import("@/lib/chatFiles");
  /* 上面的 import 会重复——直接用已经 import 的 */

  updateThreadMessages(threadId, (prev) => {
    const msg = prev.find((m) => m.id === messageId);
    if (!msg?.avatarRequest) return prev;
    if (msg.avatarRequest.status !== "pending") return prev;

    /* 异步写头像 */
    if (accepted) {
      void (async () => {
        const blob = await getChatFile(
          msg.avatarRequest!.avatarFileId
        );
        if (blob) {
          await writeAvatar("chat", "You", blob);
        }
      })();
    }

    return prev.map((m) => {
      if (m.id !== messageId || !m.avatarRequest) return m;
      return {
        ...m,
        avatarRequest: {
          ...m.avatarRequest,
          status: accepted ? "accepted" : "rejected",
          resolvedAt: Date.now(),
        },
      };
    });
  });

  /* 用户回一条气泡 */
  const threads = await import("@/lib/chatStorage");
  /* 不查消息了，直接发 */
  addMessage(
    {
      id: createMessageId(),
      sender: "You",
      type: "text",
      text: accepted ? "好，我换了" : "不想换头像哦",
      timestamp: Date.now(),
    },
    { threadId }
  );
}

/* =========================================================
   清理：删除消息时删掉 IDB 里的头像文件
   ========================================================= */

export async function cleanupAvatarRequestFile(
  avatarFileId: string
): Promise<void> {
  try {
    await deleteChatFile(avatarFileId);
  } catch {
    /* ignore */
  }
}