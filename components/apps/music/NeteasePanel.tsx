"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ChevronDown,
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
  const [debugInfo, setDebugInfo] = useState("");
  const [qrStatus, setQrStatus] =
    useState<QrStatus>("loading");

  /* ★ Cookie 手动登录 */
  const [showCookieInput, setShowCookieInput] =
    useState(false);
  const [cookieInput, setCookieInput] = useState("");
  const [savingCookie, setSavingCookie] =
    useState(false);

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
    const firstDelay = 300;

    const tick = async () => {
      if (myFlow !== flowIdRef.current) return;

      try {
        const r = await checkQr(
          key,
          cookieAccumRef.current
        );
        if (myFlow !== flowIdRef.current) return;
                setDebugInfo(
          `最后一次: code=${r.code} (${new Date().toLocaleTimeString()})`
        );

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
    void startQrFlow();
  }, [session, startQrFlow]);

  /* ★ Cookie 手动登录保存 */
  async function handleSaveCookie() {
    const raw = cookieInput.trim();
    if (!raw) {
      alert("请粘贴 Cookie");
      return;
    }
    if (!raw.includes("MUSIC_U")) {
      alert(
        "Cookie 里没有 MUSIC_U，可能复制不完整。\n请从 music.163.com 的 document.cookie 复制全部内容。"
      );
      return;
    }

    setSavingCookie(true);
    try {
      /* 简单验证：用 cookie 搜一次，能通就说明有效 */
      const test = await searchSongs("test", raw, 1);
      /* 能走到这里 = 搜索接口没报错 */
      void test;
    } catch (e) {
      console.error(e);
      alert(
        "Cookie 似乎无效，搜索测试失败。\n请确认已登录 music.163.com 再复制。"
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
    setShowCookieInput(false);
    setSavingCookie(false);
  }

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

                {debugInfo && (
          <p style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "#888",
            textAlign: "center",
            fontFamily: "monospace",
          }}>
            {debugInfo}
          </p>
        )}

        {qrStatus === "expired" && (
          <button
            className="music-nt-retry"
            onClick={() => void startQrFlow()}
          >
            刷新二维码
          </button>
        )}

        {/* ★ Cookie 手动登录备用入口 */}
        <div className="music-nt-cookie-section">
          <button
            className="music-nt-cookie-toggle"
            onClick={() =>
              setShowCookieInput((v) => !v)
            }
          >
            <ChevronDown
              size={14}
              strokeWidth={2.2}
              style={{
                transform: showCookieInput
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
            扫码一直失效？点这里手动登录
          </button>

          {showCookieInput && (
            <div className="music-nt-cookie-form">
              <p className="music-nt-cookie-tip">
                1. 电脑浏览器登录{" "}
                <b>music.163.com</b>
                <br />
                2. 按 F12 → Console → 输入{" "}
                <code>document.cookie</code> 回车
                <br />
                3. 复制输出的全部内容，粘贴到下面
              </p>
              <textarea
                className="music-nt-cookie-input"
                value={cookieInput}
                onChange={(e) =>
                  setCookieInput(e.target.value)
                }
                placeholder="MUSIC_U=...; __csrf=...; ..."
                rows={4}
              />
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
                  "保存"
                )}
              </button>
            </div>
          )}
        </div>
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