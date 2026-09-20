"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  Folder,
  ImagePlus,
  Music as MusicIcon,
  Pause,
  Play,
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

import {
  loadTogetherStart,
  saveTogetherStart,
} from "@/lib/togetherSessionStorage";

import { createMessageId } from "@/data/chat";
import { emitWorldEvent } from "@/lib/worldEventsStorage";

import {
  loadPlaylists,
  type Playlist,
} from "@/lib/playlistStorage";

import { getMusicCover } from "@/lib/musicCoverFiles";
import { getPlaylistCover } from "@/lib/playlistCoverFiles";

import {
  loadMusicChatMessages,
  saveMusicChatMessages,
  type MusicChatMessage,
} from "@/lib/musicChatStorage";

import { pushMemory } from "@/lib/memoryStorage";

import MusicListDrawer from "@/components/apps/music/MusicListDrawer";
import MusicUploadPanel from "@/components/apps/music/MusicUploadPanel";
import MusicChatPanel from "@/components/apps/music/MusicChatPanel";
import MusicChatSettings from "@/components/apps/music/MusicChatSettings";
import TogetherAvatars from "@/components/apps/music/TogetherAvatars";
import FullPlayer from "@/components/apps/music/FullPlayer";

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

/** 切歌系统消息 5 分钟限流 */
const TRACK_CHANGE_COOLDOWN_MS = 5 * 60 * 1000;

const MIN_SESSION_MS = 3 * 1000;

