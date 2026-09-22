/* RunWithme 跨设备同步 - API 封装 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

const TOKEN_KEY = "runwithme_sync_token_v1";
const EXP_KEY = "runwithme_sync_token_exp_v1";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  const t = localStorage.getItem(TOKEN_KEY);
  const exp = parseInt(localStorage.getItem(EXP_KEY) || "0", 10);
  if (!t) return "";
  if (exp && exp < Date.now()) {
    clearToken();
    return "";
  }
  return t;
}

export function setToken(token: string, exp: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXP_KEY, String(exp));
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXP_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function login(
  user: string,
  pass: string
): Promise<{ token: string; exp: number }> {
  return request("/api/sync/login", {
    method: "POST",
    body: JSON.stringify({ user, pass }),
  });
}

export type RemoteItems = Record<
  string,
  { value: string; updatedAt: number }
>;

export async function fetchAll(
  since = 0
): Promise<{ items: RemoteItems; serverTime: number }> {
  return request(`/api/sync/all?since=${since}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
}

export async function pushAll(
  items: RemoteItems
): Promise<{ ok: boolean; accepted: number; rejected: number }> {
  return request("/api/sync/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ items }),
  });
}
