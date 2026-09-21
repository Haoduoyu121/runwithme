"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

import {
  type PlayQueue,
  loadMusicQueue,
  saveMusicQueue,
} from "@/lib/musicQueueStorage";
import {
  type MusicPlayMode,
  loadPlayMode,
  savePlayMode,
} from "@/lib/musicPlayMode";

/* ★ M4-b */
import { getNeteaseSession } from "@/lib/neteaseSession";
import { fetchSongUrl } from "@/lib/neteaseApi";

type MusicContextValue = {
  music: MusicItem[];
  queue: PlayQueue;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  error: string;
  currentTrack: MusicItem | null;
  playMode: MusicPlayMode;
  reload: () => void;
  playTrack: (index: number) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  setQueue: (queue: PlayQueue) => void;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (time: number) => void;
  cyclePlayMode: () => void;
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

const DEFAULT_QUEUE: PlayQueue = {
  id: "all",
  name: "全部",
  musicIds: [],
};

export function MusicProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { tryAutoCollect } = useCollection();

  const tryAutoCollectRef = useRef(tryAutoCollect);
  useEffect(() => {
    tryAutoCollectRef.current = tryAutoCollect;
  }, [tryAutoCollect]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [music, setMusic] = useState<MusicItem[]>([]);
  const [queue, setQueueState] =
    useState<PlayQueue>(DEFAULT_QUEUE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playMode, setPlayMode] = useState<MusicPlayMode>(
    "sequential"
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const musicRef = useRef<MusicItem[]>([]);
  const indexRef = useRef(0);
  const queueRef = useRef<PlayQueue>(DEFAULT_QUEUE);
  const playModeRef = useRef<MusicPlayMode>("sequential");

  useEffect(() => {
    musicRef.current = music;
  }, [music]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  /* -------------------------------------------------------
     加载音乐列表 + 恢复队列 / 播放模式
     ------------------------------------------------------- */

  const reload = useCallback(() => {
    const saved = loadMusic(defaultMusic);

    const normalized = saved
      .map((item) => ({
        ...item,
        source:
          item.source === "file" ||
          item.source === "url" ||
          item.source === "netease"
            ? item.source
            : ("url" as const),
        enabled: item.enabled !== false,
      }))
      .filter((item) => item.enabled);

    setMusic(normalized);
    musicRef.current = normalized;

    /* 恢复播放模式 */
    const storedMode = loadPlayMode();
    setPlayMode(storedMode);
    playModeRef.current = storedMode;

    /* 恢复队列 */
    const stored = loadMusicQueue();

    if (stored && stored.id !== "all") {
      // 过滤掉已不存在的歌
      const valid = stored.musicIds.filter((id) =>
        normalized.some((m) => m.id === id)
      );
      if (valid.length > 0) {
        const q: PlayQueue = {
          id: stored.id,
          name: stored.name,
          musicIds: valid,
        };
        setQueueState(q);
        queueRef.current = q;
        // 定位到当前歌仍在队列里
        const stillThere = valid.indexOf(
          queueRef.current.musicIds[
            indexRef.current
          ] ?? ""
        );
        setCurrentIndex(Math.max(0, stillThere));
        return;
      }
    }

    // 退回"全部"
    const allQueue: PlayQueue = {
      id: "all",
      name: "全部",
      musicIds: normalized.map((m) => m.id),
    };
    setQueueState(allQueue);
    queueRef.current = allQueue;
    setCurrentIndex(0);
    indexRef.current = 0;
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* -------------------------------------------------------
     加载单曲
     ------------------------------------------------------- */

  const loadTrack = useCallback(
    async (trackId: string, shouldPlay = false) => {
      const audio = audioRef.current;
      const item = musicRef.current.find(
        (m) => m.id === trackId
      );

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
        } else if (item.source === "netease") {
          /* ★ M4-b：每次播放前必须重新请求 URL（20 分钟过期） */
          if (!item.neteaseId) {
            throw new Error("这首歌缺少网易云 ID。");
          }
          const session = getNeteaseSession();
          if (!session || !session.cookie) {
            throw new Error("登录已过期，请重新登录");
          }
          const url = await fetchSongUrl(
            item.neteaseId,
            session.cookie
          );
          if (!url) {
            throw new Error(
              "这首歌无法播放（可能无版权或需 VIP）。"
            );
          }
          source = url;
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

        try {
          window.dispatchEvent(
            new CustomEvent("runwithme:music-track-change", {
              detail: { item },
            })
          );
        } catch {}

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

  /* -------------------------------------------------------
     队列操作
     ------------------------------------------------------- */

  const setQueue = useCallback((next: PlayQueue) => {
    setQueueState(next);
    queueRef.current = next;
    saveMusicQueue(next);
    setCurrentIndex(0);
    indexRef.current = 0;
  }, []);

  const playFromQueue = useCallback(
    async (index: number) => {
      const q = queueRef.current;
      if (index < 0 || index >= q.musicIds.length)
        return;

      setCurrentIndex(index);
      indexRef.current = index;

      await loadTrack(q.musicIds[index], true);
    },
    [loadTrack]
  );

  /** 兼容旧 API：按全量列表下标播（会切到"全部"队列） */
  const playTrack = useCallback(
    async (index: number) => {
      const all: PlayQueue = {
        id: "all",
        name: "全部",
        musicIds: musicRef.current.map((m) => m.id),
      };
      setQueue(all);
      await playFromQueue(index);
    },
    [setQueue, playFromQueue]
  );

  /* -------------------------------------------------------
     下一首 / 上一首
     手动 vs 播完，行为不同
     ------------------------------------------------------- */

  function pickNextManual(): number | null {
    const q = queueRef.current;
    const len = q.musicIds.length;
    if (len === 0) return null;

    const mode = playModeRef.current;
    if (mode === "shuffle") {
      if (len === 1) return 0;
      let r = indexRef.current;
      while (r === indexRef.current) {
        r = Math.floor(Math.random() * len);
      }
      return r;
    }
    // sequential / repeat-one 手动 → 都是下一首，到底回 0
    return (indexRef.current + 1) % len;
  }

  const nextTrack = useCallback(async () => {
    const idx = pickNextManual();
    if (idx === null) return;
    await playFromQueue(idx);
  }, [playFromQueue]);

  const previousTrack = useCallback(async () => {
    const q = queueRef.current;
    const len = q.musicIds.length;
    if (len === 0) return;

    const prevIdx =
      indexRef.current <= 0
        ? len - 1
        : indexRef.current - 1;
    await playFromQueue(prevIdx);
  }, [playFromQueue]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    const q = queueRef.current;
    const trackId = q.musicIds[indexRef.current];
    if (!audio || !trackId) return;

    setError("");

    try {
      if (isPlaying) {
        audio.pause();
        return;
      }

      if (!audio.src) {
        await loadTrack(trackId, true);
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

  const cyclePlayMode = useCallback(() => {
    setPlayMode((prev) => {
      const next: MusicPlayMode =
        prev === "sequential"
          ? "shuffle"
          : prev === "shuffle"
            ? "repeat-one"
            : "sequential";
      savePlayMode(next);
      playModeRef.current = next;
      return next;
    });
  }, []);

  /* -------------------------------------------------------
     初始化 audio 元素
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
      const q = queueRef.current;
      const mode = playModeRef.current;
      const len = q.musicIds.length;
      if (len === 0) return;

      if (mode === "repeat-one") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }

      if (mode === "shuffle") {
        if (len === 1) {
          audio.currentTime = 0;
          void audio.play();
          return;
        }
        let r = indexRef.current;
        while (r === indexRef.current) {
          r = Math.floor(Math.random() * len);
        }
        setCurrentIndex(r);
        indexRef.current = r;
        void loadTrack(q.musicIds[r], true);
        return;
      }

      // sequential: 到底停
      const nextIdx = indexRef.current + 1;
      if (nextIdx >= len) {
        setIsPlaying(false);
        return;
      }
      setCurrentIndex(nextIdx);
      indexRef.current = nextIdx;
      void loadTrack(q.musicIds[nextIdx], true);
    };

    const handleError = () => {
      setIsPlaying(false);
      setError("这首音乐无法播放。");
    };

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );
    audio.addEventListener(
      "loadedmetadata",
      handleLoaded
    );
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
     MediaSession
     ------------------------------------------------------- */

  const currentTrack = useMemo(() => {
    const id = queue.musicIds[currentIndex];
    if (!id) return null;
    return music.find((m) => m.id === id) ?? null;
  }, [queue, currentIndex, music]);

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator)
    ) {
      return;
    }

    const item = currentTrack;
    if (!item) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.artist || "RunWithme",
        album: "RunWithme",
        artwork: item.remoteCover
          ? [
              {
                src: item.remoteCover,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [],
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
      /* ignore */
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
    currentTrack,
    togglePlay,
    previousTrack,
    nextTrack,
    seek,
  ]);

  return (
    <MusicContext.Provider
      value={{
        music,
        queue,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        loading,
        error,
        currentTrack,
        playMode,
        reload,
        playTrack,
        playFromQueue,
        setQueue,
        togglePlay,
        nextTrack,
        previousTrack,
        seek,
        cyclePlayMode,
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