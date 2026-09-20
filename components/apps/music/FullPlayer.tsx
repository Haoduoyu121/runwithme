"use client";

import {
  ChevronDown,
  List as ListIcon,
  ListOrdered,
  MessageCircle,
  Music as MusicIcon,
  Pause,
  Play,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import {
  useMusic,
  formatTime,
} from "@/lib/MusicContext";

import type { ListenPartner } from "@/lib/listenTogetherStorage";
import TogetherAvatars from "./TogetherAvatars";

type Props = {
  partner: ListenPartner;
  avatarUrls: Record<
    "you" | "levi" | "erwin",
    string | null
  >;
  togetherElapsed: number;
  coverUrl: string | null;
  onClose: () => void;
  onOpenList: () => void;
  onOpenChat: () => void;
  onOpenPicker: () => void;
  onPickCover: () => void;
};

export default function FullPlayer({
  partner,
  avatarUrls,
  togetherElapsed,
  coverUrl,
  onClose,
  onOpenList,
  onOpenChat,
  onOpenPicker,
  onPickCover,
}: Props) {
  const {
    currentTime,
    duration,
    loading,
    error,
    isPlaying,
    currentTrack,
    playMode,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    cyclePlayMode,
  } = useMusic();

  const progress =
    duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  const isTogether = partner !== "Solo";

  function handleSeek(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    seek(Number(e.target.value));
  }

  function handleAvatarClick() {
    if (isTogether) {
      onOpenChat();
    } else {
      onOpenPicker();
    }
  }

  return (
    <div className="music-fullplayer">
      <header className="music-fullplayer-header">
        <button
          className="music-fullplayer-collapse"
          onClick={onClose}
          aria-label="收起"
        >
          <ChevronDown size={26} strokeWidth={2.4} />
        </button>
      </header>

      <div className="music-fullplayer-avatars">
        <TogetherAvatars
          partner={partner}
          avatarUrls={avatarUrls}
          elapsedMs={togetherElapsed}
          showTimer={true}
          size={44}
          onClick={handleAvatarClick}
        />
      </div>

      <button
        type="button"
        className={`music-fullplayer-disc${
          isPlaying ? " is-playing" : ""
        }`}
        onClick={onPickCover}
        aria-label="上传专辑封面"
      >
        <div
          className={`music-fullplayer-disc-cover${
            coverUrl ? " has-image" : ""
          }`}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="专辑封面" />
          ) : (
            <MusicIcon size={64} strokeWidth={1.2} />
          )}
        </div>
      </button>

      <section className="music-fullplayer-info">
        {currentTrack ? (
          <>
            <div className="music-fullplayer-title">
              {currentTrack.title}
            </div>
            <div className="music-fullplayer-artist">
              {currentTrack.artist || "RunWithme"}
            </div>
          </>
        ) : (
          <div className="music-fullplayer-empty">
            还没有音乐
          </div>
        )}
        {error && (
          <div className="music-fullplayer-error">
            {error}
          </div>
        )}
      </section>

      <section className="music-fullplayer-progress">
        <input
          className="music-fullplayer-progress-bar"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          style={
            {
              "--music-progress": `${progress}%`,
            } as React.CSSProperties
          }
        />
        <div className="music-fullplayer-time-row">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </section>

      <section className="music-fullplayer-controls">
        <button
          className="music-fullplayer-btn"
          onClick={cyclePlayMode}
          aria-label="播放模式"
          type="button"
          title={
            playMode === "sequential"
              ? "顺序播放"
              : playMode === "shuffle"
                ? "乱序播放"
                : "单曲循环"
          }
        >
          {playMode === "sequential" && (
            <ListOrdered size={20} strokeWidth={2} />
          )}
          {playMode === "shuffle" && (
            <Shuffle size={20} strokeWidth={2} />
          )}
          {playMode === "repeat-one" && (
            <Repeat1 size={20} strokeWidth={2} />
          )}
        </button>

        <button
          className="music-fullplayer-btn"
          onClick={() => void previousTrack()}
          aria-label="上一首"
          type="button"
        >
          <SkipBack
            size={22}
            strokeWidth={1.8}
            fill="currentColor"
          />
        </button>

        <button
          className="music-fullplayer-play-btn"
          onClick={() => void togglePlay()}
          aria-label={isPlaying ? "暂停" : "播放"}
          type="button"
        >
          {loading ? (
            <span className="music-fullplayer-dots">
              •••
            </span>
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
          className="music-fullplayer-btn"
          onClick={() => void nextTrack()}
          aria-label="下一首"
          type="button"
        >
          <SkipForward
            size={22}
            strokeWidth={1.8}
            fill="currentColor"
          />
        </button>

        <button
          className="music-fullplayer-btn"
          onClick={onOpenList}
          aria-label="播放列表"
          type="button"
        >
          <ListIcon size={20} strokeWidth={2} />
        </button>
      </section>

      {isTogether && (
        <button
          className="music-fullplayer-chat-fab"
          onClick={onOpenChat}
          aria-label="一起听聊天"
        >
          <MessageCircle size={20} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}