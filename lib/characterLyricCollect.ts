/* =========================================================
   RunWithme · Character Lyric Collect
   角色收藏歌词：抽句 + 概率决策（纯逻辑，不写存储）
   ========================================================= */

import type { MusicItem } from "@/data/music";
import { parseLrc } from "@/lib/lyricsParser";
import type { ListenPartner } from "@/lib/listenTogetherStorage";

export type LyricOwner = "levi" | "erwin";

export type LyricLinePick = {
  text: string;
  index: number;
  time: number;
};

export type LyricCollectInput = {
  owner: LyricOwner;
  sourceId: string;
  content: string;
  meta: Record<string, unknown>;
};

/** partner → 收藏 owner；Solo 返回 null */
export function partnerToOwner(
  partner: ListenPartner
): LyricOwner | null {
  if (partner === "Levi") return "levi";
  if (partner === "Erwin") return "erwin";
  if (partner === "Both") {
    return Math.random() < 0.5 ? "levi" : "erwin";
  }
  return null;
}

/** 从一首歌抽一句非空歌词 */
export function pickLyricLine(
  item: MusicItem
): LyricLinePick | null {
  if (!item.lyrics?.raw) return null;

  const parsed = parseLrc(item.lyrics.raw);
  const candidates = parsed.lines.filter(
    (l) => l.text.trim().length > 0
  );
  if (candidates.length === 0) return null;

  const picked =
    candidates[Math.floor(Math.random() * candidates.length)];
  return {
    text: picked.text,
    index: picked.index,
    time: picked.time,
  };
}

/**
 * 决策：是否要收藏这首歌的一句歌词。
 * 返回 null 表示不收藏。
 *
 * @param item     当前 track（.lyrics 必须已加载）
 * @param partner  一起听的对象
 * @param chance   本次收藏概率（自动 0.05 / 手动 0.6）
 */
export function decideLyricCollect(
  item: MusicItem,
  partner: ListenPartner,
  chance: number
): LyricCollectInput | null {
  const owner = partnerToOwner(partner);
  if (!owner) return null;
  if (!item.lyrics?.raw) return null;
  if (Math.random() >= chance) return null;

  const line = pickLyricLine(item);
  if (!line) return null;

  return {
    owner,
    sourceId: item.id,
    content: line.text,
    meta: {
      songId: item.id,
      title: item.title,
      artist: item.artist,
      lineIndex: line.index,
      lineTime: line.time,
      neteaseId: item.neteaseId ?? null,
    },
  };
}

/** owner 的中文显示名 */
export function ownerDisplayName(owner: LyricOwner): string {
  return owner === "levi" ? "Levi" : "Erwin";
}