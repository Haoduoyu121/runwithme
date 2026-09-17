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
  DEFAULT_POMODORO,
  pickRandomEnabled,
  type PomodoroSettings,
} from "@/data/checkin";

import {
  loadCommentCards,
  loadPomodoro,
  savePomodoro,
} from "@/lib/checkinStorage";

import { sendNotification } from "@/lib/notifications";

export type PomodoroMode = "focus" | "short" | "long";

type FocusCompleteHandler = (taskId: string | null) => void;

type PomodoroContextValue = {
  mode: PomodoroMode;
  running: boolean;
  remaining: number;
  settings: PomodoroSettings;
  boundTaskId: string | null;
  totalSeconds: number;

  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setMode: (m: PomodoroMode) => void;
  updateSettings: (s: PomodoroSettings) => void;
  bindTask: (taskId: string | null) => void;
  onFocusComplete: (
    handler: FocusCompleteHandler
  ) => () => void;

  /* 全屏专注层 */
  focusOverlayOpen: boolean;
  openFocusOverlay: () => void;
  closeFocusOverlay: () => void;
};

const PomodoroContext =
  createContext<PomodoroContextValue | null>(null);

function modeSeconds(
  m: PomodoroMode,
  s: PomodoroSettings
): number {
  if (m === "focus") return s.focusMin * 60;
  if (m === "short") return s.shortBreakMin * 60;
  return s.longBreakMin * 60;
}

export function PomodoroProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setModeState] =
    useState<PomodoroMode>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(
    DEFAULT_POMODORO.focusMin * 60
  );
  const [settings, setSettings] =
    useState<PomodoroSettings>(DEFAULT_POMODORO);
  const [boundTaskId, setBoundTaskId] = useState<
    string | null
  >(null);
  const [focusOverlayOpen, setFocusOverlayOpen] =
    useState(false);

  /* endTimeRef：记录本次结束时间戳（毫秒）
   * 用 Date.now() 计算剩余，避免浏览器节流导致计时变慢 */
  const endTimeRef = useRef<number | null>(null);

  const modeRef = useRef<PomodoroMode>("focus");
  const settingsRef = useRef<PomodoroSettings>(
    DEFAULT_POMODORO
  );
  const boundTaskRef = useRef<string | null>(null);

  const focusListenersRef = useRef(
    new Set<FocusCompleteHandler>()
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    boundTaskRef.current = boundTaskId;
  }, [boundTaskId]);

  /* ---------- 初始化 ---------- */

  useEffect(() => {
    const s = loadPomodoro();
    setSettings(s);
    settingsRef.current = s;
    setRemaining(modeSeconds("focus", s));
  }, []);

  /* ---------- 完成处理 ---------- */

  const handleComplete = useCallback(() => {
    const currentMode = modeRef.current;
    const currentSettings = settingsRef.current;
    const taskId = boundTaskRef.current;

    endTimeRef.current = null;
    setRunning(false);

    /* 通知所有 focus 完成监听者 */
    if (currentMode === "focus") {
      focusListenersRef.current.forEach((h) =>
        h(taskId)
      );
    }

    /* 从 comment cards 随机抽一张作为提醒内容 */
    const cards = loadCommentCards();
    const card = pickRandomEnabled(cards);

    const title =
      currentMode === "focus"
        ? "🍅 Pomodoro Complete"
        : "☕ Break Over";

    let body = "";

    if (card) {
      body = `${card.character}：${card.text}`;
    } else {
      body =
        currentMode === "focus"
          ? "这一轮专注结束了，休息一下吧。"
          : "休息结束，回来继续。";
    }

    sendNotification(title, body, "pomodoro");

    /* 重置到该模式默认时长 */
    setRemaining(
      modeSeconds(currentMode, currentSettings)
    );
  }, []);

  /* ---------- 计时器 ---------- */

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      if (endTimeRef.current === null) return;

      const left = Math.max(
        0,
        Math.round(
          (endTimeRef.current - Date.now()) / 1000
        )
      );

      setRemaining(left);

      if (left <= 0) {
        handleComplete();
      }
    };

    tick();
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [running, handleComplete]);

  /* ---------- 控制 ---------- */

  const start = useCallback(() => {
    const secs = modeSeconds(
      modeRef.current,
      settingsRef.current
    );

    /* 剩余时间不足时用完整时长 */
    const left = remaining > 0 ? remaining : secs;

    endTimeRef.current = Date.now() + left * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    if (endTimeRef.current !== null) {
      const left = Math.max(
        0,
        Math.round(
          (endTimeRef.current - Date.now()) / 1000
        )
      );
      setRemaining(left);
    }
    endTimeRef.current = null;
    setRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, start, pause]);

  const reset = useCallback(() => {
    endTimeRef.current = null;
    setRunning(false);
    setRemaining(
      modeSeconds(modeRef.current, settingsRef.current)
    );
  }, []);

  const setMode = useCallback((m: PomodoroMode) => {
    endTimeRef.current = null;
    setRunning(false);
    setModeState(m);
    setRemaining(
      modeSeconds(m, settingsRef.current)
    );
  }, []);

  const updateSettings = useCallback(
    (s: PomodoroSettings) => {
      setSettings(s);
      settingsRef.current = s;
      savePomodoro(s);

      if (!running) {
        setRemaining(
          modeSeconds(modeRef.current, s)
        );
      }
    },
    [running]
  );

  const bindTask = useCallback(
    (taskId: string | null) => {
      setBoundTaskId(taskId);
    },
    []
  );

  const onFocusComplete = useCallback(
    (handler: FocusCompleteHandler) => {
      focusListenersRef.current.add(handler);
      return () => {
        focusListenersRef.current.delete(handler);
      };
    },
    []
  );

    const openFocusOverlay = useCallback(() => {
    setFocusOverlayOpen(true);
  }, []);

  const closeFocusOverlay = useCallback(() => {
    setFocusOverlayOpen(false);
  }, []);

  const totalSeconds = modeSeconds(mode, settings);

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        running,
        remaining,
        settings,
        boundTaskId,
        totalSeconds,
        start,
        pause,
        toggle,
        reset,
        setMode,
        updateSettings,
        bindTask,
        onFocusComplete,
        focusOverlayOpen,
        openFocusOverlay,
        closeFocusOverlay,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error(
      "usePomodoro must be used inside PomodoroProvider"
    );
  }
  return ctx;
}