"use client";

import { useEffect, useRef, useState } from "react";

import {
  ChevronLeft,
  Ellipsis,
  Folder,
  ImagePlus,
  Music2,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useMusic } from "@/lib/MusicContext";
import { getMusicCover } from "@/lib/musicCoverFiles";

import {
  savePlaylistCover,
  getPlaylistCover,
  deletePlaylistCover,
} from "@/lib/playlistCoverFiles";

import {
  loadPlaylists,
  savePlaylists,
  createPlaylistId,
  type Playlist,
} from "@/lib/playlistStorage";

type MusicListDrawerProps = {
  onClose: () => void;
  onSelect: (index: number) => void;
  onCloseList: () => void;
};

type Tab = "all" | "playlists";

export default function MusicListDrawer({
  onClose,
  onSelect,
  onCloseList,
}: MusicListDrawerProps) {
  const {
    music,
    currentTrack,
    isPlaying,
    setQueue,
    playFromQueue,
  } = useMusic();

  const [tab, setTab] = useState<Tab>("all");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [coverUrls, setCoverUrls] = useState<
    Record<string, string>
  >({});
  const [playlistCoverUrls, setPlaylistCoverUrls] =
    useState<Record<string, string>>({});

  const [addToPlaylistFor, setAddToPlaylistFor] = useState<
    string | null
  >(null);

  const [openedPlaylistId, setOpenedPlaylistId] = useState<
    string | null
  >(null);

  const coverInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const currentTrackId = currentTrack?.id ?? null;

  /* 加载音乐封面 */
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

  /* 加载歌单封面 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const pl of playlists) {
        if (!pl.coverId) continue;
        try {
          const blob = await getPlaylistCover(pl.coverId);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[pl.id] = url;
        } catch (e) {
          console.error("加载歌单封面失败:", e);
        }
      }
      if (!cancelled) setPlaylistCoverUrls(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [playlists]);

  useEffect(() => {
    setPlaylists(loadPlaylists());
  }, []);

  function commitPlaylists(next: Playlist[]) {
    setPlaylists(next);
    savePlaylists(next);
    try {
      window.dispatchEvent(
        new Event("runwithme:playlists-updated")
      );
    } catch {}
  }

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

  async function deletePlaylist(id: string) {
    if (!window.confirm("删除这个歌单？音乐本身不会被删除。"))
      return;

    const pl = playlists.find((p) => p.id === id);
    if (pl?.coverId) {
      try {
        await deletePlaylistCover(pl.coverId);
      } catch (e) {
        console.error(e);
      }
    }

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

  async function handlePlaylistCoverUpload(
    playlistId: string,
    file: File
  ) {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件。");
      return;
    }

    const coverId = `playlist-cover-${playlistId}`;

    try {
      await savePlaylistCover(coverId, file);

      const next = playlists.map((p) =>
        p.id === playlistId ? { ...p, coverId } : p
      );
      commitPlaylists(next);

      const url = URL.createObjectURL(file);
      setPlaylistCoverUrls((prev) => ({
        ...prev,
        [playlistId]: url,
      }));
    } catch (e) {
      console.error("保存歌单封面失败:", e);
      alert("封面保存失败。");
    }
  }

  async function handlePlaylistCoverRemove(
    playlistId: string
  ) {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl?.coverId) return;

    try {
      await deletePlaylistCover(pl.coverId);
    } catch (e) {
      console.error(e);
    }

    const next = playlists.map((p) =>
      p.id === playlistId
        ? { ...p, coverId: undefined }
        : p
    );
    commitPlaylists(next);

    setPlaylistCoverUrls((prev) => {
      const copy = { ...prev };
      const u = copy[playlistId];
      if (u) URL.revokeObjectURL(u);
      delete copy[playlistId];
      return copy;
    });
  }

  function renderCover(
    item: { id: string; coverId?: string },
    isCurrent: boolean
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
        <Music2
          size={16}
          strokeWidth={2}
          style={{ opacity: isCurrent ? 1 : 0.7 }}
        />
      </div>
    );
  }

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
        {music.map((item, index) => {
          const isCurrent = item.id === currentTrackId;
          return (
            <div
              key={item.id}
              className={
                isCurrent
                  ? "music-v2-drawer-item active"
                  : "music-v2-drawer-item"
              }
            >
              <button
                className="music-v2-drawer-item-main"
                onClick={() => onSelect(index)}
              >
                {renderCover(item, isCurrent)}
                <div className="music-v2-drawer-item-info">
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist || "RunWithme"}
                  </small>
                </div>
              </button>

              <button
                className="music-v2-drawer-item-menu"
                onClick={() => setAddToPlaylistFor(item.id)}
                aria-label="添加到歌单"
              >
                <Ellipsis size={18} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </>
    );
  }

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
          <Plus size={14} strokeWidth={2.6} />
          新建歌单
        </button>

        {playlists.length === 0 ? (
          <div className="music-v2-drawer-empty">
            还没有歌单
          </div>
        ) : (
          playlists.map((pl) => {
            const coverUrl = playlistCoverUrls[pl.id];
            return (
              <div
                key={pl.id}
                className="music-playlist-item"
              >
                <button
                  className="music-playlist-item-main"
                  onClick={() => setOpenedPlaylistId(pl.id)}
                >
                  <div className="music-playlist-item-icon">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="music-playlist-item-cover-img"
                      />
                    ) : (
                      <Folder
                        size={18}
                        strokeWidth={1.8}
                      />
                    )}
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
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>
            );
          })
        )}
      </>
    );
  }

  function handlePlayAll(pl: Playlist) {
    if (pl.musicIds.length === 0) {
      window.alert("歌单里还没有歌。");
      return;
    }
    setQueue({
      id: pl.id,
      name: pl.name,
      musicIds: pl.musicIds,
    });
    void playFromQueue(0);
    onCloseList();
  }

  function handlePlayFromPlaylist(
    pl: Playlist,
    indexInPlaylist: number
  ) {
    setQueue({
      id: pl.id,
      name: pl.name,
      musicIds: pl.musicIds,
    });
    void playFromQueue(indexInPlaylist);
    onCloseList();
  }

  function renderPlaylistDetail(pl: Playlist) {
    const coverUrl = playlistCoverUrls[pl.id];

    return (
      <>
        <button
          className="music-playlist-back"
          onClick={() => setOpenedPlaylistId(null)}
        >
          <ChevronLeft size={14} strokeWidth={2.6} />
          返回歌单
        </button>

        {/* 大封面 + 改名 */}
        <div className="music-playlist-detail-cover-wrap">
          <button
            type="button"
            className="music-playlist-detail-cover"
            onClick={() =>
              coverInputRef.current?.click()
            }
            aria-label="更换封面"
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" />
            ) : (
              <div className="music-playlist-detail-cover-empty">
                <ImagePlus
                  size={32}
                  strokeWidth={1.6}
                />
                <span>选择封面</span>
              </div>
            )}
          </button>

          {pl.coverId && (
            <button
              type="button"
              className="music-playlist-detail-cover-remove"
              onClick={() =>
                void handlePlaylistCoverRemove(pl.id)
              }
              aria-label="移除封面"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="ios-file-input-detached"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void handlePlaylistCoverUpload(pl.id, f);
              e.target.value = "";
            }}
          />
        </div>

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

        {pl.musicIds.length > 0 && (
          <button
            className="music-playlist-play-all"
            onClick={() => handlePlayAll(pl)}
          >
            <Play
              size={14}
              strokeWidth={2.4}
              fill="currentColor"
            />
            播放全部
          </button>
        )}

        {pl.musicIds.length === 0 ? (
          <div className="music-v2-drawer-empty">
            还没有歌，去「全部」里点击 ⋯ 添加
          </div>
        ) : (
          pl.musicIds.map((id, indexInPl) => {
            const item = music.find((m) => m.id === id);
            if (!item) return null;

            const isCurrent = item.id === currentTrackId;

            return (
              <div
                key={id}
                className={
                  isCurrent
                    ? "music-v2-drawer-item active"
                    : "music-v2-drawer-item"
                }
              >
                <button
                  className="music-v2-drawer-item-main"
                  onClick={() =>
                    handlePlayFromPlaylist(pl, indexInPl)
                  }
                >
                  {renderCover(item, isCurrent)}
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
                  <X size={16} strokeWidth={2.2} />
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
                    {included && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
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
            <Plus size={14} strokeWidth={2.6} />
            新建歌单
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
          <button onClick={onClose} aria-label="关闭">
            <X size={16} strokeWidth={2.2} />
          </button>
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