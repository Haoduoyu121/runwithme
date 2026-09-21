"use client";

import {
  ChevronLeft,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  defaultMusic,
  type MusicItem,
} from "@/data/music";

import {
  type NeteaseLoginStatus,
  type NeteasePlaylist,
  type NeteaseSong,
  checkQr,
  fetchLoginStatus,
  fetchPlaylistTracks,
  fetchQrImage,
  fetchQrKey,
  fetchUserPlaylists,
  searchSongs,
} from "@/lib/neteaseApi";

import {
  type NeteaseSession,
  clearNeteaseSession,
  getNeteaseSession,
  saveNeteaseSession,
} from "@/lib/neteaseSession";

import { importNeteasePlaylist } from "@/lib/neteaseImport";
import { loadMusic, saveMusic } from "@/lib/musicStorage";

type NeteasePanelProps = {
  onAdded?: () => void;
};

type QrStatus =
  | "loading"
  | "waiting"
  | "scanned"
  | "expired";

type Mode = "qr" | "cookie";
type View = "search" | "playlists";

export default function NeteasePanel({
  onAdded,
}: NeteasePanelProps) {
  const [session, setSession] = useState<
    NeteaseSession | null | undefined
  >(undefined);

  const [mode, setMode] = useState<Mode>("qr");
  const [view, setView] = useState<View>("search");

  /* 扫码 */
  const [qrImg, setQrImg] = useState("");
  const [qrStatus, setQrStatus] =
    useState<QrStatus>("loading");

  /* Cookie */
  const [cookieInput, setCookieInput] = useState("");
  const [savingCookie, setSavingCookie] =
    useState(false);
  const [cookieError, setCookieError] = useState("");

  /* 搜索 */
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NeteaseSong[]>(
    []
  );
  const [addedIds, setAddedIds] = useState<Set<number>>(
    new Set()
  );

  /* 歌单 */
  const [playlists, setPlaylists] = useState<
    NeteasePlaylist[]
  >([]);
  const [loadingPlaylists, setLoadingPlaylists] =
    useState(false);
  const [openedPlaylist, setOpenedPlaylist] =
    useState<NeteasePlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<
    NeteaseSong[]
  >([]);
  const [loadingTracks, setLoadingTracks] =
    useState(false);
  const [selectedIds, setSelectedIds] = useState<
    Set<number>
  >(new Set());
  const [importing, setImporting] = useState(false);

  const pollRef = useRef<number | null>(null);
  const cookieAccumRef = useRef<string>("");
  const flowIdRef = useRef(0);

  /* 首次读 session */
  useEffect(() => {
    setSession(getNeteaseSession());
  }, []);

  /* 已登录时标记已添加歌曲 */
  useEffect(() => {
    if (!session) return;
    const list = loadMusic(defaultMusic);
    const ids = new Set<number>();
    list.forEach((m) => {
      if (
        m.source === "netease" &&
        typeof m.neteaseId === "number"
      ) {
        ids.add(m.neteaseId);
      }
    });
    setAddedIds(ids);
  }, [session]);

  /* cookie 登录后补齐 userId / 昵称 */
  useEffect(() => {
    if (!session) return;
    if (session.userId && session.userId !== 0) return;

    let cancelled = false;
    (async () => {
      const s: NeteaseLoginStatus | null =
        await fetchLoginStatus(session.cookie);
      if (cancelled || !s) return;
      const next = saveNeteaseSession({
        cookie: session.cookie,
        userId: s.userId,
        nickname: s.nickname,
        avatarUrl: s.avatarUrl,
      });
      setSession(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  /* 轮询清理 */
  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPoll();
  }, [stopPoll]);

  /* 扫码流程 */
  const startQrFlow = useCallback(async () => {
    stopPoll();
    const myFlow = ++flowIdRef.current;

    setQrStatus("loading");
    setQrImg("");
    cookieAccumRef.current = "";

    let key = "";
    try {
      key = await fetchQrKey();
      const img = await fetchQrImage(key);
      if (myFlow !== flowIdRef.current) return;
      setQrImg(img);
      setQrStatus("waiting");
    } catch (e) {
      console.error(e);
      if (myFlow !== flowIdRef.current) return;
      setQrStatus("expired");
      return;
    }

    let interval = 700;
    const firstDelay = 300;

    const tick = async () => {
      if (myFlow !== flowIdRef.current) return;

      try {
        const r = await checkQr(
          key,
          cookieAccumRef.current
        );
        if (myFlow !== flowIdRef.current) return;

        if (r.code === 803) {
          if (r.cookie) cookieAccumRef.current = r.cookie;
          const finalCookie = cookieAccumRef.current;
          if (finalCookie) {
            const s = saveNeteaseSession({
              cookie: finalCookie,
              userId: r.userId ?? 0,
              nickname: r.nickname ?? "网易云用户",
              avatarUrl: r.avatarUrl ?? "",
            });
            setSession(s);
          }
          return;
        }

        if (r.cookie) cookieAccumRef.current = r.cookie;

        if (r.code === 800) {
          try {
            const retry = await checkQr(
              key,
              cookieAccumRef.current
            );
            if (myFlow !== flowIdRef.current) return;
            if (retry.code === 803) {
              if (retry.cookie)
                cookieAccumRef.current = retry.cookie;
              const finalCookie = cookieAccumRef.current;
              if (finalCookie) {
                const s = saveNeteaseSession({
                  cookie: finalCookie,
                  userId: retry.userId ?? 0,
                  nickname:
                    retry.nickname ?? "网易云用户",
                  avatarUrl: retry.avatarUrl ?? "",
                });
                setSession(s);
              }
              return;
            }
          } catch {}
          setQrStatus("expired");
          return;
        }

        if (r.code === 801) {
          setQrStatus("waiting");
          interval = 700;
        } else if (r.code === 802) {
          setQrStatus("scanned");
          interval = 300;
        }

        pollRef.current = window.setTimeout(
          tick,
          interval
        );
      } catch (e) {
        console.error(e);
        if (myFlow !== flowIdRef.current) return;
        pollRef.current = window.setTimeout(tick, 1000);
      }
    };

    pollRef.current = window.setTimeout(
      tick,
      firstDelay
    );
  }, [stopPoll]);

  useEffect(() => {
    if (session === undefined) return;
    if (session) return;

    if (mode !== "qr") {
      stopPoll();
      flowIdRef.current++;
      return;
    }
    void startQrFlow();
  }, [session, mode, startQrFlow, stopPoll]);

  /* Cookie 登录 */
  async function handleSaveCookie() {
    const raw = cookieInput.trim();
    if (!raw) {
      setCookieError("请粘贴 Cookie");
      return;
    }
    if (!raw.includes("MUSIC_U")) {
      setCookieError(
        "Cookie 里没有 MUSIC_U。必须从 F12 → Application → Cookies 里复制。"
      );
      return;
    }

    setCookieError("");
    setSavingCookie(true);

    try {
      await searchSongs("周杰伦", raw, 1);
    } catch (e) {
      console.error(e);
      setCookieError(
        "Cookie 验证失败。请确认已登录 music.163.com，且 MUSIC_U 复制完整。"
      );
      setSavingCookie(false);
      return;
    }

    const s = saveNeteaseSession({
      cookie: raw,
      userId: 0,
      nickname: "网易云用户",
      avatarUrl: "",
    });
    setSession(s);
    setCookieInput("");
    setSavingCookie(false);
  }

  /* 搜索 */
  async function handleSearch() {
    if (!session) return;
    const kw = keyword.trim();
    if (!kw) return;

    setSearching(true);
    try {
      const list = await searchSongs(
        kw,
        session.cookie,
        20
      );
      setResults(list);
    } catch (e) {
      console.error(e);
      alert("搜索失败，请稍后再试。");
    } finally {
      setSearching(false);
    }
  }

  /* 单首添加 */
  function handleAddSong(song: NeteaseSong) {
    const list = loadMusic(defaultMusic);
    if (
      list.some(
        (m) =>
          m.source === "netease" &&
          m.neteaseId === song.id
      )
    ) {
      return;
    }

    const newItem: MusicItem = {
      id: `music-nt-${song.id}`,
      title: song.name,
      artist: song.artists || "网易云",
      url: "",
      enabled: true,
      source: "netease",
      neteaseId: song.id,
      remoteCover: song.cover,
    };

    saveMusic([...list, newItem]);

    setAddedIds((prev) => {
      const n = new Set(prev);
      n.add(song.id);
      return n;
    });

    onAdded?.();
  }

  /* 加载歌单列表 */
  async function loadPlaylists() {
    if (!session || !session.userId) {
      alert(
        "还没拿到你的用户 ID。请等几秒或重新登录。"
      );
      return;
    }
    setLoadingPlaylists(true);
    try {
      const list = await fetchUserPlaylists(
        session.userId,
        session.cookie
      );
      setPlaylists(list);
    } catch (e) {
      console.error(e);
      alert("加载歌单失败，请稍后再试。");
    } finally {
      setLoadingPlaylists(false);
    }
  }

  /* 打开歌单 */
  async function openPlaylist(pl: NeteasePlaylist) {
    if (!session) return;
    setOpenedPlaylist(pl);
    setPlaylistTracks([]);
    setSelectedIds(new Set());
    setLoadingTracks(true);

    try {
      const tracks = await fetchPlaylistTracks(
        pl.id,
        session.cookie
      );
      setPlaylistTracks(tracks);
      /* 默认全选（已在库里的除外） */
      const sel = new Set<number>();
      tracks.forEach((t) => {
        if (!addedIds.has(t.id)) sel.add(t.id);
      });
      setSelectedIds(sel);
    } catch (e) {
      console.error(e);
      alert("加载歌单歌曲失败。");
    } finally {
      setLoadingTracks(false);
    }
  }

  /* 全选 / 反选 */
  function toggleAll() {
    const selectable = playlistTracks
      .map((t) => t.id)
      .filter((id) => !addedIds.has(id));
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable));
    }
  }

  function toggleOne(id: number) {
    if (addedIds.has(id)) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /* 批量导入 */
  async function handleImport() {
    if (!openedPlaylist) return;
    const toImport = playlistTracks.filter((t) =>
      selectedIds.has(t.id)
    );
    if (toImport.length === 0) {
      alert("请先勾选要导入的歌曲。");
      return;
    }

    setImporting(true);
    try {
      const result = importNeteasePlaylist(
        openedPlaylist.name,
        toImport
      );

      /* 更新 addedIds */
      const next = new Set(addedIds);
      toImport.forEach((t) => next.add(t.id));
      setAddedIds(next);

      /* 清空已选项 */
      setSelectedIds(new Set());

      onAdded?.();

      alert(
        `导入完成！\n新增 ${result.added} 首，跳过 ${result.skipped} 首（已在库里）。\n已新建本地歌单「${result.playlistName}」。`
      );

      /* 返回歌单列表 */
      setOpenedPlaylist(null);
      setPlaylistTracks([]);
    } catch (e) {
      console.error(e);
      alert("导入失败，请查看控制台。");
    } finally {
      setImporting(false);
    }
  }

  /* 退出 */
  function handleLogout() {
    if (!window.confirm("退出网易云登录？")) return;
    flowIdRef.current++;
    stopPoll();
    clearNeteaseSession();
    setSession(null);
    setResults([]);
    setKeyword("");
    setAddedIds(new Set());
    setPlaylists([]);
    setOpenedPlaylist(null);
    setPlaylistTracks([]);
  }

  /* ===================================================
     渲染
     =================================================== */

  if (session === undefined) {
    return (
      <div className="music-nt-panel">
        <div className="music-nt-loading">
          <Loader2 size={18} className="music-nt-spin" />
        </div>
      </div>
    );
  }

  /* 未登录 */
  if (!session) {
    return (
      <div className="music-nt-panel">
        <div className="music-nt-mode-tabs">
          <button
            className={mode === "qr" ? "active" : ""}
            onClick={() => setMode("qr")}
          >
            <QrCode size={14} strokeWidth={2.2} />
            扫码登录
          </button>
          <button
            className={mode === "cookie" ? "active" : ""}
            onClick={() => setMode("cookie")}
          >
            <KeyRound size={14} strokeWidth={2.2} />
            Cookie 登录
          </button>
        </div>

        {mode === "qr" ? (
          <>
            <div className="music-nt-qr-wrap">
              {qrImg ? (
                <img
                  src={qrImg}
                  alt="登录二维码"
                  className="music-nt-qr"
                />
              ) : (
                <div className="music-nt-qr-placeholder">
                  <Loader2
                    size={22}
                    className="music-nt-spin"
                  />
                </div>
              )}
            </div>

            <p className="music-nt-hint">
              用网易云 App 扫码登录
            </p>
            <p className="music-nt-status">
              {qrStatus === "loading" && "正在获取二维码…"}
              {qrStatus === "waiting" && "等待扫码…"}
              {qrStatus === "scanned" &&
                "已扫码，请在手机上确认"}
              {qrStatus === "expired" && "二维码已失效"}
            </p>
            {qrStatus === "expired" && (
              <button
                className="music-nt-retry"
                onClick={() => void startQrFlow()}
              >
                刷新二维码
              </button>
            )}
          </>
        ) : (
          <div className="music-nt-cookie-form">
            <p className="music-nt-cookie-tip">
              <b>步骤：</b>
              <br />
              1. 电脑 Chrome 打开{" "}
              <b>music.163.com</b> 并登录
              <br />
              2. F12 → <b>Application</b> → Storage →
              Cookies → <code>https://music.163.com</code>
              <br />
              3. 找到 <code>MUSIC_U</code>，双击 Value 全选复制
              <br />
              4. 再找 <code>__csrf</code>，复制它的 Value
              <br />
              5. 拼成 <code>MUSIC_U=xxx; __csrf=yyy</code> 粘贴
            </p>

            <textarea
              className="music-nt-cookie-input"
              value={cookieInput}
              onChange={(e) =>
                setCookieInput(e.target.value)
              }
              placeholder="MUSIC_U=...; __csrf=..."
              rows={5}
              spellCheck={false}
              autoComplete="off"
            />

            {cookieError && (
              <p className="music-nt-cookie-error">
                {cookieError}
              </p>
            )}

            <button
              className="music-nt-cookie-save"
              onClick={() => void handleSaveCookie()}
              disabled={savingCookie}
            >
              {savingCookie ? (
                <>
                  <Loader2
                    size={14}
                    className="music-nt-spin"
                  />
                  验证中…
                </>
              ) : (
                "保存并登录"
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  /* 已登录 */
  return (
    <div className="music-nt-panel">
      {/* 用户条 */}
      <div className="music-nt-user">
        {session.avatarUrl ? (
          <img
            src={session.avatarUrl}
            alt=""
            className="music-nt-avatar"
          />
        ) : (
          <div className="music-nt-avatar music-nt-avatar-empty" />
        )}
        <div className="music-nt-user-info">
          <strong>{session.nickname}</strong>
          <small>已登录网易云</small>
        </div>
        <button
          className="music-nt-logout"
          onClick={handleLogout}
          title="退出登录"
        >
          <LogOut size={14} strokeWidth={2.2} />
        </button>
      </div>

      {/* 子 tab: 搜索 / 我的歌单 */}
      <div className="music-nt-mode-tabs">
        <button
          className={view === "search" ? "active" : ""}
          onClick={() => {
            setView("search");
            setOpenedPlaylist(null);
          }}
        >
          <Search size={14} strokeWidth={2.2} />
          搜索歌曲
        </button>
        <button
          className={
            view === "playlists" ? "active" : ""
          }
          onClick={() => {
            setView("playlists");
            setOpenedPlaylist(null);
          }}
        >
          我的歌单
        </button>
      </div>

      {view === "search" && (
        <>
          <div className="music-nt-search">
            <input
              type="text"
              value={keyword}
              placeholder="搜索歌名 / 歌手"
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  void handleSearch();
              }}
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching}
            >
              {searching ? (
                <Loader2
                  size={14}
                  className="music-nt-spin"
                />
              ) : (
                <Search size={14} strokeWidth={2.4} />
              )}
            </button>
          </div>

          <div className="music-nt-results">
            {results.length === 0 ? (
              <div className="music-nt-empty">
                {searching ? "搜索中…" : "搜索一首歌试试"}
              </div>
            ) : (
              results.map((s) => {
                const added = addedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="music-nt-row"
                  >
                    {s.cover ? (
                      <img
                        src={s.cover}
                        alt=""
                        className="music-nt-row-cover"
                      />
                    ) : (
                      <div className="music-nt-row-cover music-nt-row-cover-empty" />
                    )}
                    <div className="music-nt-row-info">
                      <strong>{s.name}</strong>
                      <small>
                        {s.artists}
                        {s.album ? ` · ${s.album}` : ""}
                      </small>
                    </div>
                    <button
                      className="music-nt-row-add"
                      onClick={() => handleAddSong(s)}
                      disabled={added}
                      title={added ? "已添加" : "添加"}
                    >
                      {added ? (
                        "已加"
                      ) : (
                        <Plus
                          size={14}
                          strokeWidth={2.6}
                        />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {view === "playlists" && !openedPlaylist && (
        <>
          {playlists.length === 0 && !loadingPlaylists && (
            <button
              className="music-nt-load-playlists"
              onClick={() => void loadPlaylists()}
            >
              点击加载我的歌单
            </button>
          )}

          {loadingPlaylists && (
            <div className="music-nt-empty">
              <Loader2
                size={16}
                className="music-nt-spin"
              />
              <span style={{ marginLeft: 8 }}>
                加载中…
              </span>
            </div>
          )}

          {playlists.length > 0 && (
            <div className="music-nt-playlist-grid">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  className="music-nt-playlist-card"
                  onClick={() => void openPlaylist(pl)}
                >
                  {pl.cover ? (
                    <img
                      src={pl.cover}
                      alt=""
                      className="music-nt-playlist-cover"
                    />
                  ) : (
                    <div className="music-nt-playlist-cover music-nt-playlist-cover-empty" />
                  )}
                  <div className="music-nt-playlist-name">
                    {pl.name}
                  </div>
                  <div className="music-nt-playlist-count">
                    {pl.trackCount} 首
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {view === "playlists" && openedPlaylist && (
        <>
          <button
            className="music-nt-back"
            onClick={() => {
              setOpenedPlaylist(null);
              setPlaylistTracks([]);
            }}
          >
            <ChevronLeft size={14} strokeWidth={2.6} />
            返回歌单列表
          </button>

          <div className="music-nt-pl-header">
            {openedPlaylist.cover ? (
              <img
                src={openedPlaylist.cover}
                alt=""
                className="music-nt-pl-header-cover"
              />
            ) : (
              <div className="music-nt-pl-header-cover music-nt-pl-header-cover-empty" />
            )}
            <div className="music-nt-pl-header-info">
              <strong>{openedPlaylist.name}</strong>
              <small>
                {openedPlaylist.trackCount} 首 ·{" "}
                {openedPlaylist.creator}
              </small>
            </div>
          </div>

          {loadingTracks ? (
            <div className="music-nt-empty">
              <Loader2
                size={16}
                className="music-nt-spin"
              />
              <span style={{ marginLeft: 8 }}>
                加载歌曲中…
              </span>
            </div>
          ) : (
            <>
              <div className="music-nt-pl-actions">
                <button onClick={toggleAll}>
                  {selectedIds.size ===
                  playlistTracks.filter(
                    (t) => !addedIds.has(t.id)
                  ).length
                    ? "取消全选"
                    : "全选"}
                </button>
                <span className="music-nt-pl-selcount">
                  已选 {selectedIds.size} /{" "}
                  {playlistTracks.length}
                </span>
              </div>

              <div className="music-nt-results">
                {playlistTracks.map((t) => {
                  const added = addedIds.has(t.id);
                  const checked = selectedIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      className={
                        "music-nt-track-row" +
                        (added ? " is-added" : "")
                      }
                      onClick={() => toggleOne(t.id)}
                      disabled={added}
                    >
                      <span
                        className={
                          "music-nt-track-check" +
                          (checked ? " checked" : "") +
                          (added ? " disabled" : "")
                        }
                      >
                        {checked && "✓"}
                        {added && "·"}
                      </span>
                      <span className="music-nt-track-text">
                        <strong>{t.name}</strong>
                        <small>
                          {t.artists}
                          {added ? " · 已在库" : ""}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                className="music-nt-import-btn"
                onClick={() => void handleImport()}
                disabled={
                  importing || selectedIds.size === 0
                }
              >
                {importing ? (
                  <>
                    <Loader2
                      size={14}
                      className="music-nt-spin"
                    />
                    导入中…
                  </>
                ) : (
                  `导入选中 ${selectedIds.size} 首`
                )}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}