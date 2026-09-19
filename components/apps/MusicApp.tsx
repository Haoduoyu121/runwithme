"use client";

import { useEffect, useRef, useState } from "react";

import {
  Check,
  ChevronLeft,
  List,
  MessageCircle,
  Music as MusicIcon,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Upload,
  X,
} from "lucide-react";

import { useMusic, formatTime } from "@/lib/MusicContext";
import { useSystem } from "@/lib/SystemContext";
import { useChat } from "@/lib/ChatContext";
import { getChatFile } from "@/lib/chatFiles";
import { useMusicInvite } from "@/lib/MusicInviteContext";

import {
  loadListenPartner,
  saveListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";

import { createMessageId } from "@/data/chat";
import { defaultMusic } from "@/data/music";

import { loadMusic, saveMusic } from "@/lib/musicStorage";

import {
  saveMusicCover,
  getMusicCover,
} from "@/lib/musicCoverFiles";

import {
  loadMusicChatMessages,
  saveMusicChatMessages,
  type MusicChatMessage,
} from "@/lib/musicChatStorage";
import { generateMusicReply } from "@/lib/musicChatReply";

import { pushMemory } from "@/lib/memoryStorage";

import MusicListDrawer from "@/components/apps/music/MusicListDrawer";
import MusicUploadPanel from "@/components/apps/music/MusicUploadPanel";
import MusicChatPanel from "@/components/apps/music/MusicChatPanel";
import MusicChatSettings from "@/components/apps/music/MusicChatSettings";

type MusicAppProps = { onBack: () => void };
type AvatarKey = "you" | "levi" | "erwin";

type InvitationState = {
  target: "Levi" | "Erwin" | "Both";
  status: "pending" | "accepted" | "rejected";
  acceptedBy: ("Levi" | "Erwin")[];
  rejectedBy: ("Levi" | "Erwin")[];
};

const ACCEPT_LINES = [
  "好啊，一起听。",
  "嗯，放吧。",
  "我正好想听歌。",
  "好呀，你选歌。",
  "行，戴上耳机了。",
];

const REJECT_LINES = [
  "现在不太想听。",
  "改天吧。",
  "手上还有事，下次。",
  "抱歉，现在不方便。",
  "先不听了。",
];

const TRACK_CHANGE_MIN_MS = 3 * 1000;
const TRACK_CHANGE_MAX_MS = 10 * 1000;
const PLAY_STATE_MIN_MS = 5 * 1000;
const PLAY_STATE_MAX_MS = 12 * 1000;
const SYSTEM_COOLDOWN_MS = 30 * 1000;

/* session 至少 3 秒才写入 Memory，防御短命 session */
const MIN_SESSION_MS = 3 * 1000;

/* iOS 上传修复：不用屏幕外 / 不用 zIndex: -1
   ref.click() 场景 → fixed 右下角 1x1 */
const IOS_SAFE_FILE_STYLE: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  right: 0,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
};

