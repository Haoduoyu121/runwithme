import type { AppId } from "@/lib/systemStorage";
import { getLastRead, markAppRead } from "./unreadStorage";

/* =========================================================
   Chat 未读
   ========================================================= */

function getChatUnread(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      "runwithme_chat_messages"
    );
    if (!raw) return 0;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return 0;

    const lastRead = getLastRead("chat");

    return list.filter(
      (m: {
        sender?: string;
        timestamp?: number;
        deleted?: boolean;
      }) =>
        m.sender &&
        m.sender !== "You" &&
        !m.deleted &&
        typeof m.timestamp === "number" &&
        m.timestamp > lastRead
    ).length;
  } catch {
    return 0;
  }
}

/* =========================================================
   iCity 未读 —— 读 notifications 里 !read
   ========================================================= */

function getICityUnread(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      "runwithme_icity_notifications"
    );
    if (!raw) return 0;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return 0;
    return list.filter(
      (n: { read?: boolean }) => !n.read
    ).length;
  } catch {
    return 0;
  }
}

/* =========================================================
   Letter 未读 —— 读 letters 里 isUnread
   ========================================================= */

function getLetterUnread(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      "runwithme_letters"
    );
    if (!raw) return 0;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return 0;
    return list.filter(
      (l: { isUnread?: boolean }) => l.isUnread
    ).length;
  } catch {
    return 0;
  }
}

/* =========================================================
   Fridge 未读 —— 按时间戳（系统贴的）
   ========================================================= */

function getFridgeUnread(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      "runwithme_fridge_door_items_v1"
    );
    if (!raw) return 0;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return 0;

    const lastRead = getLastRead("fridge");

    return list.filter(
      (i: { owner?: string; createdAt?: number }) =>
        i.owner &&
        i.owner !== "user" &&
        typeof i.createdAt === "number" &&
        i.createdAt > lastRead
    ).length;
  } catch {
    return 0;
  }
}

/* =========================================================
   对外
   ========================================================= */

export function getAppUnreadCount(appId: AppId): number {
  switch (appId) {
    case "chat":
      return getChatUnread();
    case "icity":
      return getICityUnread();
    case "letter":
      return getLetterUnread();
    case "fridge":
      return getFridgeUnread();
    default:
      return 0;
  }
}

/**
 * 进入 App 时调用。清空该 App 的未读。
 * - chat / fridge：记录时间戳
 * - icity / letter：还要把每条 read/isUnread 清掉
 */
export function markAppAllRead(appId: AppId): void {
  markAppRead(appId);

  if (typeof window === "undefined") return;

  if (appId === "icity") {
    try {
      const raw = window.localStorage.getItem(
        "runwithme_icity_notifications"
      );
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const next = list.map((n) =>
        n && typeof n === "object"
          ? { ...n, read: true }
          : n
      );
      window.localStorage.setItem(
        "runwithme_icity_notifications",
        JSON.stringify(next)
      );
    } catch (e) {
      console.error("[unreadRegistry] 清 iCity 未读失败:", e);
    }
  }

  if (appId === "letter") {
    try {
      const raw = window.localStorage.getItem(
        "runwithme_letters"
      );
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const next = list.map((l) =>
        l && typeof l === "object"
          ? { ...l, isUnread: false }
          : l
      );
      window.localStorage.setItem(
        "runwithme_letters",
        JSON.stringify(next)
      );
    } catch (e) {
      console.error(
        "[unreadRegistry] 清 Letter 未读失败:",
        e
      );
    }
  }
}