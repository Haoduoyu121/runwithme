// lib/neteaseApi.ts

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

/* ---------- 登录状态 ---------- */

export interface NeteaseLoginStatus {
  userId: number;
  nickname: string;
  avatarUrl: string;
}

export async function fetchLoginStatus(
  cookie: string
): Promise<NeteaseLoginStatus | null> {
  try {
    const ts = Date.now();
    const json = await getJson<any>(
      `/login/status?cookie=${encodeURIComponent(
        cookie
      )}&timestamp=${ts}`
    );
    const profile = json?.data?.profile;
    if (!profile?.userId) return null;
    return {
      userId: profile.userId,
      nickname: profile.nickname ?? "网易云用户",
      avatarUrl: profile.avatarUrl ?? "",
    };
  } catch {
    return null;
  }
}

/* ---------- 搜索 ---------- */

export interface NeteaseSong {
  id: number;
  name: string;
  artists: string;
  album: string;
  cover: string;
  duration: number;
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

/* ---------- 歌词 ---------- */

export async function fetchLyric(id: number): Promise<string> {
  const json = await getJson<{ lrc?: { lyric?: string } }>(
    `/lyric?id=${id}`
  );
  return json?.lrc?.lyric ?? "";
}

/* ---------- 歌单 ---------- */

export interface NeteasePlaylist {
  id: number;
  name: string;
  cover: string;
  trackCount: number;
  creator: string;
  isMine: boolean;
  isLiked: boolean;
}

export async function fetchUserPlaylists(
  uid: number,
  cookie: string
): Promise<NeteasePlaylist[]> {
  const json = await getJson<any>(
    `/user/playlist?uid=${uid}&cookie=${encodeURIComponent(
      cookie
    )}&limit=1000&offset=0`
  );
  const list: any[] = json?.playlist ?? [];
  return list.map((p) => ({
    id: p.id,
    name: p.name ?? "未命名歌单",
    cover: p.coverImgUrl ?? "",
    trackCount: p.trackCount ?? 0,
    creator: p.creator?.nickname ?? "",
    isMine: p.creator?.userId === uid,
    isLiked: p.specialType === 5,
  }));
}

/** 拿歌单内全部歌曲（自动分页） */
export async function fetchPlaylistTracks(
  playlistId: number,
  cookie: string
): Promise<NeteaseSong[]> {
  const all: NeteaseSong[] = [];
  const pageSize = 500;
  let offset = 0;
  let guard = 0;

  while (guard < 20) {
    guard++;
    const json = await getJson<any>(
      `/playlist/track/all?id=${playlistId}&limit=${pageSize}&offset=${offset}&cookie=${encodeURIComponent(
        cookie
      )}`
    );
    const songs: any[] = json?.songs ?? [];
    if (songs.length === 0) break;

    for (const s of songs) {
      all.push({
        id: s.id,
        name: s.name,
        artists: (s.ar ?? [])
          .map((a: any) => a.name)
          .join(" / "),
        album: s.al?.name ?? "",
        cover: s.al?.picUrl ?? "",
        duration: s.dt ?? 0,
      });
    }

    if (songs.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}