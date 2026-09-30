/* =========================================================
   RunWithme · Lyrics Service
   拉取 / 保存 / 清除 歌词（存进 MusicItem.lyrics）
   ========================================================= */

import {
  defaultMusic,
  type MusicItem,
  type MusicLyrics,
} from "@/data/music";
import { loadMusic, saveMusic } from "@/lib/musicStorage";
import { fetchLyric } from "@/lib/neteaseApi";
import { parseLrc } from "@/lib/lyricsParser";

const LYRIC_UPDATED_EVENT = "runwithme:music-lyrics-updated";

function emitLyricsUpdated(trackId: string) {
  try {
    window.dispatchEvent(
      new CustomEvent(LYRIC_UPDATED_EVENT, {
        detail: { trackId },
      })
    );
  } catch {
    /* ignore */
  }
}

/** 从 localStorage 直接读当前 track 的最新歌词（不拉网络） */
export function readLyricsFromTrack(
  trackId: string
): MusicLyrics | null {
  const list = loadMusic(defaultMusic);
  const item = list.find((m) => m.id === trackId);
  return item?.lyrics ?? null;
}

/** 从 localStorage 读最新的 MusicItem（带最新 lyrics） */
export function readFreshTrack(
  trackId: string
): MusicItem | null {
  const list = loadMusic(defaultMusic);
  return list.find((m) => m.id === trackId) ?? null;
}

/**
 * 保证歌词就绪：
 * - manual 歌词：直接返回
 * - netease 歌词且 neteaseId 未变：返回缓存
 * - 否则：从网易云拉取 → 解析 → 写入 MusicItem.lyrics → 返回
 * - 没有 neteaseId：返回 null（UI 提示手动粘贴）
 */
export async function ensureLyrics(
  item: MusicItem
): Promise<MusicLyrics | null> {
  /* 已有缓存判断 */
  if (item.lyrics) {
    if (item.lyrics.source === "manual") return item.lyrics;
    if (
      item.source === "netease" &&
      item.neteaseId &&
      item.lyrics.source === "netease" &&
      item.lyrics.neteaseId === item.neteaseId
    ) {
      return item.lyrics;
    }
  }

  /* 只有网易云歌才能自动拉 */
  if (item.source !== "netease" || !item.neteaseId) {
    return null;
  }

  try {
    const raw = await fetchLyric(item.neteaseId);
    if (!raw || !raw.trim()) return null;

    const parsed = parseLrc(raw);
    const lyrics: MusicLyrics = {
      raw,
      synced: parsed.synced,
      source: "netease",
      fetchedAt: Date.now(),
      neteaseId: item.neteaseId,
    };
    saveLyricsToTrack(item.id, lyrics);
    return lyrics;
  } catch (e) {
    console.error("拉取歌词失败:", e);
    return null;
  }
}

/** 写入歌词（覆盖） */
export function saveLyricsToTrack(
  trackId: string,
  lyrics: MusicLyrics
): void {
  const list = loadMusic(defaultMusic);
  const next = list.map((m) =>
    m.id === trackId ? { ...m, lyrics } : m
  );
  saveMusic(next);
  emitLyricsUpdated(trackId);
}

/** 清空歌词 */
export function clearLyricsFromTrack(trackId: string): void {
  const list = loadMusic(defaultMusic);
  const next = list.map((m) => {
    if (m.id !== trackId) return m;
    const copy: MusicItem = { ...m };
    delete copy.lyrics;
    return copy;
  });
  saveMusic(next);
  emitLyricsUpdated(trackId);
}