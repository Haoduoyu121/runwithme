// lib/neteaseApi.ts
// 所有网易云 fetch 封装，统一走 api.yulewin.cn/api/netease/*

const BASE =
  process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE}/api/netease`
    : "https://api.yulewin.cn/api/netease";

async function getJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
      });
      if (!res.ok) {
        throw new Error(`netease api ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      /* 网络层错误 → 等 300ms 重试；HTTP 错误 → 直接抛 */
      if (
        e instanceof Error &&
        e.message.startsWith("netease api ")
      ) {
        throw e;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("netease fetch failed");
}

/* ---------- 扫码登录 ---------- */

export async function fetchQrKey(): Promise<string> {
  const ts = Date.now();
  const json = await getJson<{ data: { unikey: string } }>(
    `/login/qr/key?timestamp=${ts}`
  );
  return json.data.unikey;
}

export async function fetchQrImage(key: string): Promise<string> {
  const ts = Date.now();
  const json = await getJson<{ data: { qrimg: string } }>(
    `/login/qr/create?key=${encodeURIComponent(
      key
    )}&qrimg=true&timestamp=${ts}`
  );
  return json.data.qrimg;
}

export type QrCheckCode = 800 | 801 | 802 | 803;

export interface QrCheckResult {
  code: QrCheckCode;
  cookie?: string;
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
}

export async function checkQr(
  key: string,
  cookie?: string
): Promise<QrCheckResult> {
  const ts = Date.now();
  const c =
    cookie && cookie.length > 0
      ? `&cookie=${encodeURIComponent(cookie)}`
      : "";
  const json = await getJson<any>(
    `/login/qr/check?key=${encodeURIComponent(
      key
    )}&timestamp=${ts}${c}`
  );
  return {
    code: json.code,
    cookie: json.cookie,
    userId: json.account?.id ?? json.profile?.userId ?? json.userId,
    nickname: json.profile?.nickname ?? json.nickname,
    avatarUrl: json.profile?.avatarUrl ?? json.avatarUrl,
  };
}

/* ---------- 搜索 ---------- */

export interface NeteaseSong {
  id: number;
  name: string;
  artists: string; // "周杰伦 / 方文山" 形式
  album: string;
  cover: string;
  duration: number; // 毫秒
}

export async function searchSongs(
  keywords: string,
  cookie: string,
  limit = 20
): Promise<NeteaseSong[]> {
  const json = await getJson<any>(
    `/cloudsearch?keywords=${encodeURIComponent(
      keywords
    )}&limit=${limit}&cookie=${encodeURIComponent(cookie)}`
  );
  const songs: any[] = json?.result?.songs ?? [];
  return songs.map((s) => ({
    id: s.id,
    name: s.name,
    artists: (s.ar ?? []).map((a: any) => a.name).join(" / "),
    album: s.al?.name ?? "",
    cover: s.al?.picUrl ?? "",
    duration: s.dt ?? 0,
  }));
}

/* ---------- 播放 ---------- */

/** 返回可播放 URL；null 表示无版权 / 需 VIP / 登录过期 */
export async function fetchSongUrl(
  id: number,
  cookie: string
): Promise<string | null> {
  const json = await getJson<any>(
    `/song/url?id=${id}&cookie=${encodeURIComponent(cookie)}`
  );
  const url = json?.data?.[0]?.url;
  return url || null;
}

/* ---------- 歌词（M4-d 会用，先放着） ---------- */

export async function fetchLyric(id: number): Promise<string> {
  const json = await getJson<{ lrc?: { lyric?: string } }>(
    `/lyric?id=${id}`
  );
  return json?.lrc?.lyric ?? "";
}

/* ---------- 歌单（M4-c 会用，先放着） ---------- */

export interface NeteasePlaylist {
  id: number;
  name: string;
  cover: string;
  trackCount: number;
}

export async function fetchUserPlaylists(
  uid: number,
  cookie: string
): Promise<NeteasePlaylist[]> {
  const json = await getJson<any>(
    `/user/playlist?uid=${uid}&cookie=${encodeURIComponent(cookie)}`
  );
  const list: any[] = json?.playlist ?? [];
  return list.map((p) => ({
    id: p.id,
    name: p.name,
    cover: p.coverImgUrl ?? "",
    trackCount: p.trackCount ?? 0,
  }));
}