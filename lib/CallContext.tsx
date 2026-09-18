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

import type { Character } from "@/data/cards";
import type { CallStatus } from "@/data/chat";

export type CallTarget = Character | "Both";

export type CallPhase =
  | "outgoing"
  | "incoming"
  | "connected"
  | "minimized";

export type ActiveCall = {
  target: CallTarget;
  direction: "outgoing" | "incoming";
  phase: CallPhase;
  startedAt: number;
  connectedAt: number | null;
  /* 缩小前处于哪个阶段（只有 phase="minimized" 时有意义） */
  minimizedFrom?: Exclude<CallPhase, "minimized">;
};

export type CallEndRecord = {
  target: CallTarget;
  direction: "outgoing" | "incoming";
  status: CallStatus;
  durationSec: number;
};

/* 可调参数 */
const PARAMS = {
  /* 我方拨打时被接听的概率 */
  ANSWER_RATE: 0.5,

  /* 接听等待时间范围 */
  ANSWER_MIN_MS: 3 * 1000,
  ANSWER_MAX_MS: 45 * 1000,

  /* 拒绝等待时间范围 */
  REJECT_MIN_MS: 5 * 1000,
  REJECT_MAX_MS: 45 * 1000,

  /* 未接听固定时长（1 分钟） */
  NO_ANSWER_MS: 60 * 1000,

  /* 未接听 vs 拒绝概率 */
  REJECT_PROBABILITY: 0.5,

  /* 对方来电铃响时长 */
  INCOMING_RING_MS: 60 * 1000,

  /* ★ 通话中对方随机挂断的概率（每次通话 4%） */
  HANGUP_PROBABILITY: 0.04,

  /* ★ 如果真的决定要挂断，挂断发生的时机 */
  HANGUP_DELAY_MIN_MS: 30 * 1000,
  HANGUP_DELAY_MAX_MS: 180 * 1000,

  /* 自动回复改打电话的概率 */
  AUTO_CALL_CHANCE: 0.15,
};

type CallContextValue = {
  activeCall: ActiveCall | null;
  seconds: number;
  dialSeconds: number;
  startOutgoingCall: (target: CallTarget) => void;
  triggerIncomingCall: (target?: CallTarget) => void;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  hangUpCall: () => void;
  minimizeCall: () => void;
  expandCall: () => void;
  registerCallEndListener: (
    listener: (record: CallEndRecord) => void
  ) => () => void;
};

const CallContext = createContext<CallContextValue | null>(
  null
);

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* 取真实阶段：minimized 是 UI 态，不是逻辑态 */
function realPhase(
  call: ActiveCall | null
): Exclude<CallPhase, "minimized"> | null {
  if (!call) return null;
  if (call.phase === "minimized") {
    return call.minimizedFrom ?? "connected";
  }
  return call.phase;
}

function pickRandomCharacter(): Character {
  return Math.random() < 0.5 ? "Levi" : "Erwin";
}

