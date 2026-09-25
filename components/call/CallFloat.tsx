"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatCallDuration,
  type ActiveCall,
} from "@/lib/CallContext";

const POS_KEY = "runwithme_call_float_pos";

type Pos = { x: number; y: number };

type CallFloatProps = {
  call: ActiveCall;
  seconds: number;
  dialSeconds: number;
  isReplying?: boolean;
  onExpand: () => void;
  onHangup: () => void;
};

function loadPos(): Pos | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      typeof parsed?.x === "number" &&
      typeof parsed?.y === "number"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }

  return null;
}

function savePos(pos: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export default function CallFloat({
  call,
  seconds,
  dialSeconds,
  isReplying = false,
  onExpand,
  onHangup,
}: CallFloatProps) {
  const floatRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const posRef = useRef<Pos | null>(null);

  const dragRef = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const clampToScreen = useCallback(
    (x: number, y: number): Pos => {
      const el = floatRef.current;
      const width = el?.offsetWidth ?? 200;
      const height = el?.offsetHeight ?? 60;
      const margin = 8;

      const maxX = Math.max(
        margin,
        window.innerWidth - width - margin
      );
      const maxY = Math.max(
        margin,
        window.innerHeight - height - margin
      );

      return {
        x: Math.min(Math.max(margin, x), maxX),
        y: Math.min(Math.max(margin, y), maxY),
      };
    },
    []
  );

  useEffect(() => {
    if (posRef.current !== null) return;

    const saved = loadPos();

    requestAnimationFrame(() => {
      if (saved) {
        setPos(clampToScreen(saved.x, saved.y));
        return;
      }

      const el = floatRef.current;
      const width = el?.offsetWidth ?? 200;

      setPos({
        x: Math.max(8, window.innerWidth - width - 16),
        y: 90,
      });
    });
  }, [clampToScreen]);

  useEffect(() => {
    function handleResize() {
      setPos((prev) =>
        prev ? clampToScreen(prev.x, prev.y) : prev
      );
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener(
      "orientationchange",
      handleResize
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "orientationchange",
        handleResize
      );
    };
  }, [clampToScreen]);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!dragRef.current.dragging) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (
        !dragRef.current.moved &&
        (Math.abs(dx) > 3 || Math.abs(dy) > 3)
      ) {
        dragRef.current.moved = true;
      }

      const next = clampToScreen(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy
      );

      setPos(next);
    }

    function handleUp() {
      if (!dragRef.current.dragging) return;

      dragRef.current.dragging = false;
      setDragging(false);

      if (dragRef.current.moved && posRef.current) {
        savePos(posRef.current);
      }
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener(
        "pointercancel",
        handleUp
      );
    };
  }, [clampToScreen]);

  function onPointerDown(
    e: React.PointerEvent<HTMLDivElement>
  ) {
    const current = posRef.current;
    if (!current) return;

    dragRef.current = {
      dragging: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: current.x,
      originY: current.y,
    };

    setDragging(true);
  }

  function onDragStart(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
  }

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    onExpand();
  }

  if (!pos) {
    return (
      <div
        ref={floatRef}
        className="call-float"
        style={{
          transform:
            "translate3d(-9999px, -9999px, 0)",
          visibility: "hidden",
        }}
      />
    );
  }

  const displayName =
    call.target === "Both" ? "Levi & Erwin" : call.target;

  const avatarText =
    call.target === "Both"
      ? "L&E"
      : call.target === "Levi"
        ? "L"
        : "E";

  /* 真实阶段（minimized 是 UI 态） */
  const rp =
    call.phase === "minimized"
      ? (call.minimizedFrom ?? "connected")
      : call.phase;

  let timerText: string;
  if (rp === "outgoing") {
    timerText = `正在呼叫 · ${formatCallDuration(dialSeconds)}`;
  } else if (rp === "incoming") {
    timerText = `来电 · ${formatCallDuration(dialSeconds)}`;
  } else {
    timerText = formatCallDuration(seconds);
  }

  return (
    <div
      ref={floatRef}
      className={`call-float${
        dragging ? " call-float-dragging" : ""
      }`}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
      }}
      onPointerDown={onPointerDown}
      onDragStart={onDragStart}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onExpand();
      }}
    >
      <div className="call-float-avatar">{avatarText}</div>

      <div className="call-float-info">
        <div className="call-float-name">
          {displayName}
        </div>

        {isReplying ? (
          <div
            className="call-float-timer"
            style={{
              color: "#4ade80",
              fontWeight: 500,
            }}
          >
            对方正在回复…
          </div>
        ) : (
          <div className="call-float-timer">
            {timerText}
          </div>
        )}
      </div>

      <button
        className="call-float-hangup"
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onHangup();
        }}
        type="button"
        aria-label="挂断"
      >
        ✕
      </button>
    </div>
  );
}