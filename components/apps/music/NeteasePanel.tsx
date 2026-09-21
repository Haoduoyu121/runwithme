"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  LogOut,
  Plus,
  Search,
} from "lucide-react";

import {
  type NeteaseSession,
  getNeteaseSession,
  saveNeteaseSession,
  clearNeteaseSession,
} from "@/lib/neteaseSession";

import {
  fetchQrKey,
  fetchQrImage,
  checkQr,
  searchSongs,
  type NeteaseSong,
} from "@/lib/neteaseApi";

import {
  defaultMusic,
  type MusicItem,
} from "@/data/music";

import { loadMusic, saveMusic } from "@/lib/musicStorage";

type NeteasePanelProps = {
  onAdded?: () => void;
};

type QrStatus =
  | "loading"
  | "waiting"
  | "scanned"
  | "expired";

export default function NeteasePanel({
  onAdded,
}: NeteasePanelProps) {
  const [session, setSession] = useState<
    NeteaseSession | null | undefined
  >(undefined);

  const [qrImg, setQrImg] = useState("");
  const [qrStatus, setQrStatus] =
    useState<QrStatus>("loading");

  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NeteaseSong[]>(
    []
  );
  const [addedIds, setAddedIds] = useState<Set<number>>(
    new Set()
  );

  const pollRef = useRef<number | null>(null);
  const cookieAccumRef = useRef<string>("");
  /* ★ 用一个 ref 表示"本次扫码流程是否已被取消" */
  const flowIdRef = useRef(0);

  /* -------- 初次读 session -------- */
  useEffect(() => {
    setSession(getNeteaseSession());
  }, []);

  /* -------- 已登录时标记已添加 -------- */
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

  /* -------- 清理轮询 -------- */
  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPoll();
  }, [stopPoll]);

  /* -------- 扫码流程 -------- */
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
    let firstDelay = 300;

    const tick = async () => {
      if (myFlow !== flowIdRef.current) return;

      try {
        const r = await checkQr(
          key,
          cookieAccumRef.current
        );
        if (myFlow !== flowIdRef.current) return;

// 在 checkQr 返回后，将 803 判断提到最前
if (r.code === 803) {
  // ... 保存 session 逻辑
  return;
}

// 累积 cookie
if (r.cookie) cookieAccumRef.current = r.cookie;

// 收到 800 时，额外重试一次
if (r.code === 800) {
  try {
    const retry = await checkQr(key, cookieAccumRef.current);
    if (retry.code === 803) {
      // ... 保存 session 逻辑
      return;
    }
  } catch {}
  setQrStatus("expired");
  return;
}

// 调整轮询间隔
if (r.code === 801) {
  setQrStatus("waiting");
  interval = 700; // 恢复 700ms，避免过度请求
} else if (r.code === 802) {
  setQrStatus("scanned");
  interval = 300; // 加速到 300ms，抢 803 窗口
}

        pollRef.current = window.setTimeout(
          tick,
          interval
        );
      } catch (e) {
        console.error(e);
        if (myFlow !== flowIdRef.current) return;
        pollRef.current = window.setTimeout(tick, 1200);
      }
    };

    pollRef.current = window.setTimeout(
      tick,
      firstDelay
    );
  }, [stopPoll]);

  /* -------- 未登录时启动扫码 -------- */
  useEffect(() => {
    if (session === undefined) return;
    if (session) return;
    void startQrFlow();
    /* ★ 注意：不在这里 return stopPoll，
       否则 session 一变会误取消进行中的流程 */
  }, [session, startQrFlow]);

  /* -------- 搜索 -------- */
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

  /* -------- 添加 -------- */
  function handleAdd(song: NeteaseSong) {
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

  /* -------- 退出登录 -------- */
  function handleLogout() {
    if (!window.confirm("退出网易云登录？")) return;
    /* ★ 取消进行中的扫码 */
    flowIdRef.current++;
    stopPoll();
    clearNeteaseSession();
    setSession(null);
    setResults([]);
    setKeyword("");
    setAddedIds(new Set());
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

  if (!session) {
    return (
      <div className="music-nt-panel">
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
      </div>
    );
  }

  return (
    <div className="music-nt-panel">
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

      <div className="music-nt-search">
        <input
          type="text"
          value={keyword}
          placeholder="搜索歌名 / 歌手"
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSearch();
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
              <div key={s.id} className="music-nt-row">
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
                  onClick={() => handleAdd(s)}
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
    </div>
  );
}