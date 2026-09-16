"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useMusic, formatTime } from "@/lib/MusicContext";
import { useSystem } from "@/lib/SystemContext";
import { useChat } from "@/lib/ChatContext";
import { getChatFile } from "@/lib/chatFiles";

import {
  loadListenPartner,
  saveListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";

import { createMessageId } from "@/data/chat";

import {
  defaultMusic,
} from "@/data/music";

import {
  loadMusic,
  saveMusic,
} from "@/lib/musicStorage";

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

const IOS_SAFE_FILE_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
  zIndex: -1,
};

function pickLine(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function MusicApp({ onBack }: MusicAppProps) {
  const {
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

  /* ★ 封面 */
  const [coverUrl, setCoverUrl] = useState<string | null>(
    null
  );
  const coverInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const systemCooldownRef = useRef(0);
  const systemTimerRef = useRef<number | null>(null);

  /* -------------------------------------------------------
     初始化
     ------------------------------------------------------- */

  useEffect(() => {
    setPartner(loadListenPartner());
    setChatMessages(loadMusicChatMessages());
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    saveMusicChatMessages(chatMessages);
  }, [chatMessages]);

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

  /* ★ 加载当前歌曲封面 */
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
     系统主动发消息
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
        `[MusicChat] ${reason} · ${(delay / 1000).toFixed(1)}s 后回复`
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

    const onTrackChange = () =>
      fireSystemMessage(
        "切歌",
        TRACK_CHANGE_MIN_MS,
        TRACK_CHANGE_MAX_MS
      );
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

      /* 更新 localStorage */
      const list = loadMusic(defaultMusic);
      const next = list.map((m) =>
        m.id === currentTrack.id ? { ...m, coverId } : m
      );
      saveMusic(next);

      /* 立即显示 */
      const url = URL.createObjectURL(file);
      setCoverUrl(url);

      /* 同步刷新 MusicContext */
      reload();
    } catch (e) {
      console.error("保存封面失败:", e);
      alert("封面保存失败，请查看控制台。");
    }
  }

  /* -------------------------------------------------------
     邀请流程
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
          ‹
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
          <div className="music-v2-listener-add">+</div>
        </button>

        <button
          className="music-v2-upload-btn"
          onClick={() => setShowUpload(true)}
          aria-label="音乐管理"
        >
          ↑
        </button>
      </header>

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
              ✓ {invitation.acceptedBy.join(" & ")} 加入了
              {invitation.rejectedBy.length > 0 &&
                ` · ${invitation.rejectedBy.join(
                  " & "
                )} 没有接受`}
            </>
          )}
          {invitation.status === "rejected" && (
            <>✕ 没有回应，继续一个人听吧</>
          )}
        </div>
      )}

      {/* 唱片（点击上传封面） */}
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
              <span>♪</span>
            )}
          </div>
        </button>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
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
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 5h2.2v14H6z" />
            <path d="M20 5v14L9.5 12z" />
          </svg>
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
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect
                x="6"
                y="5"
                width="4.2"
                height="14"
                rx="1"
              />
              <rect
                x="13.8"
                y="5"
                width="4.2"
                height="14"
                rx="1"
              />
            </svg>
          ) : (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>

        <button
          className="music-v2-btn"
          onClick={() => void nextTrack()}
          aria-label="下一首"
          type="button"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.8 5H18v14h-2.2z" />
            <path d="M4 5v14l10.5-7z" />
          </svg>
        </button>
      </section>

      <button
        className="music-chat-fab"
        onClick={() => setShowChat((v) => !v)}
        aria-label="一起听聊天"
      >
        💬
      </button>

      <button
        className="music-v2-list-btn"
        onClick={() => setShowList(true)}
        aria-label="播放列表"
      >
        <span />
        <span />
        <span />
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