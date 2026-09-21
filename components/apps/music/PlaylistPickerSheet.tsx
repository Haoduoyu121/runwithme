"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import {
  createPlaylistId,
  loadPlaylists,
  savePlaylists,
  type Playlist,
} from "@/lib/playlistStorage";

type Props = {
  title?: string;
  onPick: (playlistId: string) => void;
  onClose: () => void;
};

export default function PlaylistPickerSheet({
  title = "选择歌单",
  onPick,
  onClose,
}: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    setPlaylists(loadPlaylists());
  }, []);

  function handleCreate() {
    const name = window.prompt("歌单名称");
    if (!name?.trim()) return;
    const pl: Playlist = {
      id: createPlaylistId(),
      name: name.trim(),
      musicIds: [],
      createdAt: Date.now(),
    };
    const next = [...playlists, pl];
    savePlaylists(next);
    setPlaylists(next);
    onPick(pl.id);
  }

  return (
    <div
      className="music-picker-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="music-picker-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-picker-sheet-title">
          {title}
        </div>

        <div className="music-picker-sheet-list">
          {playlists.length === 0 ? (
            <div className="music-picker-sheet-empty">
              还没有歌单
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                className="music-picker-sheet-item"
                onClick={() => onPick(pl.id)}
              >
                <span className="music-picker-sheet-name">
                  {pl.name}
                </span>
                <small>{pl.musicIds.length} 首</small>
              </button>
            ))
          )}
        </div>

        <button
          className="music-picker-sheet-create"
          onClick={handleCreate}
        >
          <Plus size={14} strokeWidth={2.6} />
          新建歌单
        </button>

        <button
          className="music-picker-sheet-cancel"
          onClick={onClose}
        >
          取消
        </button>
      </div>
    </div>
  );
}