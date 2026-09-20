// lib/neteaseSession.ts
// 网易云登录态存取（独立 storage key）

export interface NeteaseSession {
  cookie: string;
  userId: number;
  nickname: string;
  avatarUrl: string;
  savedAt: number;
}

const KEY = "runwithme_netease_session_v1";

export function getNeteaseSession(): NeteaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NeteaseSession;
    if (!parsed || !parsed.cookie) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveNeteaseSession(
  session: Omit<NeteaseSession, "savedAt">
): NeteaseSession {
  const full: NeteaseSession = { ...session, savedAt: Date.now() };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(full));
  }
  return full;
}

export function clearNeteaseSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
}

export function isNeteaseLoggedIn(): boolean {
  return getNeteaseSession() !== null;
}