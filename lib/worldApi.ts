const API_BASE = "https://api.yulewin.cn";

export type WorldEventType =
  | "post"
  | "letter"
  | "highlight"
  | "music_invite";

export type WorldEvent = {
  id: number;
  type: WorldEventType;
  character: "levi" | "erwin" | "both";
  content: Record<string, unknown>;
  createdAt: number;
  readAt: number | null;
};

export async function fetchWorldEvents(
  limit = 20
): Promise<{ events: WorldEvent[]; unread: number }> {
  const res = await fetch(
    `${API_BASE}/api/events?limit=${limit}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function markWorldEventRead(
  id: number
): Promise<void> {
  await fetch(`${API_BASE}/api/events/${id}/read`, {
    method: "POST",
  });
}

export async function triggerWorldEvent(): Promise<void> {
  await fetch(`${API_BASE}/api/events/trigger`, {
    method: "POST",
  });
}

/* ---------- 展示用工具 ---------- */

export function eventHeadline(e: WorldEvent): string {
  const who =
    e.character === "levi"
      ? "Levi"
      : e.character === "erwin"
        ? "Erwin"
        : "他们";

  switch (e.type) {
    case "post":
      return `${who} 发了条动态`;
    case "letter":
      return `${who} 写了封信`;
    case "highlight":
      return `${who} 在书里划了线`;
    case "music_invite":
      return `${who} 想听首歌`;
    default:
      return `${who} 留下了什么`;
  }
}

export function eventPreview(e: WorldEvent): string {
  const c = e.content || {};
  if (typeof c.text === "string") return c.text;
  if (typeof c.body === "string") return c.body;
  if (typeof c.subject === "string")
    return c.subject;
  return "";
}

export function eventTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}