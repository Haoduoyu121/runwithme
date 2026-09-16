export type ICityAuthor = "Yui" | "Levi" | "Erwin";

export type ICityProfile = {
  name: string;
  handle: string;
};

export type ICityProfiles = Record<
  ICityAuthor,
  ICityProfile
>;

export const DEFAULT_PROFILES: ICityProfiles = {
  Yui: { name: "Yui", handle: "yui" },
  Levi: { name: "Levi", handle: "levi" },
  Erwin: { name: "Erwin", handle: "erwin" },
};

export type ICityPost = {
  id: string;
  author: ICityAuthor;
  text: string;
  timestamp: number;
  likes: ICityAuthor[];
  /* 帖子配图在 IndexedDB 里的 key 列表（最多 2 张） */
  imageIds?: string[];
};

export type ICityComment = {
  id: string;
  postId: string;
  author: ICityAuthor;
  text: string;
  timestamp: number;
  replyToCommentId?: string;
};

export function createPostId(): string {
  return `post-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createCommentId(): string {
  return `comment-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour)
    return `${Math.floor(diff / minute)} min`;
  if (diff < day)
    return `${Math.floor(diff / hour)} h`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day)
    return `${Math.floor(diff / day)} d`;

  return new Date(timestamp).toLocaleDateString(
    "zh-CN",
    { month: "short", day: "numeric" }
  );
}

export function formatFullTime(
  timestamp: number
): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getAuthorDisplay(
  author: ICityAuthor,
  profiles?: ICityProfiles
): {
  name: string;
  handle: string;
  initial: string;
  colorClass: string;
} {
  const p = profiles ?? DEFAULT_PROFILES;
  const name = p[author]?.name || author;
  const handle = p[author]?.handle || "";

  const initial =
    name.trim().charAt(0).toUpperCase() ||
    author.charAt(0);

  const colorClass =
    author === "Yui"
      ? "icity-avatar-you"
      : author === "Levi"
        ? "icity-avatar-levi"
        : "icity-avatar-erwin";

  return { name, handle, initial, colorClass };
}
/* =========================================================
   iCity 通知
   ========================================================= */

export type ICityNotificationType = "like" | "comment";

export type ICityNotification = {
  id: string;
  type: ICityNotificationType;
  from: "Levi" | "Erwin";
  postId: string;
  postPreview: string;
  commentText?: string;
  createdAt: number;
  read: boolean;
};