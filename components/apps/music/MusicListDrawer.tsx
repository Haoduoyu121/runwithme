"use client";

import { useMusic } from "@/lib/MusicContext";

type MusicListDrawerProps = {
  onClose: () => void;
  onSelect: (index: number) => void;
};

export default function MusicListDrawer({
  onClose,
  onSelect,
}: MusicListDrawerProps) {
  const { music, currentIndex, isPlaying } = useMusic();

  return (
    <div
      className="music-v2-drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="music-v2-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-v2-drawer-header">
          <h2>播放列表</h2>

          <button onClick={onClose}>×</button>
        </div>

        <div className="music-v2-drawer-count">
          共 {music.length} 首
        </div>

        <div className="music-v2-drawer-list">
          {music.length === 0 ? (
            <div className="music-v2-drawer-empty">
              还没有音乐
            </div>
          ) : (
            music.map((item, index) => (
              <button
                key={item.id}
                className={
                  index === currentIndex
                    ? "music-v2-drawer-item active"
                    : "music-v2-drawer-item"
                }
                onClick={() => onSelect(index)}
              >
                <div className="music-v2-drawer-item-cover">
                  {index === currentIndex && isPlaying
                    ? "♫"
                    : "♪"}
                </div>

                <div className="music-v2-drawer-item-info">
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist || "RunWithme"}
                  </small>
                </div>

                <div className="music-v2-drawer-item-source">
                  {item.source === "file" ? "MP3" : "URL"}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}