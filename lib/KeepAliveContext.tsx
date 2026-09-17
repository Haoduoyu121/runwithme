"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const KEY_ENABLED = "runwithme_keepalive_enabled";
const KEY_URL = "runwithme_keepalive_url";

type KeepAliveContextValue = {
  enabled: boolean;
  audioUrl: string;
  isPlaying: boolean;
  error: string;
  setEnabled: (v: boolean) => void;
  setAudioUrl: (url: string) => void;
};

const KeepAliveContext =
  createContext<KeepAliveContextValue | null>(null);

export function KeepAliveProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [enabled, setEnabledState] = useState(false);
  const [audioUrl, setAudioUrlState] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* 初始加载 */
  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabledState(
      window.localStorage.getItem(KEY_ENABLED) === "true"
    );
    setAudioUrlState(
      window.localStorage.getItem(KEY_URL) ?? ""
    );
  }, []);

  /* 播放 / 暂停 同步 */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = audioRef.current;
    if (!audio) return;

    /* 是否有其他音频在播（Music / Chat voice / Watch video） */
    function hasOtherActiveMedia(): boolean {
      const media = document.querySelectorAll<HTMLMediaElement>(
        "audio, video"
      );
      for (const m of Array.from(media)) {
        if (m === audio) continue;
        if (
          !m.paused &&
          !m.ended &&
          m.currentTime > 0
        ) {
          return true;
        }
      }
      return false;
    }

    function sync() {
      if (!audio) return;

      /* 未开启 或 未配置 URL → 不播 */
      if (!enabled || !audioUrl) {
        if (!audio.paused) audio.pause();
        setIsPlaying(false);
        return;
      }

      const hidden =
        document.visibilityState === "hidden";
      const otherPlaying = hasOtherActiveMedia();

      /* 只有页面隐藏 + 没有其他音频在播时，才启用自己的静音音频 */
      if (hidden && !otherPlaying) {
        const p = audio.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            setIsPlaying(true);
            setError("");
          }).catch((err: unknown) => {
            setIsPlaying(false);
            const msg =
              (err as { message?: string })?.message ??
              String(err);
            setError(msg);
          });
        }
      } else {
        if (!audio.paused) audio.pause();
        setIsPlaying(false);
      }
    }

    sync();

    document.addEventListener("visibilitychange", sync);

    /* 每 30s 兜底检查（有些场景 visibilitychange 触发不稳定） */
    const interval = window.setInterval(sync, 30_000);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        sync
      );
      window.clearInterval(interval);
    };
  }, [enabled, audioUrl]);

  return (
    <KeepAliveContext.Provider
      value={{
        enabled,
        audioUrl,
        isPlaying,
        error,
        setEnabled: (v: boolean) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(
            KEY_ENABLED,
            v ? "true" : "false"
          );
          setEnabledState(v);
        },
        setAudioUrl: (url: string) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(KEY_URL, url);
          setAudioUrlState(url);
        },
      }}
    >
      {children}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        loop
        preload="auto"
        playsInline
        style={{ display: "none" }}
      />
    </KeepAliveContext.Provider>
  );
}

export function useKeepAlive() {
  const ctx = useContext(KeepAliveContext);
  if (!ctx) {
    throw new Error(
      "useKeepAlive must be used inside KeepAliveProvider"
    );
  }
  return ctx;
}