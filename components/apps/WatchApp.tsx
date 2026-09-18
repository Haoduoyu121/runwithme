"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ChevronLeft,
  Film,
  Heart,
  Maximize2,
  Minimize2,
  Pause,
  PenLine,
  Play,
  Plus,
  RotateCw,
  Send,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { pickWatchCard } from "@/lib/watchCards";
import {
  loadWatchSettings,
  saveWatchSettings,
  type WatchSettings,
} from "@/lib/watchSettings";
import WatchCardEditor from "@/components/watch/WatchCardEditor";

import {
  useCharacterAvatars,
} from "@/lib/useCharacterAvatars";

type WatchAppProps = {
  onBack: () => void;
};

type VideoSource =
  | { kind: "local"; url: string; name: string; size: number }
  | {
      kind: "bilibili";
      bvid: string;
      page: number;
      playerUrl: string;
    };

type Partner = "levi" | "erwin";
type Invitee = Partner | "both";
type InviteOutcome = "pending" | "accepted" | "rejected";

type InviteState = {
  invitee: Invitee;
  outcomes: Partial<Record<Partner, InviteOutcome>>;
};

type WatchMessage = {
  id: string;
  role: "you" | "system" | Partner;
  text: string;
  at: number;
};

const MAX_LOCAL_SIZE = 2 * 1024 * 1024 * 1024;
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const PARTNER_NAME: Record<Partner, string> = {
  levi: "Levi",
  erwin: "Erwin",
};

const PARTNER_AVATAR: Record<Partner, string> = {
  levi: "L",
  erwin: "E",
};

const SINGLE_DELAY_MIN = 6000;
const SINGLE_DELAY_MAX = 15000;
const LEVI_DELAY_MIN = 6000;
const LEVI_DELAY_MAX = 12000;
const ERWIN_DELAY_MIN = 10000;
const ERWIN_DELAY_MAX = 20000;

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function parseBilibiliUrl(
  input: string
): { bvid: string; page: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const bvOnly = trimmed.match(/^(BV[0-9A-Za-z]{10})$/);
  if (bvOnly) return { bvid: bvOnly[1], page: 1 };

  const bvMatch = trimmed.match(/(BV[0-9A-Za-z]{10})/);
  if (!bvMatch) return null;
  const bvid = bvMatch[1];

  let page = 1;
  try {
    const url = new URL(trimmed);
    const p = url.searchParams.get("p");
    if (p) {
      const n = Number.parseInt(p, 10);
      if (Number.isFinite(n) && n > 0) page = n;
    }
  } catch {
    /* 忽略 */
  }

  return { bvid, page };
}

/* ---------- 主组件 ---------- */