export function formatCallDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(
    2,
    "0"
  )}`;
}

export function CallProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeCall, setActiveCall] =
    useState<ActiveCall | null>(null);
  const [tickNow, setTickNow] = useState(() => Date.now());

  const activeCallRef = useRef<ActiveCall | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const outgoingTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const listenersRef = useRef(
    new Set<(r: CallEndRecord) => void>()
  );
  const pendingRef = useRef<CallEndRecord[]>([]);

  const registerCallEndListener = useCallback(
    (listener: (r: CallEndRecord) => void) => {
      pendingRef.current.forEach((r) => listener(r));
      pendingRef.current = [];

      listenersRef.current.add(listener);

      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  function emitEnd(record: CallEndRecord) {
    if (listenersRef.current.size === 0) {
      pendingRef.current.push(record);
    } else {
      listenersRef.current.forEach((l) => l(record));
    }
  }

  function clearAllTimers() {
    if (outgoingTimerRef.current) {
      clearTimeout(outgoingTimerRef.current);
      outgoingTimerRef.current = null;
    }
    if (incomingTimerRef.current) {
      clearTimeout(incomingTimerRef.current);
      incomingTimerRef.current = null;
    }
    if (hangupTimerRef.current) {
      clearTimeout(hangupTimerRef.current);
      hangupTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  /* 全局 ticker：有通话时每秒刷新一次 tickNow */
  useEffect(() => {
    if (!activeCall) return;

    setTickNow(Date.now());
    const id = window.setInterval(() => {
      setTickNow(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, [activeCall]);

  /* 派生：通话时长 / 拨号时长 */
  const seconds = useMemo(() => {
    if (!activeCall) return 0;
    if (realPhase(activeCall) !== "connected") return 0;
    if (!activeCall.connectedAt) return 0;
    return Math.max(
      0,
      Math.floor((tickNow - activeCall.connectedAt) / 1000)
    );
  }, [activeCall, tickNow]);

  const dialSeconds = useMemo(() => {
    if (!activeCall) return 0;
    const rp = realPhase(activeCall);
    if (rp !== "outgoing" && rp !== "incoming") return 0;
    return Math.max(
      0,
      Math.floor((tickNow - activeCall.startedAt) / 1000)
    );
  }, [activeCall, tickNow]);

  function getConnectedSeconds(call: ActiveCall): number {
    if (!call.connectedAt) return 0;
    return Math.max(
      0,
      Math.floor((Date.now() - call.connectedAt) / 1000)
    );
  }

  function endCall(
    target: CallTarget,
    direction: "outgoing" | "incoming",
    status: CallStatus,
    durationSec: number
  ) {
    clearAllTimers();
    setActiveCall(null);
    emitEnd({ target, direction, status, durationSec });
  }

  /* ★ 修改后：以 4% 的概率安排对方挂断 */
  function scheduleRandomHangup() {
    /* 先掷骰子：96% 不挂断 */
    if (Math.random() > PARAMS.HANGUP_PROBABILITY) {
      return;
    }

    const delay = randomInt(
      PARAMS.HANGUP_DELAY_MIN_MS,
      PARAMS.HANGUP_DELAY_MAX_MS
    );

    hangupTimerRef.current = setTimeout(() => {
      hangupTimerRef.current = null;

      const current = activeCallRef.current;
      if (!current) return;
      if (realPhase(current) !== "connected") return;

      endCall(
        current.target,
        current.direction,
        "completed",
        getConnectedSeconds(current)
      );
    }, delay);
  }

  function startOutgoingCall(target: CallTarget) {
    if (activeCallRef.current) return;

    setActiveCall({
      target,
      direction: "outgoing",
      phase: "outgoing",
      startedAt: Date.now(),
      connectedAt: null,
    });

    const answered = Math.random() < PARAMS.ANSWER_RATE;

    if (answered) {
      const answerAfter = randomInt(
        PARAMS.ANSWER_MIN_MS,
        PARAMS.ANSWER_MAX_MS
      );

      outgoingTimerRef.current = setTimeout(() => {
        outgoingTimerRef.current = null;

        const current = activeCallRef.current;
        if (!current) return;
        if (realPhase(current) !== "outgoing") return;

        setActiveCall((prev) => {
          if (!prev) return null;
          const wasMinimized =
            prev.phase === "minimized";
          return {
            ...prev,
            phase: wasMinimized
              ? "minimized"
              : "connected",
            minimizedFrom: wasMinimized
              ? "connected"
              : undefined,
            connectedAt: Date.now(),
          };
        });

        scheduleRandomHangup();
      }, answerAfter);

      return;
    }

    const rejected =
      Math.random() < PARAMS.REJECT_PROBABILITY;

    const waitMs = rejected
      ? randomInt(
          PARAMS.REJECT_MIN_MS,
          PARAMS.REJECT_MAX_MS
        )
      : PARAMS.NO_ANSWER_MS;

    outgoingTimerRef.current = setTimeout(() => {
      outgoingTimerRef.current = null;

      const current = activeCallRef.current;
      if (!current) return;
      if (realPhase(current) !== "outgoing") return;

      endCall(
        current.target,
        "outgoing",
        rejected ? "rejected" : "no-answer",
        0
      );
    }, waitMs);
  }

  function triggerIncomingCall(target?: CallTarget) {
    if (activeCallRef.current) return;

    const finalTarget = target ?? pickRandomCharacter();

    setActiveCall({
      target: finalTarget,
      direction: "incoming",
      phase: "incoming",
      startedAt: Date.now(),
      connectedAt: null,
    });

    incomingTimerRef.current = setTimeout(() => {
      incomingTimerRef.current = null;

      const current = activeCallRef.current;
      if (!current) return;
      if (realPhase(current) !== "incoming") return;

      endCall(current.target, "incoming", "missed", 0);
    }, PARAMS.INCOMING_RING_MS);
  }

  function acceptIncomingCall() {
    const current = activeCallRef.current;
    if (!current) return;
    if (realPhase(current) !== "incoming") return;

    if (incomingTimerRef.current) {
      clearTimeout(incomingTimerRef.current);
      incomingTimerRef.current = null;
    }

    setActiveCall((prev) => {
      if (!prev) return null;
      const wasMinimized = prev.phase === "minimized";
      return {
        ...prev,
        phase: wasMinimized
          ? "minimized"
          : "connected",
        minimizedFrom: wasMinimized
          ? "connected"
          : undefined,
        connectedAt: Date.now(),
      };
    });

    scheduleRandomHangup();
  }

  function declineIncomingCall() {
    const current = activeCallRef.current;
    if (!current) return;
    if (realPhase(current) !== "incoming") return;

    endCall(current.target, "incoming", "declined", 0);
  }

  function hangUpCall() {
    const current = activeCallRef.current;
    if (!current) return;

    const rp = realPhase(current);

    if (rp === "outgoing") {
      endCall(current.target, "outgoing", "cancelled", 0);
      return;
    }

    if (rp === "incoming") {
      endCall(current.target, "incoming", "declined", 0);
      return;
    }

    if (rp === "connected") {
      endCall(
        current.target,
        current.direction,
        "completed",
        getConnectedSeconds(current)
      );
    }
  }

  function minimizeCall() {
    setActiveCall((prev) => {
      if (!prev) return null;
      if (prev.phase === "minimized") return prev;
      return {
        ...prev,
        phase: "minimized",
        minimizedFrom: prev.phase,
      };
    });
  }

  function expandCall() {
    setActiveCall((prev) => {
      if (!prev) return null;
      if (prev.phase !== "minimized") return prev;
      return {
        ...prev,
        phase: prev.minimizedFrom ?? "connected",
        minimizedFrom: undefined,
      };
    });
  }

  return (
    <CallContext.Provider
      value={{
        activeCall,
        seconds,
        dialSeconds,
        startOutgoingCall,
        triggerIncomingCall,
        acceptIncomingCall,
        declineIncomingCall,
        hangUpCall,
        minimizeCall,
        expandCall,
        registerCallEndListener,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error(
      "useCall must be used inside CallProvider"
    );
  }

  return context;
}

export { PARAMS as CALL_PARAMS };