"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  defaultMusic,
  type MusicItem,
} from "@/data/music";

import { loadMusic } from "@/lib/musicStorage";
import { getMusicFile } from "@/lib/musicFiles";
import { useCollection } from "@/lib/CollectionContext";

type MusicContextValue = {
  music: MusicItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string;
  currentTrack: MusicItem | null;
  reload: () => void;
  playTrack: (index: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (time: number) => void;
};

const MusicContext =
  createContext<MusicContextValue | null>(null);

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

export function MusicProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { tryAutoCollect } = useCollection();

  /* 用 ref 存最新版 tryAutoCollect，避免它进 loadTrack 的依赖 */
  const tryAutoCollectRef = useRef(tryAutoCollect);
  useEffect(() => {
    tryAutoCollectRef.current = tryAutoCollect;
  }, [tryAutoCollect]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [music, setMusic] = useState<MusicItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const musicRef = useRef<MusicItem[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    musicRef.current = music;
  }, [music]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  /* -------------------------------------------------------
     加载音乐列表
     ------------------------------------------------------- */

  const reload = useCallback(() => {
    const saved = loadMusic(defaultMusic);

    const normalized = saved
      .map((item) => ({
        ...item,
        source:
          item.source === "file" || item.source === "url"
            ? item.source
            : ("url" as const),
        enabled: item.enabled !== false,
      }))
      .filter((item) => item.enabled);

    setMusic(normalized);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* -------------------------------------------------------
     加载单曲
     ------------------------------------------------------- */

  const loadTrack = useCallback(
    async (index: number, shouldPlay = false) => {
      const audio = audioRef.current;
      const list = musicRef.current;
      const item = list[index];

      if (!audio || !item) return;

      setLoading(true);
      setError("");

      try {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        let source = "";

        if (item.source === "file") {
          const file = await getMusicFile(item.id);
          if (!file) {
            throw new Error("找不到本地 MP3 文件。");
          }
          source = URL.createObjectURL(file);
          objectUrlRef.current = source;
        } else {
          source = item.url;
        }

        if (!source) {
          throw new Error(
            "这首音乐没有可播放的音频地址。"
          );
        }

                audio.src = source;
        audio.load();

        setCurrentTime(0);
        setDuration(0);

        /* ★ 派发"切歌"事件 */
        try {
          window.dispatchEvent(
            new CustomEvent("runwithme:music-track-change", {
              detail: { index, item },
            })
          );
        } catch {}

        /* 系统自动收藏判定（1%~5%，同 owner 不会重复收藏同一首） */
        tryAutoCollectRef.current({
          source: "music",
          content: `music「${item.title}」`,
          sender: null,
          originalAt: Date.now(),
          meta: {
            songId: item.id,
            title: item.title,
            artist: item.artist ?? "",
          },
        });

        if (shouldPlay) {
          await audio.play();
        }
      } catch (err) {
        console.error(err);
        setIsPlaying(false);
        setError(
          err instanceof Error
            ? err.message
            : "音乐播放失败。"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const playTrack = useCallback(
    async (index: number) => {
      setCurrentIndex(index);
      indexRef.current = index;
      await loadTrack(index, true);
    },
    [loadTrack]
  );

  const nextTrack = useCallback(async () => {
    const list = musicRef.current;
    if (list.length === 0) return;

    const nextIdx = (indexRef.current + 1) % list.length;

    setCurrentIndex(nextIdx);
    indexRef.current = nextIdx;

    await loadTrack(nextIdx, true);
  }, [loadTrack]);

  const previousTrack = useCallback(async () => {
    const list = musicRef.current;
    if (list.length === 0) return;

    const prevIdx =
      (indexRef.current - 1 + list.length) % list.length;

    setCurrentIndex(prevIdx);
    indexRef.current = prevIdx;

    await loadTrack(prevIdx, true);
  }, [loadTrack]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    const list = musicRef.current;
    const item = list[indexRef.current];

    if (!audio || !item) return;

    setError("");

    try {
      if (isPlaying) {
        audio.pause();
        return;
      }

      if (!audio.src) {
        await loadTrack(indexRef.current, true);
        return;
      }

      await audio.play();
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
      setError(
        "无法播放这首音乐，请检查 MP3 文件。"
      );
    }
  }, [isPlaying, loadTrack]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  /* -------------------------------------------------------
     初始化 audio 元素（只在挂载时执行一次）
     ------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.setAttribute("playsinline", "true");
    audio.setAttribute(
      "webkit-playsinline",
      "true"
    );

    audioRef.current = audio;

    const handleTimeUpdate = () =>
      setCurrentTime(audio.currentTime || 0);

    const handleLoaded = () =>
      setDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0
      );

        const handlePlay = () => {
      setIsPlaying(true);
      try {
        window.dispatchEvent(
          new Event("runwithme:music-play")
        );
      } catch {}
    };
        const handlePause = () => {
      setIsPlaying(false);
      try {
        window.dispatchEvent(
          new Event("runwithme:music-pause")
        );
      } catch {}
    };

    const handleEnded = () => {
      const list = musicRef.current;
      if (list.length === 0) return;

      const nextIdx =
        (indexRef.current + 1) % list.length;

      setCurrentIndex(nextIdx);
      indexRef.current = nextIdx;

      void loadTrack(nextIdx, true);
    };

    const handleError = () => {
      setIsPlaying(false);
      setError("这首音乐无法播放。");
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );
      audio.removeEventListener(
        "loadedmetadata",
        handleLoaded
      );
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [loadTrack]);

  /* -------------------------------------------------------
     MediaSession（iOS / 安卓 后台控制中心）
     ------------------------------------------------------- */

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator)
    ) {
      return;
    }

    const item = music[currentIndex];
    if (!item) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.artist || "RunWithme",
        album: "RunWithme",
      });

      navigator.mediaSession.setActionHandler(
        "play",
        () => {
          void togglePlay();
        }
      );
      navigator.mediaSession.setActionHandler(
        "pause",
        () => {
          audioRef.current?.pause();
        }
      );
      navigator.mediaSession.setActionHandler(
        "previoustrack",
        () => {
          void previousTrack();
        }
      );
      navigator.mediaSession.setActionHandler(
        "nexttrack",
        () => {
          void nextTrack();
        }
      );
      navigator.mediaSession.setActionHandler(
        "seekto",
        (e) => {
          if (typeof e.seekTime === "number") {
            seek(e.seekTime);
          }
        }
      );
    } catch {
      /* 某些浏览器不支持全部操作 */
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler(
          "play",
          null
        );
        navigator.mediaSession.setActionHandler(
          "pause",
          null
        );
        navigator.mediaSession.setActionHandler(
          "previoustrack",
          null
        );
        navigator.mediaSession.setActionHandler(
          "nexttrack",
          null
        );
        navigator.mediaSession.setActionHandler(
          "seekto",
          null
        );
      } catch {
        /* ignore */
      }
    };
  }, [
    music,
    currentIndex,
    togglePlay,
    previousTrack,
    nextTrack,
    seek,
  ]);

  const currentTrack = music[currentIndex] ?? null;

  return (
    <MusicContext.Provider
      value={{
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
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);

  if (!ctx) {
    throw new Error(
      "useMusic must be used inside MusicProvider"
    );
  }

  return ctx;
}