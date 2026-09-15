"use client";

import { useEffect, useState } from "react";

import {
  useMusic,
  formatTime,
} from "@/lib/MusicContext";

import { useSystem } from "@/lib/SystemContext";
import { getChatFile } from "@/lib/chatFiles";

import {
  loadListenPartner,
  saveListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";

import MusicListDrawer from "@/components/apps/music/MusicListDrawer";
import MusicUploadPanel from "@/components/apps/music/MusicUploadPanel";

type MusicAppProps = {
  onBack: () => void;
};

type AvatarKey = "you" | "levi" | "erwin";

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

  const [partner, setPartner] =
    useState<ListenPartner>("Solo");
  const [showPartnerPicker, setShowPartnerPicker] =
    useState(false);
  const [showList, setShowList] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

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

  function handleSelectPartner(p: ListenPartner) {
    setPartner(p);
    saveListenPartner(p);
    setShowPartnerPicker(false);
  }

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
        >
          ⏮
        </button>

        <button
          className="music-v2-play-btn"
          onClick={() => void togglePlay()}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {loading ? "…" : isPlaying ? "Ⅱ" : "▶"}
        </button>

        <button
          className="music-v2-btn"
          onClick={() => void nextTrack()}
          aria-label="下一首"
        >
          ⏭
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
                <small>和 Levi</small>
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
                <small>和 Erwin</small>
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
                <small>三个人</small>
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