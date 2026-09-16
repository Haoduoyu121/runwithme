"use client";

import { useEffect, useState } from "react";

import {
  useMusic,
  formatTime,
} from "@/lib/MusicContext";

import { useSystem } from "@/lib/SystemContext";
import { useChat } from "@/lib/ChatContext";
import { getChatFile } from "@/lib/chatFiles";

import {
  loadListenPartner,
  saveListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";

import { createMessageId } from "@/data/chat";

import MusicListDrawer from "@/components/apps/music/MusicListDrawer";
import MusicUploadPanel from "@/components/apps/music/MusicUploadPanel";

type MusicAppProps = {
  onBack: () => void;
};

type AvatarKey = "you" | "levi" | "erwin";

type InvitationState = {
  target: "Levi" | "Erwin" | "Both";
  status: "pending" | "accepted" | "rejected";
  acceptedBy: ("Levi" | "Erwin")[];
  rejectedBy: ("Levi" | "Erwin")[];
};

const ACCEPT_LINES = [
  "行，一起听。",
  "嗯，放吧。",
  "我正好想听歌。",
  "你选歌。",
  "行，戴上耳机了。",
];

const REJECT_LINES = [
  "现在不太想听。",
  "改天吧。",
  "手上还有事，下次。",
  "现在不方便。",
  "先不听了。",
];

function pickLine(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export default function MusicApp({ onBack }: MusicAppProps) {
  const {
    music,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    loading,
    error,
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

  const [partner, setPartner] =
    useState<ListenPartner>("Solo");
  const [showPartnerPicker, setShowPartnerPicker] =
    useState(false);
  const [showList, setShowList] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [invitation, setInvitation] =
    useState<InvitationState | null>(null);

  const [avatarUrls, setAvatarUrls] = useState<
    Record<AvatarKey, string | null>
  >({ you: null, levi: null, erwin: null });

  useEffect(() => {
    setPartner(loadListenPartner());
  }, []);

  /* 加载自定义头像 */
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

  const progress =
    duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  const listeners: AvatarKey[] = ["you"];
  if (partner === "Levi" || partner === "Both") {
    listeners.push("levi");
  }
  if (partner === "Erwin" || partner === "Both") {
    listeners.push("erwin");
  }

  function handleSeek(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    seek(Number(e.target.value));
  }

  /* -------------------------------------------------------
     ★ 邀请流程
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

    /* 1. 往 Chat 发一条你自己发出的邀请消息 */
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

    /* 2. UI 显示等待中 */
    setInvitation({
      target,
      status: "pending",
      acceptedBy: [],
      rejectedBy: [],
    });

    /* 3. 2.5 ~ 6.5 秒后返回结果 */
    const delay = 2500 + Math.random() * 4000;
    setTimeout(() => {
      resolveInvitation(target);
    }, delay);
  }

  function resolveInvitation(
    target: "Levi" | "Erwin" | "Both"
  ) {
    let accepted: ("Levi" | "Erwin")[] = [];
    let rejected: ("Levi" | "Erwin")[] = [];

    if (target === "Both") {
      const r = Math.random();
      if (r < 0.55) {
        accepted = ["Levi", "Erwin"];
      } else if (r < 0.78) {
        accepted = ["Levi"];
        rejected = ["Erwin"];
      } else if (r < 0.95) {
        accepted = ["Erwin"];
        rejected = ["Levi"];
      } else {
        rejected = ["Levi", "Erwin"];
      }
    } else {
      if (Math.random() < 0.6) {
        accepted = [target];
      } else {
        rejected = [target];
      }
    }

    /* 4. 往 Chat 发对方的回应 */
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

    /* 5. 更新 partner */
    let nextPartner: ListenPartner = "Solo";
    if (accepted.length === 2) nextPartner = "Both";
    else if (accepted.length === 1)
      nextPartner = accepted[0];

    setPartner(nextPartner);
    saveListenPartner(nextPartner);

    setInvitation({
      target,
      status:
        accepted.length > 0 ? "accepted" : "rejected",
      acceptedBy: accepted,
      rejectedBy: rejected,
    });

    /* 6. 3 秒后清掉提示 */
    setTimeout(() => setInvitation(null), 3000);
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  return (
    <main className="phone-screen app-screen music-app-v2">
      {/* 顶栏 */}
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
                <img
                  src={avatarUrls[key]!}
                  alt={key}
                />
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

      {/* ★ 邀请状态提示 */}
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
              ✓ {invitation.acceptedBy.join(" & ")}{" "}
              加入了
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

      {/* 唱片 */}
      <section className="music-v2-disc-area">
        <div
          className={`music-v2-disc${
            isPlaying ? " is-playing" : ""
          }`}
        >
          <div className="music-v2-disc-cover">
            <span>♪</span>
          </div>
        </div>
      </section>

      {/* 信息 + 进度 */}
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

      {/* 控制 */}
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
            aria-hidden="true"
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
            <span className="music-v2-play-dots">
              •••
            </span>
          ) : isPlaying ? (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
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
              aria-hidden="true"
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
            aria-hidden="true"
          >
            <path d="M15.8 5H18v14h-2.2z" />
            <path d="M4 5v14l10.5-7z" />
          </svg>
        </button>
      </section>

      {/* 右下角列表按钮 */}
      <button
        className="music-v2-list-btn"
        onClick={() => setShowList(true)}
        aria-label="播放列表"
      >
        <span />
        <span />
        <span />
      </button>

      {/* 列表抽屉 */}
      {showList && (
        <MusicListDrawer
          onClose={() => setShowList(false)}
          onSelect={(index) => {
            void playTrack(index);
            setShowList(false);
          }}
        />
      )}

      {/* 上传 / 管理 */}
      {showUpload && (
        <MusicUploadPanel
          onClose={() => {
            setShowUpload(false);
            reload();
          }}
        />
      )}

      {/* 邀请选择器 */}
      {showPartnerPicker && (
        <div
          className="music-v2-picker-backdrop"
          onClick={() => setShowPartnerPicker(false)}
        >
          <div
            className="music-v2-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="music-v2-picker-title">
              一起听
            </div>

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