function pickLine(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatSessionLength(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
}

type LibraryTab = "playlists" | "songs";

export default function MusicApp({ onBack }: MusicAppProps) {
  const {
    music,
    currentTime,
    duration,
    loading,
    error,
    isPlaying,
    currentTrack,
    playMode,
    reload,
    playTrack,
    togglePlay,
    nextTrack,
    seek,
    cyclePlayMode,
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

  const [showFullPlayer, setShowFullPlayer] =
    useState(false);

  const [libraryTab, setLibraryTab] =
    useState<LibraryTab>("playlists");
  const [openedPlaylistId, setOpenedPlaylistId] =
    useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>(
    []
  );
  const [playlistCoverUrls, setPlaylistCoverUrls] =
    useState<Record<string, string>>({});

  const [avatarUrls, setAvatarUrls] = useState<
    Record<AvatarKey, string | null>
  >({ you: null, levi: null, erwin: null });

  const [coverUrl, setCoverUrl] = useState<string | null>(
    null
  );
  const coverInputRef = useRef<HTMLInputElement | null>(
    null
  );

  const [togetherStartAt, setTogetherStartAt] = useState<
    number | null
  >(null);
  const [togetherElapsed, setTogetherElapsed] = useState(0);

  const trackChangeCooldownRef = useRef(0);

  const prevPartnerRef = useRef<ListenPartner>("Solo");
  const sessionStartAtRef = useRef<number | null>(null);
  const sessionTrackIdsRef = useRef<Set<string>>(new Set());
  const sessionStartMsgCountRef = useRef(0);

  const chatMessagesRef = useRef<MusicChatMessage[]>([]);
  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  const currentTrackRef = useRef(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const partnerRef = useRef(partner);
  useEffect(() => {
    partnerRef.current = partner;
  }, [partner]);

  /* 加载头像 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<AvatarKey, string | null> = {
        you: null,
        levi: null,
        erwin: null,
      };
      for (const key of [
        "you",
        "levi",
        "erwin",
      ] as AvatarKey[]) {
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

  /* 加载封面 */
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

  /* 初始化 */
  useEffect(() => {
    setPartner(loadListenPartner());
    setChatMessages(loadMusicChatMessages());
    setPlaylists(loadPlaylists());

    function onPlaylistsUpdated() {
      setPlaylists(loadPlaylists());
    }
    window.addEventListener(
      "runwithme:playlists-updated",
      onPlaylistsUpdated
    );
    return () => {
      window.removeEventListener(
        "runwithme:playlists-updated",
        onPlaylistsUpdated
      );
    };
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

  /* 一起听计时 */
  useEffect(() => {
    if (partner === "Solo") {
      setTogetherStartAt(null);
      setTogetherElapsed(0);
      saveTogetherStart(null);
      return;
    }

    const stored = loadTogetherStart();
    const start = stored ?? Date.now();
    if (!stored) saveTogetherStart(start);

    setTogetherStartAt(start);
    setTogetherElapsed(Date.now() - start);

    const timer = window.setInterval(() => {
      setTogetherElapsed(Date.now() - start);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [partner]);

  /* session 生命周期 */
  useEffect(() => {
    const prev = prevPartnerRef.current;
    const next = partner;

    if (prev !== "Solo" && sessionStartAtRef.current !== null) {
      finalizeSession(prev);
    }

    if (next !== "Solo") {
      startSession();
    }

    prevPartnerRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  function startSession() {
    const stored = loadTogetherStart();
    const start = stored ?? Date.now();
    if (!stored) saveTogetherStart(start);
    sessionStartAtRef.current = start;
    sessionTrackIdsRef.current = new Set();
    sessionStartMsgCountRef.current =
      chatMessagesRef.current.length;

    if (currentTrackRef.current?.id) {
      sessionTrackIdsRef.current.add(
        currentTrackRef.current.id
      );
    }
  }

  function finalizeSession(endedPartner: ListenPartner) {
    const startAt = sessionStartAtRef.current;
    sessionStartAtRef.current = null;
    saveTogetherStart(null);

    if (startAt === null) return;

    const endAt = Date.now();
    const durationMs = endAt - startAt;

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

  /* ---------- 系统消息统一入口 ---------- */

  function emitMusicSystem(
    text: string,
    worldType:
      | "invite-accepted"
      | "track-change"
  ) {
    /* 1. 加到 Music 聊天面板 */
    setChatMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        sender: "System",
        type: "system",
        text,
        timestamp: Date.now(),
      },
    ]);

    /* 2. 广播到 Chat App（走 worldEvents） */
    emitWorldEvent({
      app: "music",
      type: worldType,
      actor: "You",
      title: text,
    });
  }

  /* 切歌系统消息（5 分钟限流） */
  useEffect(() => {
    if (partner === "Solo") return;

    const onTrackChange = (e: Event) => {
      const ce = e as CustomEvent<{
        item?: { id?: string; title?: string };
      }>;
      const item = ce.detail?.item;
      if (!item?.title) return;

      if (item.id) {
        sessionTrackIdsRef.current.add(item.id);
      }

      const now = Date.now();
      if (
        now - trackChangeCooldownRef.current <
        TRACK_CHANGE_COOLDOWN_MS
      ) {
        return;
      }
      trackChangeCooldownRef.current = now;

      emitMusicSystem(
        `切到了《${item.title}》`,
        "track-change"
      );
    };

    window.addEventListener(
      "runwithme:music-track-change",
      onTrackChange
    );
    return () => {
      window.removeEventListener(
        "runwithme:music-track-change",
        onTrackChange
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  /* 派生 */
  const presentPartners: ("Levi" | "Erwin")[] = [];
  if (partner === "Levi" || partner === "Both")
    presentPartners.push("Levi");
  if (partner === "Erwin" || partner === "Both")
    presentPartners.push("Erwin");

  const partnerName =
    partner === "Solo"
      ? "Solo"
      : partner === "Both"
        ? "Levi & Erwin"
        : partner;

  const openedPlaylist = openedPlaylistId
    ? playlists.find((p) => p.id === openedPlaylistId) ??
      null
    : null;

  /* 封面 */
  async function handleCoverUpload(file: File) {
    if (!currentTrack) return;
    const { saveMusicCover } = await import(
      "@/lib/musicCoverFiles"
    );
    const { loadMusic, saveMusic } = await import(
      "@/lib/musicStorage"
    );
    const { defaultMusic } = await import("@/data/music");

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

  /* 邀请 */
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

    /* ★ 邀请被接受的系统消息 */
    if (accepted.length > 0) {
      const who =
        accepted.length === 2
          ? "Levi & Erwin"
          : accepted[0];
      emitMusicSystem(
        `${who} 接受了你的邀请，开始一起听`,
        "invite-accepted"
      );
    }

    window.setTimeout(() => setInvitation(null), 6000);
  }

  function handleAvatarClick() {
    if (partner === "Solo") {
      setShowPartnerPicker(true);
    } else {
      setShowChat(true);
    }
  }

  function handleClearChat() {
    if (chatMessages.length === 0) return;
    if (
      !window.confirm(
        "清空所有一起听聊天记录？此操作不可恢复。"
      )
    ) {
      return;
    }
    setChatMessages([]);
    saveMusicChatMessages([]);
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  return (
    <main className="phone-screen app-screen music-app-v2">
      {showFullPlayer && (
        <FullPlayer
          partner={partner}
          avatarUrls={avatarUrls}
          togetherElapsed={togetherElapsed}
          coverUrl={coverUrl}
          onClose={() => setShowFullPlayer(false)}
          onOpenList={() => setShowList(true)}
          onOpenChat={() => setShowChat(true)}
          onOpenPicker={() => setShowPartnerPicker(true)}
          onPickCover={() => {
            if (!currentTrack) {
              alert("先添加一首音乐吧");
              return;
            }
            coverInputRef.current?.click();
          }}
        />
      )}

      {!showFullPlayer && (
        <>
          <header className="music-v2-header">
            <button
              className="music-v2-back"
              onClick={() => {
                if (openedPlaylistId) {
                  setOpenedPlaylistId(null);
                } else {
                  onBack();
                }
              }}
              aria-label="返回"
            >
              <ChevronLeft size={26} strokeWidth={2.4} />
            </button>

            <div className="music-v2-title-wrap">
              <div className="music-v2-page-title">
                {openedPlaylist
                  ? openedPlaylist.name
                  : "Music"}
              </div>
              <div className="music-v2-page-sub">
                {openedPlaylist
                  ? `${openedPlaylist.musicIds.length} 首`
                  : "library"}
              </div>
            </div>

            <button
              className="music-v2-upload-btn"
              onClick={() => setShowUpload(true)}
              aria-label="音乐管理"
            >
              <Upload size={20} strokeWidth={2.2} />
            </button>
          </header>

          <div className="music-together-bar">
            <TogetherAvatars
              partner={partner}
              avatarUrls={avatarUrls}
              elapsedMs={togetherElapsed}
              showTimer={true}
              size={44}
              onClick={handleAvatarClick}
            />
          </div>

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

          {!openedPlaylist && (
            <div className="music-tabs">
              <button
                className={
                  libraryTab === "playlists"
                    ? "active"
                    : ""
                }
                onClick={() => setLibraryTab("playlists")}
              >
                歌单
              </button>
              <button
                className={
                  libraryTab === "songs" ? "active" : ""
                }
                onClick={() => setLibraryTab("songs")}
              >
                歌曲
              </button>
            </div>
          )}

          <div className="music-v2-scroll">
            {openedPlaylist ? (
              <PlaylistDetailInline
                playlist={openedPlaylist}
                music={music}
                coverUrl={
                  playlistCoverUrls[openedPlaylist.id]
                }
                currentTrackId={currentTrack?.id ?? null}
                onPlayFromPlaylist={(index) => {
                  void playTrack(index);
                  setOpenedPlaylistId(null);
                }}
              />
            ) : libraryTab === "playlists" ? (
              <PlaylistsGrid
                playlists={playlists}
                coverUrls={playlistCoverUrls}
                onOpen={(id) => setOpenedPlaylistId(id)}
              />
            ) : (
              <SongsList
                music={music}
                currentTrackId={currentTrack?.id ?? null}
                onSelect={(index) => void playTrack(index)}
              />
            )}
          </div>

          {currentTrack && (
            <MiniPlayer
              coverUrl={coverUrl}
              title={currentTrack.title}
              artist={currentTrack.artist || "RunWithme"}
              isPlaying={isPlaying}
              loading={loading}
              onExpand={() => setShowFullPlayer(true)}
              onTogglePlay={() => void togglePlay()}
              onNext={() => void nextTrack()}
            />
          )}
        </>
      )}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="ios-file-input-detached"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleCoverUpload(file);
          e.target.value = "";
        }}
      />

      {showList && (
        <MusicListDrawer
          onClose={() => setShowList(false)}
          onSelect={(index) => {
            void playTrack(index);
            setShowList(false);
          }}
          onCloseList={() => setShowList(false)}
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
          onOpenPartners={() => {
            setShowChat(false);
            setShowPartnerPicker(true);
          }}
          onOpenSettings={() => setShowChatSettings(true)}
          onClearChat={handleClearChat}
          partnerName={partnerName}
          presentPartners={presentPartners}
          disabled={presentPartners.length === 0}
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
                onClick={() => handleSelectPartner("Solo")}
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
                onClick={() => handleSelectPartner("Levi")}
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
                onClick={() => handleSelectPartner("Erwin")}
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
                onClick={() => handleSelectPartner("Both")}
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

/* ============================================================
   子组件
   ============================================================ */

function MiniPlayer({
  coverUrl,
  title,
  artist,
  isPlaying,
  loading,
  onExpand,
  onTogglePlay,
  onNext,
}: {
  coverUrl: string | null;
  title: string;
  artist: string;
  isPlaying: boolean;
  loading: boolean;
  onExpand: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
}) {
  return (
    <div className="music-mini-player">
      <button
        className="music-mini-player-info"
        onClick={onExpand}
        aria-label="展开播放器"
      >
        <span className="music-mini-player-cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" />
          ) : (
            <MusicIcon size={20} strokeWidth={1.8} />
          )}
        </span>
        <span className="music-mini-player-text">
          <strong>{title}</strong>
          <small>{artist}</small>
        </span>
      </button>

      <button
        className="music-mini-player-btn"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "暂停" : "播放"}
      >
        {loading ? (
          <span className="music-mini-player-dots">
            •••
          </span>
        ) : isPlaying ? (
          <Pause
            size={22}
            strokeWidth={1.8}
            fill="currentColor"
          />
        ) : (
          <Play
            size={22}
            strokeWidth={1.8}
            fill="currentColor"
          />
        )}
      </button>

      <button
        className="music-mini-player-btn"
        onClick={onNext}
        aria-label="下一首"
      >
        <Play
          size={18}
          strokeWidth={1.8}
          fill="currentColor"
        />
      </button>
    </div>
  );
}

function PlaylistsGrid({
  playlists,
  coverUrls,
  onOpen,
}: {
  playlists: Playlist[];
  coverUrls: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="music-grid">
      {playlists.map((pl) => {
        const url = coverUrls[pl.id];
        return (
          <button
            key={pl.id}
            className="music-grid-cell"
            onClick={() => onOpen(pl.id)}
            type="button"
          >
            <div className="music-grid-cover">
              {url ? (
                <img src={url} alt="" />
              ) : (
                <Folder
                  size={32}
                  strokeWidth={1.6}
                />
              )}
            </div>
            <div className="music-grid-title">
              {pl.name}
            </div>
            <div className="music-grid-sub">
              {pl.musicIds.length} 首
            </div>
          </button>
        );
      })}
      <div className="music-grid-hint">
        去右上角 ↑ 管理音乐，或在「歌曲」里点 ⋯ 添加到歌单
      </div>
    </div>
  );
}

function SongsList({
  music,
  currentTrackId,
  onSelect,
}: {
  music: { id: string; title: string; artist: string }[];
  currentTrackId: string | null;
  onSelect: (index: number) => void;
}) {
  if (music.length === 0) {
    return (
      <div className="music-empty">
        <div className="music-empty-icon">
          <MusicIcon size={40} strokeWidth={1.4} />
        </div>
        <div className="music-empty-title">
          还没有音乐
        </div>
        <div className="music-empty-desc">
          点右上角 ↑ 添加
        </div>
      </div>
    );
  }

  return (
    <ul className="music-song-list">
      {music.map((item, index) => {
        const isCurrent = item.id === currentTrackId;
        return (
          <li key={item.id}>
            <button
              className={`music-song-item${
                isCurrent ? " is-current" : ""
              }`}
              onClick={() => onSelect(index)}
              type="button"
            >
              <span className="music-song-index">
                {isCurrent ? "♪" : index + 1}
              </span>
              <span className="music-song-text">
                <strong>{item.title}</strong>
                <small>
                  {item.artist || "RunWithme"}
                </small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PlaylistDetailInline({
  playlist,
  music,
  coverUrl,
  currentTrackId,
  onPlayFromPlaylist,
}: {
  playlist: Playlist;
  music: {
    id: string;
    title: string;
    artist: string;
  }[];
  coverUrl?: string;
  currentTrackId: string | null;
  onPlayFromPlaylist: (index: number) => void;
}) {
  const songs = playlist.musicIds
    .map((id) => music.find((m) => m.id === id))
    .filter(
      (
        m
      ): m is {
        id: string;
        title: string;
        artist: string;
      } => !!m
    );

  return (
    <>
      <div className="music-playlist-hero">
        <div className="music-playlist-hero-cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" />
          ) : (
            <ImagePlus
              size={36}
              strokeWidth={1.4}
            />
          )}
        </div>
        <div className="music-playlist-hero-info">
          <div className="music-playlist-hero-name">
            {playlist.name}
          </div>
          <div className="music-playlist-hero-sub">
            {songs.length} 首
          </div>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="music-empty">
          <div className="music-empty-title">
            这个歌单还没有歌
          </div>
          <div className="music-empty-desc">
            去「歌曲」里点 ⋯ 添加
          </div>
        </div>
      ) : (
        <ul className="music-song-list">
          {songs.map((item, index) => {
            const isCurrent = item.id === currentTrackId;
            return (
              <li key={item.id}>
                <button
                  className={`music-song-item${
                    isCurrent ? " is-current" : ""
                  }`}
                  onClick={() =>
                    onPlayFromPlaylist(index)
                  }
                  type="button"
                >
                  <span className="music-song-index">
                    {isCurrent ? "♪" : index + 1}
                  </span>
                  <span className="music-song-text">
                    <strong>{item.title}</strong>
                    <small>
                      {item.artist || "RunWithme"}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}