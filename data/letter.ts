export type LetterSender = "You" | "Levi" | "Erwin";

export type Letter = {
  id: string;
  from: LetterSender;
  to: LetterSender;
  subject: string;
  body: string;
  createdAt: number;
  read: boolean;
  replyToId?: string;
};

export type PendingLetter = {
  id: string;
  from: "Levi" | "Erwin";
  to: "You";
  dueAt: number;
  kind: "reply" | "spontaneous";
  replyToId?: string;
};

export function createLetterId(): string {
  return `letter-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function formatLetterDate(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}年${
    d.getMonth() + 1
  }月${d.getDate()}日`;
}

export function formatLetterDateTime(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function formatRelative(t: number): string {
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}