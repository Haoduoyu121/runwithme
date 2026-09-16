"use client";

import { useEffect, useState } from "react";

import { useMusic } from "@/lib/MusicContext";
import { getMusicCover } from "@/lib/musicCoverFiles";

import {
  loadPlaylists,
  savePlaylists,
  createPlaylistId,
  type Playlist,
} from "@/lib/playlistStorage";

type MusicListDrawerProps = {
  onClose: () => void;
  onSelect: (index: number) => void;
};

type Tab = "all" | "playlists";

export default function MusicListDrawer({
  onClose,
  onSelect,
}: MusicListDrawerProps) {
  const { music, currentIndex, isPlaying } = useMusic();

  const [tab, setTab] = useState<Tab>("all");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [coverUrls, setCoverUrls] = useState<
    Record<string, string>
  >({});

  /* 单首歌：添加到歌单的菜单 */
  const [addToPlaylistFor, setAddToPlaylistFor] = useState<
    string | null
  >(null);

  /* 当前进入的歌单详情 */
  const [openedPlaylistId, setOpenedPlaylistId] = useState<
    string | null
  >(null);

  /* -------------------------------------------------------
     加载
     ------------------------------------------------------- */

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

  useEffect(() => {
    setPlaylists(loadPlaylists());
  }, []);

  function commitPlaylists(next: Playlist[]) {
    setPlaylists(next);
    savePlaylists(next);
  }

  /* -------------------------------------------------------
     歌单操作
     ------------------------------------------------------- */

  function createPlaylist(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const pl: Playlist = {
      id: createPlaylistId(),
      name: trimmed,
      musicIds: [],
      createdAt: Date.now(),
    };
    commitPlaylists([...playlists, pl]);
  }

  function renamePlaylist(id: string, name: string) {
    commitPlaylists(
      playlists.map((p) =>
        p.id === id ? { ...p, name } : p
      )
    );
  }

  function deletePlaylist(id: string) {
    if (!window.confirm("删除这个歌单？音乐本身不会被删除。"))
      return;
    commitPlaylists(playlists.filter((p) => p.id !== id));
    if (openedPlaylistId === id) setOpenedPlaylistId(null);
  }

  function addMusicToPlaylist(
    playlistId: string,
    musicId: string
  ) {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    if (pl.musicIds.includes(musicId)) return;
    commitPlaylists(
      playlists.map((p) =>
        p.id === playlistId
          ? { ...p, musicIds: [...p.musicIds, musicId] }
          : p
      )
    );
  }

  function removeMusicFromPlaylist(
    playlistId: string,
    musicId: string
  ) {
    commitPlaylists(
      playlists.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              musicIds: p.musicIds.filter(
                (id) => id !== musicId
              ),
            }
          : p
      )
    );
  }

  /* -------------------------------------------------------
     渲染辅助
     ------------------------------------------------------- */

  function renderCover(
    item: { id: string; coverId?: string },
    idx: number
  ) {
    const url = coverUrls[item.id];
    if (url) {
      return (
        <img
          src={url}
          alt=""
          className="music-v2-drawer-item-cover-img"
        />
      );
    }
    return (
      <div className="music-v2-drawer-item-cover">
        {idx === currentIndex && isPlaying ? "♫" : "♪"}
      </div>
    );
  }

  /* -------------------------------------------------------
     全部 tab
     ------------------------------------------------------- */

  function renderAllTab() {
    if (music.length === 0) {
      return (
        <div className="music-v2-drawer-empty">
          还没有音乐
        </div>
      );
    }

    return (
      <>
        {music.map((item, index) => (
          <div
            key={item.id}
            className={
              index === currentIndex
                ? "music-v2-drawer-item active"
                : "music-v2-drawer-item"
            }
          >
            <button
              className="music-v2-drawer-item-main"
              onClick={() => onSelect(index)}
            >
              {renderCover(item, index)}
              <div className="music-v2-drawer-item-info">
                <strong>{item.title}</strong>
                <small>{item.artist || "RunWithme"}</small>
              </div>
            </button>

            <button
              className="music-v2-drawer-item-menu"
              onClick={() => setAddToPlaylistFor(item.id)}
              aria-label="添加到歌单"
            >
              ⋯
            </button>
          </div>
        ))}
      </>
    );
  }

  /* -------------------------------------------------------
     歌单 tab
     ------------------------------------------------------- */

  function renderPlaylistsTab() {
    if (openedPlaylistId) {
      const pl = playlists.find(
        (p) => p.id === openedPlaylistId
      );
      if (!pl) {
        setOpenedPlaylistId(null);
        return null;
      }
      return renderPlaylistDetail(pl);
    }

    return (
      <>
        <button
          className="music-playlist-create-btn"
          onClick={() => {
            const name = window.prompt("歌单名称");
            if (name) createPlaylist(name);
          }}
        >
          ＋ 新建歌单
        </button>

        {playlists.length === 0 ? (
          <div className="music-v2-drawer-empty">
            还没有歌单
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              className="music-playlist-item"
            >
              <button
                className="music-playlist-item-main"
                onClick={() => setOpenedPlaylistId(pl.id)}
              >
                <div className="music-playlist-item-icon">
                  📁
                </div>
                <div className="music-playlist-item-info">
                  <strong>{pl.name}</strong>
                  <small>{pl.musicIds.length} 首</small>
                </div>
              </button>

              <button
                className="music-v2-drawer-item-menu"
                onClick={() => deletePlaylist(pl.id)}
                aria-label="删除歌单"
              >
                ×
              </button>
            </div>
          ))
        )}
      </>
    );
  }

  /* -------------------------------------------------------
     歌单详情
     ------------------------------------------------------- */

  function renderPlaylistDetail(pl: Playlist) {
    return (
      <>
        <button
          className="music-playlist-back"
          onClick={() => setOpenedPlaylistId(null)}
        >
          ‹ 返回歌单
        </button>

        <div className="music-playlist-detail-header">
          <input
            className="music-playlist-name-input"
            value={pl.name}
            onChange={(e) =>
              renamePlaylist(pl.id, e.target.value)
            }
            maxLength={30}
          />
          <span className="music-playlist-detail-count">
            {pl.musicIds.length} 首
          </span>
        </div>

        {pl.musicIds.length === 0 ? (
          <div className="music-v2-drawer-empty">
            还没有歌，去「全部」里点击 ⋯ 添加
          </div>
        ) : (
          pl.musicIds.map((id) => {
            const item = music.find((m) => m.id === id);
            if (!item) return null;
            const idx = music.findIndex((m) => m.id === id);

            return (
              <div
                key={id}
                className={
                  idx === currentIndex
                    ? "music-v2-drawer-item active"
                    : "music-v2-drawer-item"
                }
              >
                <button
                  className="music-v2-drawer-item-main"
                  onClick={() => onSelect(idx)}
                >
                  {renderCover(item, idx)}
                  <div className="music-v2-drawer-item-info">
                    <strong>{item.title}</strong>
                    <small>
                      {item.artist || "RunWithme"}
                    </small>
                  </div>
                </button>

                <button
                  className="music-v2-drawer-item-menu"
                  onClick={() =>
                    removeMusicFromPlaylist(pl.id, id)
                  }
                  aria-label="从歌单移除"
                >
                  ×
                </button>
              </div>
            );
          })
        )}

        <button
          className="music-playlist-delete-btn"
          onClick={() => deletePlaylist(pl.id)}
        >
          删除歌单
        </button>
      </>
    );
  }

  /* -------------------------------------------------------
     添加到歌单菜单
     ------------------------------------------------------- */

  function renderAddToPlaylistMenu() {
    if (!addToPlaylistFor) return null;
    const musicId = addToPlaylistFor;

    return (
      <div
        className="music-add-to-playlist-backdrop"
        onClick={() => setAddToPlaylistFor(null)}
      >
        <div
          className="music-add-to-playlist"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="music-add-to-playlist-title">
            添加到歌单
          </div>

          {playlists.length === 0 ? (
            <div className="music-add-to-playlist-empty">
              还没有歌单，下面新建一个
            </div>
          ) : (
            playlists.map((pl) => {
              const included = pl.musicIds.includes(musicId);
              return (
                <button
                  key={pl.id}
                  className="music-add-to-playlist-option"
                  onClick={() => {
                    if (included) {
                      removeMusicFromPlaylist(pl.id, musicId);
                    } else {
                      addMusicToPlaylist(pl.id, musicId);
                    }
                  }}
                >
                  <span
                    className={
                      included
                        ? "music-add-to-playlist-check checked"
                        : "music-add-to-playlist-check"
                    }
                  >
                    {included ? "✓" : ""}
                  </span>
                  <span>{pl.name}</span>
                </button>
              );
            })
          )}

          <button
            className="music-add-to-playlist-new"
            onClick={() => {
              const name = window.prompt("歌单名称");
              if (name) createPlaylist(name);
            }}
          >
            ＋ 新建歌单
          </button>

          <button
            className="music-add-to-playlist-close"
            onClick={() => setAddToPlaylistFor(null)}
          >
            完成
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

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
          <h2>音乐库</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="music-v2-drawer-tabs">
          <button
            className={tab === "all" ? "active" : ""}
            onClick={() => {
              setTab("all");
              setOpenedPlaylistId(null);
            }}
          >
            全部 ({music.length})
          </button>
          <button
            className={
              tab === "playlists" ? "active" : ""
            }
            onClick={() => setTab("playlists")}
          >
            歌单 ({playlists.length})
          </button>
        </div>

        <div className="music-v2-drawer-list">
          {tab === "all"
            ? renderAllTab()
            : renderPlaylistsTab()}
        </div>
      </aside>

      {renderAddToPlaylistMenu()}
    </div>
  );
}