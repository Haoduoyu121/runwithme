// lib/neteaseImport.ts

import {
  defaultMusic,
  type MusicItem,
} from "@/data/music";
import { loadMusic, saveMusic } from "@/lib/musicStorage";
import {
  loadPlaylists,
  savePlaylists,
  createPlaylistId,
  type Playlist,
} from "@/lib/playlistStorage";
import type { NeteaseSong } from "@/lib/neteaseApi";

export type ImportResult = {
  added: number;
  skipped: number;
  playlistId: string;
  playlistName: string;
};

/**
 * 批量导入网易云歌曲：
 * 1. 加到"全部"音乐列表（按 neteaseId 去重，已存在的跳过）
 * 2. 新建一个本地同名歌单，包含所有导入的歌
 */
export function importNeteasePlaylist(
  playlistName: string,
  songs: NeteaseSong[]
): ImportResult {
  const musicList = loadMusic(defaultMusic);

  const existing = new Set<number>();
  musicList.forEach((m) => {
    if (
      m.source === "netease" &&
      typeof m.neteaseId === "number"
    ) {
      existing.add(m.neteaseId);
    }
  });

  const addedItems: MusicItem[] = [];
  let skipped = 0;

  for (const song of songs) {
    if (existing.has(song.id)) {
      skipped++;
      continue;
    }
    existing.add(song.id);
    addedItems.push({
      id: `music-nt-${song.id}`,
      title: song.name,
      artist: song.artists || "网易云",
      url: "",
      enabled: true,
      source: "netease",
      neteaseId: song.id,
      remoteCover: song.cover,
    });
  }

  if (addedItems.length > 0) {
    saveMusic([...musicList, ...addedItems]);
  }

  /* 新建本地歌单（保留歌单结构） */
  const playlists = loadPlaylists();
  const newPlaylist: Playlist = {
    id: createPlaylistId(),
    name: playlistName,
    musicIds: songs.map((s) => `music-nt-${s.id}`),
    createdAt: Date.now(),
  };
  savePlaylists([...playlists, newPlaylist]);

  try {
    window.dispatchEvent(
      new Event("runwithme:playlists-updated")
    );
  } catch {}

  return {
    added: addedItems.length,
    skipped,
    playlistId: newPlaylist.id,
    playlistName,
  };
}