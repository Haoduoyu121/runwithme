"use client";

import { useEffect, useState } from "react";

import {
  Heart,
  List,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { useMusic } from "@/lib/MusicContext";
import { useNotifications } from "@/lib/NotificationContext";
import {
  loadListenPartner,
  type ListenPartner,
} from "@/lib/listenTogetherStorage";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function MusicWidget() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
  } = useMusic();

  const { launchApp } = useNotifications();
  const avatars = useCharacterAvatars();

  const [partner, setPartner] = useState<ListenPartner>("Solo");

  useEffect(() => {
    setPartner(loadListenPartner());

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

  const progress =
    duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  function enterMusic() {
    launchApp("music");
  }

  function handleTogglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    void togglePlay();
  }

  function handlePrev(e: React.MouseEvent) {
    e.stopPropagation();
    void previousTrack();
  }

  function handleNext(e: React.MouseEvent) {
    e.stopPropagation();
    void nextTrack();
  }

  function handleSeek(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    e.stopPropagation();
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, ratio)) * duration);
  }

  function handleHeart(e: React.MouseEvent) {
    e.stopPropagation();
    enterMusic();
  }

  function handleList(e: React.MouseEvent) {
    e.stopPropagation();
    enterMusic();
  }

  /* ---------- 一起听头像组 ---------- */
  /* 顺序固定：Levi · You · Erwin，缺谁不显示谁 */

  const showLevi =
    partner === "Levi" || partner === "Both";
  const showErwin =
    partner === "Erwin" || partner === "Both";

  return (
    <div className="music-widget" onClick={enterMusic}>
      {/* 头像组 */}
      <div className="music-widget-avatars">
        {showLevi && (
          <div className="music-widget-avatar music-widget-avatar-levi">
            {avatars.levi ? (
              <img src={avatars.levi} alt="Levi" />
            ) : (
              <span>L</span>
            )}
          </div>
        )}

        <div className="music-widget-avatar music-widget-avatar-you">
          {avatars.you ? (
            <img src={avatars.you} alt="You" />
          ) : (
            <span>Y</span>
          )}
        </div>

        {showErwin && (
          <div className="music-widget-avatar music-widget-avatar-erwin">
            {avatars.erwin ? (
              <img src={avatars.erwin} alt="Erwin" />
            ) : (
              <span>E</span>
            )}
          </div>
        )}
      </div>

      {/* 歌名 */}
      <div className="music-widget-title">
        {currentTrack ? currentTrack.title : "没有音乐"}
      </div>

      {/* 进度条 */}
      <div
        className="music-widget-progress"
        onClick={handleSeek}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="music-widget-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 时间 */}
      <div className="music-widget-times">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* 控制栏 */}
      <div className="music-widget-controls">
        <button
          type="button"
          className="music-widget-btn"
          onClick={handleHeart}
          aria-label="收藏"
        >
          <Heart size={14} strokeWidth={2} />
        </button>

        <button
          type="button"
          className="music-widget-btn"
          onClick={handlePrev}
          aria-label="上一首"
          disabled={!currentTrack}
        >
          <SkipBack
            size={14}
            strokeWidth={2}
            fill="currentColor"
          />
        </button>

        <button
          type="button"
          className="music-widget-btn music-widget-play"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
          disabled={!currentTrack}
        >
          {isPlaying ? (
            <Pause
              size={14}
              strokeWidth={2.2}
              fill="currentColor"
            />
          ) : (
            <Play
              size={14}
              strokeWidth={2.2}
              fill="currentColor"
            />
          )}
        </button>

        <button
          type="button"
          className="music-widget-btn"
          onClick={handleNext}
          aria-label="下一首"
          disabled={!currentTrack}
        >
          <SkipForward
            size={14}
            strokeWidth={2}
            fill="currentColor"
          />
        </button>

        <button
          type="button"
          className="music-widget-btn"
          onClick={handleList}
          aria-label="播放列表"
        >
          <List size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}