"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { parseLrc } from "@/lib/lyricsParser";
import {
  saveLyricsToTrack,
  clearLyricsFromTrack,
} from "@/lib/lyricsService";

type Props = {
  trackId: string;
  initialRaw: string;
  onClose: () => void;
};

export default function ManualLyricSheet({
  trackId,
  initialRaw,
  onClose,
}: Props) {
  const [text, setText] = useState(initialRaw);

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) {
      clearLyricsFromTrack(trackId);
      onClose();
      return;
    }
    const parsed = parseLrc(trimmed);
    saveLyricsToTrack(trackId, {
      raw: trimmed,
      synced: parsed.synced,
      source: "manual",
      fetchedAt: Date.now(),
    });
    onClose();
  }

  function handleClear() {
    clearLyricsFromTrack(trackId);
    setText("");
    onClose();
  }

  return (
    <div
      className="lyrics-manual-backdrop"
      onClick={onClose}
    >
      <div
        className="lyrics-manual-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lyrics-manual-header">
          <span>编辑歌词</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <textarea
          className="lyrics-manual-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "粘贴 LRC 歌词：\n[00:12.34] 第一句\n[00:15.67] 第二句\n\n或者直接粘纯文本，也支持。"
          }
          spellCheck={false}
        />

        <div className="lyrics-manual-actions">
          <button
            type="button"
            className="lyrics-manual-btn-secondary"
            onClick={handleClear}
          >
            清空
          </button>
          <button
            type="button"
            className="lyrics-manual-btn-primary"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}