function pickLine(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

/* ★ Step 2：把毫秒差格式化成 01:24:36 */
function formatTogetherDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(
    m
  ).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ★ Step 3：时长的人类可读标签（给 Memory 标题用） */
function formatSessionLength(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
}

export default function MusicApp({ onBack }: MusicAppProps) {
  const {
    music,
    currentTime,
    duration,
    loading,
    error,
    isPlaying,
    currentTrack,
    reload,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
  } = useMusic();

  const { settings } = useSystem();
  const { addMessage } = useChat();
  const { triggerNow } = useMusicInvite();

  const [partner, setPartner] = useState<ListenPartner>("Solo");
  const [showPartnerPicker, setShowPartnerPicker] =
    useState(false);
  const [showList, setShowList] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [invitation, setInvitation] =
    useState<InvitationState | null>(null);

  const [showChat, setShowChat] = useState(false);
  const [showChatSettings, setShowChatSettings] =
    useState(false);
  const [chatMessages, setChatMessages] = useState<
    MusicChatMessage[]
  >([]);

  const [avatarUrls, setAvatarUrls] = useState<
    Record<AvatarKey, string | null>
  >({ you: null, levi: null, erwin: null });

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  /* ★ Step 2：一起听计时（纯运行时） */
  const [togetherStartAt, setTogetherStartAt] = useState<
    number | null
  >(null);
  const [togetherElapsed, setTogetherElapsed] =
    useState(0);

  const systemCooldownRef = useRef(0);
  const systemTimerRef = useRef<number | null>(null);

  /* ★ Step 3：session 追踪 refs */
  const prevPartnerRef = useRef<ListenPartner>("Solo");
  const sessionStartAtRef = useRef<number | null>(null);
  const sessionTrackIdsRef = useRef<Set<string>>(new Set());
  const sessionStartMsgCountRef = useRef(0);

  /* 让 effect 内读到最新 chatMessages.length，不受闭包限制 */
  const chatMessagesRef = useRef<MusicChatMessage[]>([]);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  /* -------------------------------------------------------
     初始化
     ------------------------------------------------------- */

  useEffect(() => {
    setPartner(loadListenPartner());
    setChatMessages(loadMusicChatMessages());
  }, []);

  useEffect(() => {
    function onChange() {
      setPartner(loadListenPartner());
    }
    window.addEventListener(
      "runwithme:listen-partner-change",
      onChange
    );
    return () => {
      window.removeEventListener(
        "runwithme:listen-partner-change",
        onChange
      );
    };
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    saveMusicChatMessages(chatMessages);
  }, [chatMessages]);

  /* -------------------------------------------------------
     ★ Step 2 + Step 3：一起听 session 生命周期
     - 进入非 Solo：开始计时 + 开 session
     - 回到 Solo：结束 session + 写入 Memory
     - 非 Solo → 另一个非 Solo：先结束旧的，再开新的
     ------------------------------------------------------- */

  useEffect(() => {
    if (partner === "Solo") {
      setTogetherStartAt(null);
      setTogetherElapsed(0);
      return;
    }

    const start = Date.now();
    setTogetherStartAt(start);
    setTogetherElapsed(0);

    const timer = window.setInterval(() => {
      setTogetherElapsed(Date.now() - start);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [partner]);

  useEffect(() => {
    const prev = prevPartnerRef.current;
    const next = partner;

    /* 结束旧 session（prev 非 Solo 且曾经真的开过） */
    if (prev !== "Solo" && sessionStartAtRef.current !== null) {
      finalizeSession(prev);
    }

    /* 开始新 session */
    if (next !== "Solo") {
      startSession();
    }

    prevPartnerRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  function startSession() {
    sessionStartAtRef.current = Date.now();
    sessionTrackIdsRef.current = new Set();
    sessionStartMsgCountRef.current =
      chatMessagesRef.current.length;

    /* 把当前正在播的歌也算进 session */
    if (currentTrack?.id) {
      sessionTrackIdsRef.current.add(currentTrack.id);
    }
  }

  function finalizeSession(endedPartner: ListenPartner) {
    const startAt = sessionStartAtRef.current;
    sessionStartAtRef.current = null;

    if (startAt === null) return;

    const endAt = Date.now();
    const durationMs = endAt - startAt;

    /* 太短就丢弃，避免误写 */
    if (durationMs < MIN_SESSION_MS) return;

    const trackCount = sessionTrackIdsRef.current.size;
    const startMsgCount = sessionStartMsgCountRef.current;
    const messageCount = Math.max(
      0,
      chatMessagesRef.current.length - startMsgCount
    );

    const partnerName =
      endedPartner === "Both"
        ? "Levi & Erwin"
        : endedPartner;

    const durationLabel = formatSessionLength(durationMs);

    const title = `与 ${partnerName} 一起听 · ${durationLabel}`;

    const parts: string[] = [];
    if (trackCount > 0) parts.push(`听了 ${trackCount} 首`);
    if (messageCount > 0) parts.push(`聊了 ${messageCount} 条`);
    const preview = parts.length > 0 ? parts.join(" · ") : undefined;

    pushMemory({
      sourceApp: "music",
      sourceId: `listen-session-${startAt}`,
      timestamp: endAt,
      type: "session",
      title,
      preview,
      meta: {
        partner: endedPartner,
        partnerName,
        durationMs,
        startAt,
        endAt,
        trackCount,
        messageCount,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<AvatarKey, string | null> = {
        you: null,
        levi: null,
        erwin: null,
      };
      for (const key of ["you", "levi", "erwin"] as AvatarKey[]) {
        if (!settings.avatars[key]) continue;
        const file = await getChatFile(`avatar-${key}`);
        if (!file) continue;
        const url = URL.createObjectURL(file);
        created.push(url);
        next[key] = url;
      }
      if (!cancelled) setAvatarUrls(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [settings.avatars]);

  useEffect(() => {
    if (!currentTrack) {
      setCoverUrl(null);
      return;
    }

    let cancelled = false;
    let url: string | null = null;

    async function load() {
      const coverId = currentTrack!.coverId;
      if (!coverId) {
        setCoverUrl(null);
        return;
      }
      const blob = await getMusicCover(coverId);
      if (!blob || cancelled) return;
      url = URL.createObjectURL(blob);
      setCoverUrl(url);
    }

    void load();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentTrack?.id, currentTrack?.coverId]);

  /* -------------------------------------------------------
     系统主动发消息（切歌 / 播放 / 暂停）
     ★ Step 3：切歌时顺便把 trackId 计入当前 session
     ------------------------------------------------------- */

  useEffect(() => {
    if (partner === "Solo") return;

    function fireSystemMessage(
      reason: string,
      minMs: number,
      maxMs: number
    ) {
      const now = Date.now();
      if (now - systemCooldownRef.current < SYSTEM_COOLDOWN_MS)
        return;
      systemCooldownRef.current = now;

      const delay = minMs + Math.random() * (maxMs - minMs);
      console.log(
        `[MusicChat] ${reason} · ${(delay / 1000).toFixed(
          1
        )}s 后回复`
      );

      if (systemTimerRef.current) {
        window.clearTimeout(systemTimerRef.current);
      }

      systemTimerRef.current = window.setTimeout(() => {
        systemTimerRef.current = null;
        const reply = generateMusicReply();
        if (!reply) return;
        setChatMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            sender: reply.sender,
            type: "text",
            text: reply.text,
            timestamp: Date.now(),
          },
        ]);
      }, delay);
    }

    const onTrackChange = (e: Event) => {
      fireSystemMessage(
        "切歌",
        TRACK_CHANGE_MIN_MS,
        TRACK_CHANGE_MAX_MS
      );

      /* ★ Step 3：收集 session 内的曲目 id */
      try {
        const ce = e as CustomEvent<{
          index: number;
          item?: { id?: string };
        }>;
        const id = ce.detail?.item?.id;
        if (id) sessionTrackIdsRef.current.add(id);
      } catch {
        /* ignore */
      }
    };
    const onPlay = () =>
      fireSystemMessage(
        "播放",
        PLAY_STATE_MIN_MS,
        PLAY_STATE_MAX_MS
      );
    const onPause = () =>
      fireSystemMessage(
        "暂停",
        PLAY_STATE_MIN_MS,
        PLAY_STATE_MAX_MS
      );

    window.addEventListener(
      "runwithme:music-track-change",
      onTrackChange
    );
    window.addEventListener("runwithme:music-play", onPlay);
    window.addEventListener("runwithme:music-pause", onPause);

    return () => {
      window.removeEventListener(
        "runwithme:music-track-change",
        onTrackChange
      );
      window.removeEventListener(
        "runwithme:music-play",
        onPlay
      );
      window.removeEventListener(
        "runwithme:music-pause",
        onPause
      );
      if (systemTimerRef.current) {
        window.clearTimeout(systemTimerRef.current);
        systemTimerRef.current = null;
      }
    };
  }, [partner]);

  /* -------------------------------------------------------
     派生数据
     ------------------------------------------------------- */

  const progress =
    duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  const listeners: AvatarKey[] = ["you"];
  if (partner === "Levi" || partner === "Both")
    listeners.push("levi");
  if (partner === "Erwin" || partner === "Both")
    listeners.push("erwin");

  const partnerName =
    partner === "Solo"
      ? "Solo"
      : partner === "Both"
        ? "Levi & Erwin"
        : partner;

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    seek(Number(e.target.value));
  }

  /* -------------------------------------------------------
     封面
     ------------------------------------------------------- */

  async function handleCoverUpload(file: File) {
    if (!currentTrack) return;
    const coverId = `cover-${currentTrack.id}`;
    try {
      await saveMusicCover(coverId, file);
      const list = loadMusic(defaultMusic);
      const next = list.map((m) =>
        m.id === currentTrack.id ? { ...m, coverId } : m
      );
      saveMusic(next);
      const url = URL.createObjectURL(file);
      setCoverUrl(url);
      reload();
    } catch (e) {
      console.error("保存封面失败:", e);
      alert("封面保存失败，请查看控制台。");
    }
  }

  /* -------------------------------------------------------
     用户主动邀请
     ------------------------------------------------------- */

  function handleSelectPartner(p: ListenPartner) {
    setShowPartnerPicker(false);

    if (p === "Solo") {
      setPartner("Solo");
      saveListenPartner("Solo");
      setInvitation(null);
      return;
    }

    const target = p as "Levi" | "Erwin" | "Both";
    const inviteText =
      target === "Both"
        ? "你们两个要不要一起听歌？"
        : `${target}，一起听歌吗？`;

    addMessage({
      id: createMessageId(),
      sender: "You",
      type: "text",
      text: inviteText,
      timestamp: Date.now(),
    });

    setInvitation({
      target,
      status: "pending",
      acceptedBy: [],
      rejectedBy: [],
    });

    const delay = 10000 + Math.random() * 5000;
    window.setTimeout(() => resolveInvitation(target), delay);
  }

  function resolveInvitation(
    target: "Levi" | "Erwin" | "Both"
  ) {
    let accepted: ("Levi" | "Erwin")[] = [];
    let rejected: ("Levi" | "Erwin")[] = [];

    if (target === "Both") {
      const r = Math.random();
      if (r < 0.5) accepted = ["Levi", "Erwin"];
      else if (r < 0.7) {
        accepted = ["Levi"];
        rejected = ["Erwin"];
      } else if (r < 0.9) {
        accepted = ["Erwin"];
        rejected = ["Levi"];
      } else {
        rejected = ["Levi", "Erwin"];
      }
    } else {
      if (Math.random() < 0.6) accepted = [target];
      else rejected = [target];
    }

    let offset = 0;
    accepted.forEach((who) => {
      addMessage({
        id: createMessageId(),
        sender: who,
        type: "text",
        text: pickLine(ACCEPT_LINES),
        timestamp: Date.now() + offset,
      });
      offset += 1;
    });
    rejected.forEach((who) => {
      addMessage({
        id: createMessageId(),
        sender: who,
        type: "text",
        text: pickLine(REJECT_LINES),
        timestamp: Date.now() + offset,
      });
      offset += 1;
    });

    let nextPartner: ListenPartner = "Solo";
    if (accepted.length === 2) nextPartner = "Both";
    else if (accepted.length === 1) nextPartner = accepted[0];
    setPartner(nextPartner);
    saveListenPartner(nextPartner);

    setInvitation({
      target,
      status: accepted.length > 0 ? "accepted" : "rejected",
      acceptedBy: accepted,
      rejectedBy: rejected,
    });

    window.setTimeout(() => setInvitation(null), 6000);
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  return (
    <main className="phone-screen app-screen music-app-v2">
      <header className="music-v2-header">
        <button
          className="music-v2-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <button
          className="music-v2-listeners"
          onClick={() => setShowPartnerPicker(true)}
          aria-label="一起听"
        >
          {listeners.map((key) => (
            <div
              key={key}
              className={`music-v2-listener-avatar music-v2-listener-${key}`}
            >
              {avatarUrls[key] ? (
                <img src={avatarUrls[key]!} alt={key} />
              ) : (
                <span>
                  {key === "you"
                    ? "Y"
                    : key === "levi"
                      ? "L"
                      : "E"}
                </span>
              )}
            </div>
          ))}
          <div className="music-v2-listener-add">
            <Plus size={20} strokeWidth={2.4} />
          </div>
        </button>

        <button
          className="music-v2-upload-btn"
          onClick={() => setShowUpload(true)}
          aria-label="音乐管理"
        >
          <Upload size={20} strokeWidth={2.2} />
        </button>
      </header>

      {/* ★ Step 2：一起听计时条 */}
      {partner !== "Solo" && togetherStartAt !== null && (
        <div className="music-v2-together-timer">
          <span className="music-v2-together-timer-dot" />
          <span>
            Together {partnerName}
          </span>
          <span className="music-v2-together-timer-time">
            {formatTogetherDuration(togetherElapsed)}
          </span>
        </div>
      )}

      {invitation && (
        <div
          className={`music-v2-invite-banner music-v2-invite-${invitation.status}`}
        >
          {invitation.status === "pending" && (
            <>
              <span className="music-v2-invite-dot" />
              正在等待回应…
            </>
          )}
          {invitation.status === "accepted" && (
            <>
              <Check size={14} strokeWidth={2.6} />
              <span>
                {invitation.acceptedBy.join(" & ")} 加入了
                {invitation.rejectedBy.length > 0 &&
                  ` · ${invitation.rejectedBy.join(
                    " & "
                  )} 没有接受`}
              </span>
            </>
          )}
          {invitation.status === "rejected" && (
            <>
              <X size={14} strokeWidth={2.6} />
              <span>没有回应，继续一个人听吧</span>
            </>
          )}
        </div>
      )}

      <section className="music-v2-disc-area">
        <button
          type="button"
          className={`music-v2-disc${
            isPlaying ? " is-playing" : ""
          }`}
          onClick={() => {
            if (!currentTrack) {
              alert("先添加一首音乐吧");
              return;
            }
            coverInputRef.current?.click();
          }}
          aria-label="上传专辑封面"
        >
          <div
            className={`music-v2-disc-cover${
              coverUrl ? " has-image" : ""
            }`}
          >
            {coverUrl ? (
              <img src={coverUrl} alt="专辑封面" />
            ) : (
              <MusicIcon size={54} strokeWidth={1.2} />
            )}
          </div>
        </button>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="ios-file-input-detached"
          style={IOS_SAFE_FILE_STYLE}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleCoverUpload(file);
            e.target.value = "";
          }}
        />
      </section>

      <section className="music-v2-info">
        {currentTrack ? (
          <>
            <div className="music-v2-title">
              {currentTrack.title}
            </div>
            <div className="music-v2-artist">
              {currentTrack.artist || "RunWithme"}
            </div>
            <div className="music-v2-progress-area">
              <input
                className="music-v2-progress"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(
                  currentTime,
                  duration || 0
                )}
                onChange={handleSeek}
                style={
                  {
                    "--music-progress": `${progress}%`,
                  } as React.CSSProperties
                }
              />
              <div className="music-v2-time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="music-v2-empty">
            还没有音乐，点右上角 ↑ 添加
          </div>
        )}
        {error && (
          <div className="music-v2-error">{error}</div>
        )}
      </section>

      <section className="music-v2-controls">
        <button
          className="music-v2-btn"
          onClick={() => void previousTrack()}
          aria-label="上一首"
          type="button"
        >
          <SkipBack
            size={24}
            strokeWidth={1.8}
            fill="currentColor"
          />
        </button>

        <button
          className="music-v2-play-btn"
          onClick={() => void togglePlay()}
          aria-label={isPlaying ? "暂停" : "播放"}
          type="button"
        >
          {loading ? (
            <span className="music-v2-play-dots">•••</span>
          ) : isPlaying ? (
            <Pause
              size={26}
              strokeWidth={1.8}
              fill="currentColor"
            />
          ) : (
            <Play
              size={26}
              strokeWidth={1.8}
              fill="currentColor"
            />
          )}
        </button>

        <button
          className="music-v2-btn"
          onClick={() => void nextTrack()}
          aria-label="下一首"
          type="button"
        >
          <SkipForward
            size={24}
            strokeWidth={1.8}
            fill="currentColor"
          />
        </button>
      </section>

      <button
        className="music-chat-fab"
        onClick={() => setShowChat((v) => !v)}
        aria-label="一起听聊天"
      >
        <MessageCircle size={20} strokeWidth={2} />
      </button>

      <button
        className="music-v2-list-btn"
        onClick={() => setShowList(true)}
        aria-label="播放列表"
      >
        <List size={20} strokeWidth={2.2} />
      </button>

      {showList && (
        <MusicListDrawer
          onClose={() => setShowList(false)}
          onSelect={(index) => {
            void playTrack(index);
            setShowList(false);
          }}
        />
      )}

      {showUpload && (
        <MusicUploadPanel
          onClose={() => {
            setShowUpload(false);
            reload();
          }}
        />
      )}

      {showChat && (
        <MusicChatPanel
          messages={chatMessages}
          onAddMessage={(msg) =>
            setChatMessages((prev) => [...prev, msg])
          }
          onClose={() => setShowChat(false)}
          onOpenSettings={() => setShowChatSettings(true)}
          partnerName={partnerName}
          disabled={partner === "Solo"}
        />
      )}

      {showChatSettings && (
        <MusicChatSettings
          onClose={() => setShowChatSettings(false)}
        />
      )}

      {showPartnerPicker && (
        <div
          className="music-v2-picker-backdrop"
          onClick={() => setShowPartnerPicker(false)}
        >
          <div
            className="music-v2-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="music-v2-picker-title">一起听</div>

            <div className="music-v2-picker-options">
              <button
                className={
                  partner === "Solo" ? "active" : ""
                }
                onClick={() =>
                  handleSelectPartner("Solo")
                }
              >
                <div className="music-v2-picker-avatar avatar-you">
                  Y
                </div>
                <small>单独听</small>
              </button>

              <button
                className={
                  partner === "Levi" ? "active" : ""
                }
                onClick={() =>
                  handleSelectPartner("Levi")
                }
              >
                <div className="music-v2-picker-avatar avatar-levi">
                  L
                </div>
                <small>邀请 Levi</small>
              </button>

              <button
                className={
                  partner === "Erwin" ? "active" : ""
                }
                onClick={() =>
                  handleSelectPartner("Erwin")
                }
              >
                <div className="music-v2-picker-avatar avatar-erwin">
                  E
                </div>
                <small>邀请 Erwin</small>
              </button>

              <button
                className={
                  partner === "Both" ? "active" : ""
                }
                onClick={() =>
                  handleSelectPartner("Both")
                }
              >
                <div className="music-v2-picker-avatar avatar-both">
                  L&E
                </div>
                <small>邀请两个</small>
              </button>
            </div>

            <button
              className="music-v2-picker-test"
              onClick={() => {
                setShowPartnerPicker(false);
                triggerNow();
              }}
            >
              [测试] 立即触发系统邀约
            </button>

            <button
              className="music-v2-picker-cancel"
              onClick={() => setShowPartnerPicker(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </main>
  );
}