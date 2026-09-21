"use client";

import { ListPlus, Trash2, X } from "lucide-react";

type Props = {
  selectedCount: number;
  showRemoveFromPlaylist?: boolean;
  onAddToPlaylist: () => void;
  onRemoveFromPlaylist?: () => void;
  onDelete: () => void;
};

export default function MultiSelectBar({
  selectedCount,
  showRemoveFromPlaylist = false,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onDelete,
}: Props) {
  const disabled = selectedCount === 0;

  return (
    <div className="music-multiselect-bar">
      <button
        className="music-multiselect-btn"
        onClick={onAddToPlaylist}
        disabled={disabled}
      >
        <ListPlus size={16} strokeWidth={2.2} />
        加入歌单
      </button>

      {showRemoveFromPlaylist && onRemoveFromPlaylist && (
        <button
          className="music-multiselect-btn"
          onClick={onRemoveFromPlaylist}
          disabled={disabled}
        >
          <X size={16} strokeWidth={2.2} />
          从歌单移除
        </button>
      )}

      <button
        className="music-multiselect-btn danger"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 size={16} strokeWidth={2.2} />
        删除
      </button>
    </div>
  );
}