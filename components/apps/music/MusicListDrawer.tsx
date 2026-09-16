"use client";

import { useEffect, useState } from "react";

import { useMusic } from "@/lib/MusicContext";
import { getMusicCover } from "@/lib/musicCoverFiles";

type MusicListDrawerProps = {
  onClose: () => void;
  onSelect: (index: number) => void;
};

export default function MusicListDrawer({
  onClose,
  onSelect,
}: MusicListDrawerProps) {
  const { music, currentIndex, isPlaying } = useMusic();

  const [coverUrls, setCoverUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const item of music) {
        if (!item.coverId) continue;
        try {
          const blob = await getMusicCover(item.coverId);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[item.id] = url;
        } catch (e) {
          console.error("加载封面失败:", e);
        }
      }
      if (!cancelled) setCoverUrls(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [music]);

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
            music.map((item, index) => {
              const coverUrl = coverUrls[item.id];

              return (
                <button
                  key={item.id}
                  className={
                    index === currentIndex
                      ? "music-v2-drawer-item active"
                      : "music-v2-drawer-item"
                  }
                  onClick={() => onSelect(index)}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      className="music-v2-drawer-item-cover-img"
                    />
                  ) : (
                    <div className="music-v2-drawer-item-cover">
                      {index === currentIndex && isPlaying
                        ? "♫"
                        : "♪"}
                    </div>
                  )}

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
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}