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
  const [seconds, setSeconds] = useState(0);

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

  /* 通话计时 */
  useEffect(() => {
    const phase = activeCall?.phase;
    const connectedAt = activeCall?.connectedAt;

    if (
      !connectedAt ||
      (phase !== "connected" && phase !== "minimized")
    ) {
      setSeconds(0);
      return;
    }

    const tick = () => {
      setSeconds(
        Math.max(
          0,
          Math.floor((Date.now() - connectedAt) / 1000)
        )
      );
    };

    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [activeCall?.phase, activeCall?.connectedAt]);

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
      if (
        current.phase !== "connected" &&
        current.phase !== "minimized"
      ) {
        return;
      }

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
        if (!current || current.phase !== "outgoing") return;

        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                phase: "connected",
                connectedAt: Date.now(),
              }
            : null
        );

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
      if (!current || current.phase !== "outgoing") return;

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
      if (!current || current.phase !== "incoming") return;

      endCall(current.target, "incoming", "missed", 0);
    }, PARAMS.INCOMING_RING_MS);
  }

  function acceptIncomingCall() {
    const current = activeCallRef.current;
    if (!current || current.phase !== "incoming") return;

    if (incomingTimerRef.current) {
      clearTimeout(incomingTimerRef.current);
      incomingTimerRef.current = null;
    }

    setActiveCall((prev) =>
      prev
        ? {
            ...prev,
            phase: "connected",
            connectedAt: Date.now(),
          }
        : null
    );

    scheduleRandomHangup();
  }

  function declineIncomingCall() {
    const current = activeCallRef.current;
    if (!current || current.phase !== "incoming") return;

    endCall(current.target, "incoming", "declined", 0);
  }

  function hangUpCall() {
    const current = activeCallRef.current;
    if (!current) return;

    if (current.phase === "outgoing") {
      endCall(current.target, "outgoing", "cancelled", 0);
      return;
    }

    if (current.phase === "incoming") {
      endCall(current.target, "incoming", "declined", 0);
      return;
    }

    if (
      current.phase === "connected" ||
      current.phase === "minimized"
    ) {
      endCall(
        current.target,
        current.direction,
        "completed",
        getConnectedSeconds(current)
      );
    }
  }

  function minimizeCall() {
    setActiveCall((prev) =>
      prev ? { ...prev, phase: "minimized" } : null
    );
  }

  function expandCall() {
    setActiveCall((prev) =>
      prev ? { ...prev, phase: "connected" } : null
    );
  }

  return (
    <CallContext.Provider
      value={{
        activeCall,
        seconds,
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