export default function WatchApp({ onBack }: WatchAppProps) {
  const avatars = useCharacterAvatars();

  const [source, setSource] = useState<VideoSource | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [tab, setTab] = useState<"local" | "bilibili">("local");
  const [biliInput, setBiliInput] = useState("");
  const [biliError, setBiliError] = useState("");

  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [invite, setInvite] = useState<InviteState | null>(null);

  const [watchSettings, setWatchSettings] =
    useState<WatchSettings>({
      autoMessageEnabled: true,
    });
  const [showChatSettings, setShowChatSettings] =
    useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);

  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<WatchMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typingPartner, setTypingPartner] =
    useState<Partner | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showRateMenu, setShowRateMenu] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const inviteTimersRef = useRef<number[]>([]);
  const replyTimersRef = useRef<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoMsgFirstSentRef = useRef(false);
  const autoMsgTimerRef = useRef<number | null>(null);
  const hasPlayedOnceRef = useRef(false);

  function clearInviteTimers() {
    inviteTimersRef.current.forEach((id) =>
      window.clearTimeout(id)
    );
    inviteTimersRef.current = [];
  }

  function clearReplyTimers() {
    replyTimersRef.current.forEach((id) =>
      window.clearTimeout(id)
    );
    replyTimersRef.current = [];
  }

  useEffect(() => {
    return () => {
      clearInviteTimers();
      clearReplyTimers();
      if (source?.kind === "local") {
        URL.revokeObjectURL(source.url);
      }
    };
  }, [source]);

  useEffect(() => {
    if (!isFullscreen || !playing || !controlsVisible) return;
    const t = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [isFullscreen, playing, controlsVisible]);

  useEffect(() => {
    setWatchSettings(loadWatchSettings());
  }, []);

  const presentPartners: Partner[] = useMemo(() => {
    if (!invite) return [];
    const targets: Partner[] =
      invite.invitee === "both"
        ? ["levi", "erwin"]
        : [invite.invitee];
    return targets.filter(
      (p) => invite.outcomes[p] === "accepted"
    );
  }, [invite]);

  useEffect(() => {
    if (!invite || chatMode) return;
    if (presentPartners.length === 0) return;

    const t = window.setTimeout(() => {
      setChatMode(true);
      setMessages([
        {
          id: uid("sys"),
          role: "system",
          text:
            presentPartners
              .map((p) => PARTNER_NAME[p])
              .join("、") + " 来了",
          at: Date.now(),
        },
      ]);
    }, 1200);

    return () => window.clearTimeout(t);
  }, [invite, chatMode, presentPartners]);

  useEffect(() => {
    if (!chatMode) return;
    if (!watchSettings.autoMessageEnabled) return;
    if (presentPartners.length === 0) return;
    if (source === null) return;

    const isLocal = source.kind === "local";
    if (isLocal && !playing) return;

    let cancelled = false;
    let timerId: number | null = null;

    function schedule() {
      if (cancelled) return;

      const isFirst = !autoMsgFirstSentRef.current;
      const delay = isFirst
        ? 30000 + Math.random() * 60000
        : 120000 + Math.random() * 180000;

      timerId = window.setTimeout(() => {
        if (cancelled) return;

        const shouldSend = isFirst || Math.random() < 0.4;

        if (shouldSend) {
          const partner =
            presentPartners[
              Math.floor(
                Math.random() * presentPartners.length
              )
            ];
          const card = pickWatchCard(
            partner === "levi" ? "Levi" : "Erwin"
          );

          if (card) {
            setTypingPartner(partner);
            const replyId = window.setTimeout(() => {
              if (cancelled) return;
              setMessages((prev) => [
                ...prev,
                {
                  id: uid("auto"),
                  role: partner,
                  text: card.text,
                  at: Date.now(),
                },
              ]);
              setTypingPartner(null);
            }, 1200);
            replyTimersRef.current.push(replyId);
          }
        }

        autoMsgFirstSentRef.current = true;
        schedule();
      }, delay);

      autoMsgTimerRef.current = timerId;
    }

    schedule();

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [
    chatMode,
    watchSettings.autoMessageEnabled,
    presentPartners,
    source,
    playing,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, typingPartner]);

  /* ---------- 播放器 ---------- */

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  }

  function handleVolume(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const v = videoRef.current;
    if (!v) return;
    const vol = Number(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }

  function handleRate(rate: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
    setShowRateMenu(false);
  }

  function toggleFullscreen() {
    setIsFullscreen((s) => !s);
    setIsRotated(false);
    setControlsVisible(true);
    setShowRateMenu(false);
  }

  function toggleRotate() {
    setIsRotated((r) => !r);
  }

  function handleFullscreenTap() {
    setControlsVisible((v) => !v);
  }

  /* ---------- 导入 ---------- */

  function resetAll() {
    clearInviteTimers();
    clearReplyTimers();
    setInvite(null);
    setChatMode(false);
    setMessages([]);
    setChatInput("");
    setTypingPartner(null);
    autoMsgFirstSentRef.current = false;
    if (autoMsgTimerRef.current !== null) {
      window.clearTimeout(autoMsgTimerRef.current);
      autoMsgTimerRef.current = null;
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_LOCAL_SIZE) {
      window.alert(
        `视频过大（${formatSize(
          file.size
        )}），请选择 2GB 以内的文件`
      );
      return;
    }

    const url = URL.createObjectURL(file);

    resetAll();
    setSource({
      kind: "local",
      url,
      name: file.name,
      size: file.size,
    });
    setShowImport(false);
    setIsFullscreen(false);
    setIsRotated(false);
  }

  function handleBilibiliImport() {
    const parsed = parseBilibiliUrl(biliInput);

    if (!parsed) {
      setBiliError(
        "没找到 BV 号，支持 bilibili.com/video/BV... 或 BV 号本身"
      );
      return;
    }

    const playerUrl =
      `https://player.bilibili.com/player.html` +
      `?bvid=${parsed.bvid}` +
      `&p=${parsed.page}` +
      `&autoplay=0` +
      `&high_quality=1`;

    resetAll();
    setSource({
      kind: "bilibili",
      bvid: parsed.bvid,
      page: parsed.page,
      playerUrl,
    });
    setShowImport(false);
    setBiliInput("");
    setBiliError("");
  }

  function handleClear() {
    resetAll();
    setSource(null);
    setIsFullscreen(false);
    setIsRotated(false);
    setShowRateMenu(false);
  }

  function handleBack() {
    setIsFullscreen(false);
    setIsRotated(false);
    setShowRateMenu(false);
    onBack();
  }

  function openImport(nextTab: "local" | "bilibili" = "local") {
    setTab(nextTab);
    setBiliError("");
    setShowImport(true);
  }

  /* ---------- 邀请 ---------- */

  function startInvite(invitee: Invitee) {
    clearInviteTimers();
    clearReplyTimers();
    setMessages([]);
    setChatMode(false);
    setTypingPartner(null);
    autoMsgFirstSentRef.current = false;
    if (autoMsgTimerRef.current !== null) {
      window.clearTimeout(autoMsgTimerRef.current);
      autoMsgTimerRef.current = null;
    }

    const targets: Partner[] =
      invitee === "both" ? ["levi", "erwin"] : [invitee];

    const initial: Partial<Record<Partner, InviteOutcome>> = {};
    targets.forEach((t) => {
      initial[t] = "pending";
    });

    setInvite({ invitee, outcomes: initial });
    setShowInviteSheet(false);

    targets.forEach((t) => {
      let delay: number;
      if (invitee === "both") {
        delay =
          t === "levi"
            ? randBetween(LEVI_DELAY_MIN, LEVI_DELAY_MAX)
            : randBetween(ERWIN_DELAY_MIN, ERWIN_DELAY_MAX);
      } else {
        delay = randBetween(SINGLE_DELAY_MIN, SINGLE_DELAY_MAX);
      }

      const id = window.setTimeout(() => {
        const accepted = Math.random() < 0.5;
        setInvite((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            outcomes: {
              ...prev.outcomes,
              [t]: accepted ? "accepted" : "rejected",
            },
          };
        });
      }, delay);

      inviteTimersRef.current.push(id);
    });
  }

  function retryInvite() {
    if (!invite) return;
    startInvite(invite.invitee);
  }

  function cancelInvite() {
    clearInviteTimers();
    setInvite(null);
    setChatMode(false);
    setMessages([]);
    autoMsgFirstSentRef.current = false;
    if (autoMsgTimerRef.current !== null) {
      window.clearTimeout(autoMsgTimerRef.current);
      autoMsgTimerRef.current = null;
    }
  }

  const invitePartners: Partner[] = invite
    ? invite.invitee === "both"
      ? ["levi", "erwin"]
      : [invite.invitee]
    : [];

  const inviteAllDone =
    invite !== null &&
    invitePartners.every(
      (p) => invite.outcomes[p] !== "pending"
    );

  const inviteAnyAccepted =
    invite !== null &&
    invitePartners.some(
      (p) => invite.outcomes[p] === "accepted"
    );

  const inviteAllRejected =
    invite !== null && inviteAllDone && !inviteAnyAccepted;

  /* ---------- 聊天 ---------- */

  function maybeReact(chance: number, delayMs: number) {
    if (!chatMode) return;
    if (!watchSettings.autoMessageEnabled) return;
    if (presentPartners.length === 0) return;
    if (Math.random() > chance) return;

    const partner =
      presentPartners[
        Math.floor(Math.random() * presentPartners.length)
      ];
    const card = pickWatchCard(
      partner === "levi" ? "Levi" : "Erwin"
    );
    if (!card) return;

    const typingDelay = Math.max(400, delayMs - 1200);
    const typingId = window.setTimeout(() => {
      setTypingPartner(partner);
    }, typingDelay);
    replyTimersRef.current.push(typingId);

    const replyId = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("react"),
          role: partner,
          text: card.text,
          at: Date.now(),
        },
      ]);
      setTypingPartner(null);
    }, delayMs);
    replyTimersRef.current.push(replyId);
  }

  function handleSeekEnd() {
    maybeReact(0.3, 2500 + Math.random() * 2000);
  }

  function handleSend() {
    const text = chatInput.trim();
    if (!text) return;
    if (presentPartners.length === 0) return;

    const myMsg: WatchMessage = {
      id: uid("you"),
      role: "you",
      text,
      at: Date.now(),
    };

    setMessages((prev) => [...prev, myMsg]);
    setChatInput("");

    const partner =
      presentPartners[
        Math.floor(Math.random() * presentPartners.length)
      ];

    const delay = 2000 + Math.random() * 4000;

    const typingDelay = Math.max(400, delay - 1200);
    const typingId = window.setTimeout(() => {
      setTypingPartner(partner);
    }, typingDelay);
    replyTimersRef.current.push(typingId);

    const replyId = window.setTimeout(() => {
      const card = pickWatchCard(
        partner === "levi" ? "Levi" : "Erwin"
      );
      if (card) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid("reply"),
            role: partner,
            text: card.text,
            at: Date.now(),
          },
        ]);
      }
      setTypingPartner(null);
    }, delay);
    replyTimersRef.current.push(replyId);
  }

  function exitChat() {
    clearReplyTimers();
    setChatMode(false);
    setMessages([]);
    setTypingPartner(null);
    setInvite(null);
    autoMsgFirstSentRef.current = false;
    if (autoMsgTimerRef.current !== null) {
      window.clearTimeout(autoMsgTimerRef.current);
      autoMsgTimerRef.current = null;
    }
  }

  function formatMsgTime(t: number): string {
    const d = new Date(t);
    return d.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  /* ---------- 渲染 ---------- */

  const playerClass =
    "watch-player" +
    (isFullscreen ? " is-fullscreen" : "") +
    (isFullscreen && isRotated ? " is-rotated" : "");

  const controlsClass =
    "watch-controls" +
    (isFullscreen && !controlsVisible ? " is-hidden" : "");

  const showChatLayout =
    chatMode && presentPartners.length > 0;

  return (
    <div className="watch-app">
      <header className="watch-header">
        <button
          className="watch-back"
          onClick={handleBack}
          aria-label="Back"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="watch-header-center">
          <div className="watch-header-title">Watch</div>
          <div className="watch-header-sub">together</div>
        </div>

        <button
          className="watch-card-editor-btn"
          onClick={() => setShowCardEditor(true)}
          aria-label="编辑字卡池"
        >
          <PenLine size={18} strokeWidth={2} />
        </button>

        <button
          className="watch-import-btn"
          onClick={() => openImport()}
          aria-label="导入视频"
        >
          <Plus size={20} strokeWidth={2.4} />
        </button>
      </header>

      <main
        className={
          "watch-scroll" + (showChatLayout ? " is-chat" : "")
        }
      >
        {source === null ? (
          <div className="watch-empty">
            <div className="watch-empty-icon">
              <Film size={44} strokeWidth={1.4} />
            </div>
            <div className="watch-empty-title">还没有视频</div>
            <div className="watch-empty-desc">
              点右上角 + 导入本地 mp4，或粘贴 B 站链接
            </div>

            <div className="watch-empty-actions">
              <button
                className="watch-empty-btn"
                onClick={() => openImport("local")}
              >
                本地视频
              </button>
              <button
                className="watch-empty-btn"
                onClick={() => openImport("bilibili")}
              >
                B 站链接
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              "watch-play-wrap" +
              (showChatLayout ? " is-chat" : "")
            }
          >
            {source.kind === "local" ? (
              <div
                className={playerClass}
                onClick={
                  isFullscreen ? handleFullscreenTap : undefined
                }
              >
                <video
                  ref={videoRef}
                  className="watch-video"
                  src={source.url}
                  playsInline
                  preload="metadata"
                  onPlay={() => {
                    setPlaying(true);
                    if (hasPlayedOnceRef.current) {
                      maybeReact(
                        0.2,
                        2000 + Math.random() * 3000
                      );
                    }
                    hasPlayedOnceRef.current = true;
                  }}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={(e) =>
                    setCurrentTime(e.currentTarget.currentTime)
                  }
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration);
                    e.currentTarget.volume = volume;
                    e.currentTarget.playbackRate =
                      playbackRate;
                  }}
                  onEnded={() => setPlaying(false)}
                />

                {!showChatLayout && (
                  <div
                    className={controlsClass}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      className="watch-progress"
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={Math.min(
                        currentTime,
                        duration || 0
                      )}
                      onChange={handleSeek}
                      onPointerUp={handleSeekEnd}
                      onKeyUp={handleSeekEnd}
                      aria-label="进度"
                    />

                    <div className="watch-controls-row">
                      <button
                        className="watch-ctrl-btn"
                        onClick={togglePlay}
                        aria-label={
                          playing ? "暂停" : "播放"
                        }
                      >
                        {playing ? (
                          <Pause
                            size={18}
                            strokeWidth={1.8}
                            fill="currentColor"
                          />
                        ) : (
                          <Play
                            size={18}
                            strokeWidth={1.8}
                            fill="currentColor"
                          />
                        )}
                      </button>

                      <span className="watch-time">
                        {formatTime(currentTime)}
                        <span className="watch-time-sep">
                          {" / "}
                        </span>
                        {formatTime(duration)}
                      </span>

                      <div className="watch-volume">
                        <button
                          className="watch-ctrl-btn"
                          onClick={toggleMute}
                          aria-label={
                            muted ? "取消静音" : "静音"
                          }
                        >
                          {muted ? (
                            <VolumeX
                              size={18}
                              strokeWidth={1.8}
                            />
                          ) : (
                            <Volume2
                              size={18}
                              strokeWidth={1.8}
                            />
                          )}
                        </button>
                        <input
                          className="watch-volume-slider"
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={muted ? 0 : volume}
                          onChange={handleVolume}
                          aria-label="音量"
                        />
                      </div>

                      <div className="watch-rate-wrap">
                        <button
                          className="watch-ctrl-btn watch-rate-btn"
                          onClick={() =>
                            setShowRateMenu((v) => !v)
                          }
                          aria-label="倍速"
                        >
                          {playbackRate}×
                        </button>

                        {showRateMenu && (
                          <div className="watch-rate-menu">
                            {PLAYBACK_RATES.map((r) => (
                              <button
                                key={r}
                                className={
                                  "watch-rate-option" +
                                  (r === playbackRate
                                    ? " active"
                                    : "")
                                }
                                onClick={() => handleRate(r)}
                              >
                                {r}×
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {isFullscreen && (
                        <button
                          className="watch-ctrl-btn"
                          onClick={toggleRotate}
                          aria-label="旋转"
                        >
                          <RotateCw
                            size={18}
                            strokeWidth={1.8}
                          />
                        </button>
                      )}

                      <button
                        className="watch-ctrl-btn"
                        onClick={toggleFullscreen}
                        aria-label={
                          isFullscreen ? "退出全屏" : "全屏"
                        }
                      >
                        {isFullscreen ? (
                          <Minimize2
                            size={18}
                            strokeWidth={1.8}
                          />
                        ) : (
                          <Maximize2
                            size={18}
                            strokeWidth={1.8}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="watch-bili-stage">
                <iframe
                  className="watch-bili-iframe"
                  src={source.playerUrl}
                  allowFullScreen
                  scrolling="no"
                  allow="autoplay; encrypted-media"
                  title="bilibili-player"
                />
              </div>
            )}

            {showChatLayout ? (
              <div className="watch-chat">
                <div className="watch-chat-topbar">
                  <span className="watch-chat-topbar-label">
                    {presentPartners
                      .map((p) => PARTNER_NAME[p])
                      .join(" & ")}{" "}
                    一起看
                  </span>
                  <button
                    className="watch-chat-settings-btn"
                    onClick={() =>
                      setShowChatSettings(true)
                    }
                    aria-label="一起看设置"
                  >
                    <Settings
                      size={16}
                      strokeWidth={2}
                    />
                  </button>
                  <button
                    className="watch-chat-exit"
                    onClick={exitChat}
                    aria-label="退出一起看"
                  >
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </div>

                <div className="watch-chat-messages">
                  {messages.map((m) => {
                    if (m.role === "system") {
                      return (
                        <div
                          key={m.id}
                          className="watch-chat-system"
                        >
                          {m.text}
                        </div>
                      );
                    }

                    if (m.role === "you") {
                      return (
                        <div
                          key={m.id}
                          className="watch-chat-row is-you"
                        >
                          <div className="watch-chat-bubble-wrap">
                            <div className="watch-chat-bubble">
                              {m.text}
                            </div>
                            <div className="watch-chat-meta">
                              {formatMsgTime(m.at)}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const partner = m.role;
                    const avatarUrl = avatars[partner];

                    return (
                      <div
                        key={m.id}
                        className="watch-chat-row is-other"
                      >
                        <span
                          className={
                            "watch-chat-avatar " +
                            "watch-chat-avatar-" +
                            partner +
                            (avatarUrl ? " has-image" : "")
                          }
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={PARTNER_NAME[partner]}
                            />
                          ) : (
                            PARTNER_AVATAR[partner]
                          )}
                        </span>

                        <div className="watch-chat-bubble-wrap">
                          <div className="watch-chat-name">
                            {PARTNER_NAME[partner]}
                          </div>
                          <div className="watch-chat-bubble">
                            {m.text}
                          </div>
                          <div className="watch-chat-meta">
                            {formatMsgTime(m.at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typingPartner && (() => {
                    const avatarUrl =
                      avatars[typingPartner];
                    return (
                      <div className="watch-chat-row is-other">
                        <span
                          className={
                            "watch-chat-avatar " +
                            "watch-chat-avatar-" +
                            typingPartner +
                            (avatarUrl ? " has-image" : "")
                          }
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={PARTNER_NAME[typingPartner]}
                            />
                          ) : (
                            PARTNER_AVATAR[typingPartner]
                          )}
                        </span>
                        <div className="watch-chat-bubble-wrap">
                          <div className="watch-chat-name">
                            {PARTNER_NAME[typingPartner]}
                          </div>
                          <div className="watch-chat-bubble watch-chat-typing">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div ref={messagesEndRef} />
                </div>

                <div className="watch-chat-composer">
                  <input
                    className="watch-chat-input"
                    type="text"
                    value={chatInput}
                    placeholder="说点什么…"
                    onChange={(e) =>
                      setChatInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    className="watch-chat-send"
                    onClick={handleSend}
                    disabled={!chatInput.trim()}
                    aria-label="发送"
                  >
                    <Send size={16} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="watch-invite-zone">
                  {invite === null ? (
                    <button
                      className="watch-invite-trigger"
                      onClick={() =>
                        setShowInviteSheet(true)
                      }
                    >
                      <span className="watch-invite-trigger-icon">
                        <Heart
                          size={16}
                          strokeWidth={2}
                          fill="currentColor"
                        />
                      </span>
                      <span>邀请一起看</span>
                    </button>
                  ) : (
                    <div className="watch-invite-status">
                      <div className="watch-invite-status-title">
                        {inviteAllDone
                          ? inviteAnyAccepted
                            ? "有人来了"
                            : "都没空…"
                          : "正在发出邀请"}
                      </div>

                      <div className="watch-invite-status-list">
                        {invitePartners.map((p) => {
                          const outcome =
                            invite.outcomes[p] ?? "pending";
                          const avatarUrl = avatars[p];

                          return (
                            <div
                              key={p}
                              className={
                                "watch-invite-status-row is-" +
                                outcome
                              }
                            >
                              <span
                                className={
                                  "watch-invite-status-avatar" +
                                  (avatarUrl
                                    ? " has-image"
                                    : "")
                                }
                              >
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={PARTNER_NAME[p]}
                                  />
                                ) : (
                                  PARTNER_AVATAR[p]
                                )}
                              </span>
                              <span className="watch-invite-status-name">
                                {PARTNER_NAME[p]}
                              </span>
                              <span className="watch-invite-status-text">
                                {outcome === "pending" &&
                                  "正在赶来…"}
                                {outcome === "accepted" &&
                                  "来了 ♡"}
                                {outcome === "rejected" &&
                                  "说来不了"}
                              </span>
                              {outcome === "pending" && (
                                <span className="watch-invite-status-dots">
                                  <span />
                                  <span />
                                  <span />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="watch-invite-status-actions">
                        {!inviteAllDone && (
                          <button
                            className="watch-invite-action-btn"
                            onClick={cancelInvite}
                          >
                            取消
                          </button>
                        )}

                        {inviteAllRejected && (
                          <button
                            className="watch-invite-action-btn primary"
                            onClick={retryInvite}
                          >
                            重新邀请
                          </button>
                        )}

                        {inviteAllDone && inviteAnyAccepted && (
                          <div className="watch-invite-accepted-hint">
                            正在打开一起看…
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isFullscreen && (
                  <div className="watch-source-card">
                    <div className="watch-source-head">
                      <span className="watch-source-tag">
                        {source.kind === "local"
                          ? "本地"
                          : "B 站"}
                      </span>
                      <span className="watch-source-name">
                        {source.kind === "local"
                          ? source.name
                          : source.bvid}
                      </span>
                    </div>

                    {source.kind === "local" && (
                      <div className="watch-source-meta">
                        {formatSize(source.size)}
                      </div>
                    )}

                    {source.kind === "bilibili" && (
                      <div className="watch-source-meta">
                        分P：{source.page} · B 站播放器自带全屏
                      </div>
                    )}

                    <div className="watch-source-actions">
                      <button
                        className="watch-source-btn"
                        onClick={() =>
                          openImport(
                            source.kind === "local"
                              ? "local"
                              : "bilibili"
                          )
                        }
                      >
                        换一个
                      </button>
                      <button
                        className="watch-source-btn danger"
                        onClick={handleClear}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {showImport && (
        <div
          className="watch-import-backdrop"
          onClick={() => setShowImport(false)}
        >
          <div
            className="watch-import-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="watch-import-handle" />

            <div className="watch-import-tabs">
              <button
                className={
                  "watch-import-tab" +
                  (tab === "local" ? " active" : "")
                }
                onClick={() => {
                  setTab("local");
                  setBiliError("");
                }}
              >
                本地视频
              </button>
              <button
                className={
                  "watch-import-tab" +
                  (tab === "bilibili" ? " active" : "")
                }
                onClick={() => {
                  setTab("bilibili");
                  setBiliError("");
                }}
              >
                B 站链接
              </button>
            </div>

            {tab === "local" ? (
              <div className="watch-import-body">
                <p className="watch-import-hint">
                  支持 mp4 / mov / webm，单个文件 2GB 以内。
                  视频不会上传到任何服务器，只在你本机播放。
                </p>

                <label className="watch-file-label">
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    className="watch-file-input"
                    onChange={handleFileChange}
                  />
                  <span>选择视频文件</span>
                </label>
              </div>
            ) : (
              <div className="watch-import-body">
                <p className="watch-import-hint">
                  粘贴 bilibili 视频链接，或直接输入 BV 号。
                  <br />
                  例：
                  https://www.bilibili.com/video/BV1xx411c7mD?p=1
                  <br />
                  （暂不支持 b23.tv 短链，请先复制完整链接）
                </p>

                <input
                  className="watch-import-input"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="https://www.bilibili.com/video/BV..."
                  value={biliInput}
                  onChange={(e) => {
                    setBiliInput(e.target.value);
                    if (biliError) setBiliError("");
                  }}
                />

                {biliError && (
                  <div className="watch-import-error">
                    {biliError}
                  </div>
                )}

                <button
                  className="watch-import-confirm"
                  onClick={handleBilibiliImport}
                  disabled={!biliInput.trim()}
                >
                  导入
                </button>
              </div>
            )}

            <button
              className="watch-import-cancel"
              onClick={() => setShowImport(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showInviteSheet && (
        <div
          className="watch-invite-backdrop"
          onClick={() => setShowInviteSheet(false)}
        >
          <div
            className="watch-invite-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="watch-import-handle" />

            <div className="watch-invite-sheet-title">
              邀请谁一起看
            </div>
            <div className="watch-invite-sheet-sub">
              他们会各自决定来不来
            </div>

            <div className="watch-invite-options">
              <button
                className="watch-invite-option watch-invite-option-levi"
                onClick={() => startInvite("levi")}
              >
                <span
                  className={
                    "watch-invite-option-avatar" +
                    (avatars.levi ? " has-image" : "")
                  }
                >
                  {avatars.levi ? (
                    <img src={avatars.levi} alt="Levi" />
                  ) : (
                    "L"
                  )}
                </span>
                <span className="watch-invite-option-name">
                  Levi
                </span>
                <span className="watch-invite-option-desc">
                  单独
                </span>
              </button>

              <button
                className="watch-invite-option watch-invite-option-erwin"
                onClick={() => startInvite("erwin")}
              >
                <span
                  className={
                    "watch-invite-option-avatar" +
                    (avatars.erwin ? " has-image" : "")
                  }
                >
                  {avatars.erwin ? (
                    <img src={avatars.erwin} alt="Erwin" />
                  ) : (
                    "E"
                  )}
                </span>
                <span className="watch-invite-option-name">
                  Erwin
                </span>
                <span className="watch-invite-option-desc">
                  单独
                </span>
              </button>

              <button
                className="watch-invite-option watch-invite-option-both"
                onClick={() => startInvite("both")}
              >
                <span
                  className={
                    "watch-invite-option-avatar" +
                    (avatars.levi && avatars.erwin
                      ? " has-image"
                      : "")
                  }
                >
                  {avatars.levi && avatars.erwin ? (
                    <span className="watch-invite-option-avatar-both">
                      <img src={avatars.levi} alt="Levi" />
                      <img src={avatars.erwin} alt="Erwin" />
                    </span>
                  ) : (
                    "L·E"
                  )}
                </span>
                <span className="watch-invite-option-name">
                  三个人
                </span>
                <span className="watch-invite-option-desc">
                  一起
                </span>
              </button>
            </div>

            <button
              className="watch-import-cancel"
              onClick={() => setShowInviteSheet(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showChatSettings && (
        <div
          className="watch-import-backdrop"
          onClick={() => setShowChatSettings(false)}
        >
          <div
            className="watch-import-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="watch-import-handle" />

            <div className="watch-invite-sheet-title">
              一起看设置
            </div>
            <div className="watch-invite-sheet-sub">
              控制他们在播放中会不会主动说话
            </div>

            <div className="watch-settings-row">
              <div className="watch-settings-row-info">
                <strong>播放中主动发消息</strong>
                <small>
                  开启后他们会在视频播放时偶尔冒个泡
                </small>
              </div>
              <button
                className={
                  "watch-settings-switch" +
                  (watchSettings.autoMessageEnabled
                    ? " on"
                    : "")
                }
                onClick={() => {
                  const next = {
                    ...watchSettings,
                    autoMessageEnabled:
                      !watchSettings.autoMessageEnabled,
                  };
                  setWatchSettings(next);
                  saveWatchSettings(next);
                }}
                aria-label="切换主动消息"
              >
                <span />
              </button>
            </div>

            <button
              className="watch-import-cancel"
              onClick={() => setShowChatSettings(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {showCardEditor && (
        <WatchCardEditor
          onClose={() => setShowCardEditor(false)}
        />
      )}
    </div>
  );
}