// lib/musicBatchOps.ts
// 音乐批量操作：删除 / 加入歌单 / 从歌单移除

import {
  defaultMusic,
  type MusicItem,
} from "@/data/music";

import { loadMusic, saveMusic } from "@/lib/musicStorage";
import { deleteMusicFile } from "@/lib/musicFiles";
import { deleteMusicCover } from "@/lib/musicCoverFiles";
import {
  loadPlaylists,
  savePlaylists,
} from "@/lib/playlistStorage";

function emitPlaylistsUpdated() {
  try {
    window.dispatchEvent(
      new Event("runwithme:playlists-updated")
    );
  } catch {}
}

/** 批量删除音乐（含本地文件 / 封面，同时从所有歌单移除） */
export async function batchDeleteMusic(
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const set = new Set(ids);
  const list = loadMusic(defaultMusic);
  const removed = list.filter((m) => set.has(m.id));

  /* 清理本地文件 / IDB 封面 */
  for (const item of removed) {
    if (item.source === "file") {
      try {
        await deleteMusicFile(item.id);
      } catch (e) {
        console.error("删除本地文件失败:", e);
      }
    }
    if (item.coverId) {
      try {
        await deleteMusicCover(item.coverId);
      } catch (e) {
        console.error("删除封面失败:", e);
      }
    }
  }

  /* 从主列表移除 */
  saveMusic(list.filter((m) => !set.has(m.id)));

  /* 从所有歌单移除 */
  const playlists = loadPlaylists();
  const next = playlists.map((p) => ({
    ...p,
    musicIds: p.musicIds.filter((id) => !set.has(id)),
  }));
  savePlaylists(next);
  emitPlaylistsUpdated();
}

/** 批量加入某个歌单，返回新加入的数量（已存在的跳过） */
export function batchAddToPlaylist(
  playlistId: string,
  musicIds: string[]
): number {
  if (musicIds.length === 0) return 0;
  const playlists = loadPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return 0;

  const existing = new Set(pl.musicIds);
  let added = 0;
  const next = [...pl.musicIds];
  for (const id of musicIds) {
    if (!existing.has(id)) {
      existing.add(id);
      next.push(id);
      added++;
    }
  }

  if (added > 0) {
    savePlaylists(
      playlists.map((p) =>
        p.id === playlistId ? { ...p, musicIds: next } : p
      )
    );
    emitPlaylistsUpdated();
  }
  return added;
}

/** 批量从某个歌单移除，返回移除的数量 */
export function batchRemoveFromPlaylist(
  playlistId: string,
  musicIds: string[]
): number {
  if (musicIds.length === 0) return 0;
  const playlists = loadPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return 0;

  const removeSet = new Set(musicIds);
  const before = pl.musicIds.length;
  const after = pl.musicIds.filter(
    (id) => !removeSet.has(id)
  );
  const removed = before - after.length;

  if (removed > 0) {
    savePlaylists(
      playlists.map((p) =>
        p.id === playlistId ? { ...p, musicIds: after } : p
      )
    );
    emitPlaylistsUpdated();
  }
  return removed;
}