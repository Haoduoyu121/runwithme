"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  Eraser,
  Pencil,
  Smile,
  Sticker,
  Type,
  X,
} from "lucide-react";

import {
  addDoodle,
  removeDoodle,
  updateDoodle,
  computeNextX,
  computeNextY,
} from "@/lib/fridgeStorage";
import {
  createDoodleId,
  type Doodle,
  type FridgeFonts,
} from "@/data/fridge";
import { FRIDGE_STICKER_FILES as STICKER_FILES } from "@/data/fridgeStickerFiles";

type Mode = "idle" | "draw" | "erase";

type WhiteBoardProps = {
  doodles: Doodle[];
  fonts: FridgeFonts;
  onChange: (next: Doodle[]) => void;
};

/** 待确认的涂鸦 */
type Pending = {
  kind: "text" | "emoji";
  text?: string;
  emoji?: string;
  imageUrl?: string;
  x: number;
  y: number;
  rotation: number;
};

/** 拖动状态 */
type DragState = {
  /** 已存在的 doodle id，或者 "__pending__" */
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  liveX: number;
  liveY: number;
};

const EMOJI_PALETTE = [
  "🌸","🍰","☕","⭐","♡","🌙","🍀","☀️","🐱","✿",
  "🐰","🎀","🌿","✨","🔥","🕊","🍓","🫧","🗯","❄",
];

const INK_COLORS = [
  { id: "black", value: "#3a2e33", label: "黑" },
  { id: "red",   value: "#c94d4d", label: "红" },
  { id: "blue",  value: "#3d5a80", label: "蓝" },
  { id: "green", value: "#5a8a6e", label: "绿" },
];

export default function WhiteBoard({
  doodles,
  fonts,
  onChange,
}: WhiteBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [stroke, setStroke] = useState<
    { x: number; y: number }[]
  >([]);
  const [showText, setShowText] = useState(false);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [inkColor, setInkColor] = useState("#3a2e33");
  const [brushSize, setBrushSize] = useState(0.5);

  const [pending, setPending] = useState<Pending | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function relPos(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }

  /* =========================================================
     白板级：画笔
     ========================================================= */

  function onBoardDown(e: ReactPointerEvent) {
    if (mode !== "draw") return;
    const p = relPos(e.clientX, e.clientY);
    setStroke([p]);
  }

  function onBoardMove(e: ReactPointerEvent) {
    if (mode !== "draw") return;
    if (stroke.length === 0) return;
    const p = relPos(e.clientX, e.clientY);
    setStroke((prev) => [...prev, p]);
  }

  function onBoardUp() {
    if (mode !== "draw") return;
    if (stroke.length < 2) {
      setStroke([]);
      return;
    }
    const next = addDoodle({
      id: createDoodleId(),
      author: "user",
      kind: "stroke",
      createdAt: Date.now(),
      x: 0,
      y: 0,
      rotation: 0,
      points: stroke,
      color: inkColor,
      width: brushSize,
    });
    setStroke([]);
    onChange(next);
  }

  /* =========================================================
     拖动
     ========================================================= */

  function startDrag(
    e: ReactPointerEvent,
    id: string,
    x: number,
    y: number
  ) {
    if (mode !== "idle") return;
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(
        e.pointerId
      );
    } catch {}
    setDrag({
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
      liveX: x,
      liveY: y,
    });
  }

  function moveDrag(e: ReactPointerEvent) {
    if (!drag) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx =
      ((e.clientX - drag.startClientX) / rect.width) * 100;
    const dy =
      ((e.clientY - drag.startClientY) / rect.height) * 100;
    const nx = Math.max(0, Math.min(100, drag.startX + dx));
    const ny = Math.max(0, Math.min(100, drag.startY + dy));
    setDrag({ ...drag, liveX: nx, liveY: ny });
  }

  function endDrag() {
    if (!drag) return;
    if (drag.id === "__pending__") {
      setPending((p) =>
        p ? { ...p, x: drag.liveX, y: drag.liveY } : null
      );
    } else {
      onChange(
        updateDoodle(drag.id, {
          x: drag.liveX,
          y: drag.liveY,
        })
      );
    }
    setDrag(null);
  }

  /* =========================================================
     新增 → 进入 pending
     ========================================================= */

  function createPendingText(text: string) {
    setPending({
      kind: "text",
      text,
      x: computeNextX(),
      y: computeNextY(doodles),
      rotation: (Math.random() - 0.5) * 4,
    });
  }

  function createPendingEmoji(emoji: string) {
    setPending({
      kind: "emoji",
      emoji,
      x: computeNextX(),
      y: computeNextY(doodles),
      rotation: (Math.random() - 0.5) * 24,
    });
  }

  function createPendingSticker(url: string) {
    setPending({
      kind: "emoji",
      emoji: "",
      imageUrl: url,
      x: computeNextX(),
      y: computeNextY(doodles),
      rotation: (Math.random() - 0.5) * 20,
    });
  }

  function confirmPending() {
    if (!pending) return;
    const next = addDoodle({
      id: createDoodleId(),
      author: "user",
      kind: pending.kind,
      createdAt: Date.now(),
      x: pending.x,
      y: pending.y,
      rotation: pending.rotation,
      text: pending.text,
      emoji: pending.emoji,
      imageUrl: pending.imageUrl,
    });
    onChange(next);
    setPending(null);
  }

  function cancelPending() {
    setPending(null);
  }

  function submitText() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    setShowText(false);
    createPendingText(t);
  }

  function erase(id: string) {
    onChange(removeDoodle(id));
  }

  /* =========================================================
     渲染
     ========================================================= */

  function renderDoodle(d: Doodle) {
    const isDragging = drag?.id === d.id;
    const x = isDragging ? drag.liveX : d.x;
    const y = isDragging ? drag.liveY : d.y;

    const baseStyle: React.CSSProperties = {
      left: `${x}%`,
      top: `${y}%`,
      transform: `rotate(${d.rotation}deg)`,
      touchAction: "none",
    };

    const fontFamily = fonts[d.author]
      ? `Fridge${d.author === "user" ? "User" : d.author === "levi" ? "Levi" : "Erwin"}Font`
      : undefined;

    const clickable = mode === "erase";
    const onClick = clickable
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          erase(d.id);
        }
      : undefined;

    const onPointerDown = (e: ReactPointerEvent) =>
      startDrag(e, d.id, d.x, d.y);

    if (d.kind === "text") {
      return (
        <div
          key={d.id}
          className={`fridge-doodle fridge-doodle-text fridge-doodle-${d.author}${
            isDragging ? " is-dragging" : ""
          }`}
          style={{ ...baseStyle, fontFamily }}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {d.text}
        </div>
      );
    }

    if (d.kind === "emoji") {
      return (
        <div
          key={d.id}
          className={`fridge-doodle fridge-doodle-emoji fridge-doodle-${d.author}${
            isDragging ? " is-dragging" : ""
          }`}
          style={baseStyle}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {d.imageUrl ? (
            <img
              src={d.imageUrl}
              alt=""
              draggable={false}
            />
          ) : (
            d.emoji
          )}
        </div>
      );
    }

    if (d.kind === "stroke" && d.points) {
      const path = d.points
        .map(
          (p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`
        )
        .join(" ");
      return (
        <svg
          key={d.id}
          className="fridge-doodle-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            pointerEvents: clickable ? "auto" : "none",
          }}
          onClick={onClick}
        >
          <path
            d={path}
            fill="none"
            stroke={d.color ?? "#3a2e33"}
            strokeWidth={d.width ?? 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#marker-texture)"
            style={{
              mixBlendMode: "multiply",
              opacity: 0.82,
            }}
          />
        </svg>
      );
    }

    return null;
  }

  /* 渲染 pending 预览 */
  function renderPending() {
    if (!pending) return null;

    const isDragging = drag?.id === "__pending__";
    const x = isDragging ? drag.liveX : pending.x;
    const y = isDragging ? drag.liveY : pending.y;

    const style: React.CSSProperties = {
      left: `${x}%`,
      top: `${y}%`,
      transform: `rotate(${pending.rotation}deg)`,
      touchAction: "none",
    };

    const fontFamily = fonts.user
      ? "FridgeUserFont"
      : undefined;

    return (
      <div
        className={`fridge-doodle fridge-doodle-${pending.kind} fridge-doodle-user is-pending${
          isDragging ? " is-dragging" : ""
        }`}
        style={{ ...style, fontFamily }}
        onPointerDown={(e) =>
          startDrag(e, "__pending__", pending.x, pending.y)
        }
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {pending.imageUrl ? (
          <img
            src={pending.imageUrl}
            alt=""
            draggable={false}
          />
        ) : pending.emoji ? (
          pending.emoji
        ) : (
          pending.text
        )}
      </div>
    );
  }

  const livePath =
    stroke.length > 1
      ? stroke
          .map(
            (p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`
          )
          .join(" ")
      : "";

  return (
    <div
      ref={boardRef}
      className={`fridge-board mode-${mode}`}
      onPointerDown={onBoardDown}
      onPointerMove={onBoardMove}
      onPointerUp={onBoardUp}
      onPointerCancel={onBoardUp}
      onPointerLeave={onBoardUp}
    >
      <svg
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <filter
            id="marker-texture"
            filterUnits="userSpaceOnUse"
            x="-10"
            y="-10"
            width="120"
            height="120"
          >
            <feTurbulence
              baseFrequency="0.5"
              numOctaves="2"
              type="fractalNoise"
            />
            <feDisplacementMap
              scale="1.8"
              xChannelSelector="R"
              in="SourceGraphic"
            />
          </filter>
        </defs>
      </svg>

      {doodles.map(renderDoodle)}
      {renderPending()}

      {livePath && (
        <svg
          className="fridge-doodle-svg fridge-doodle-live"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={livePath}
            fill="none"
            stroke={inkColor}
            strokeWidth={brushSize}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#marker-texture)"
            style={{
              mixBlendMode: "multiply",
              opacity: 0.82,
            }}
          />
        </svg>
      )}

      {/* pending 的确认条 */}
      {pending && (
        <div
          className="fridge-pending-bar"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="fridge-pending-hint">
            拖动调整位置
          </span>
          <button
            className="fridge-pending-cancel"
            onClick={cancelPending}
            type="button"
            aria-label="取消"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
          <button
            className="fridge-pending-ok"
            onClick={confirmPending}
            type="button"
            aria-label="确认"
          >
            <Check size={16} strokeWidth={2.6} />
          </button>
        </div>
      )}

      {/* 工具栏 */}
      <div className="fridge-board-tools">
        <button
          className={mode === "draw" ? "active" : ""}
          onClick={() =>
            setMode(mode === "draw" ? "idle" : "draw")
          }
          aria-label="画笔"
          type="button"
        >
          <Pencil size={14} strokeWidth={2.4} />
        </button>

        <button
          onClick={() => {
            setShowEmoji(false);
            setShowStickers(false);
            setShowText(true);
            setMode("idle");
          }}
          aria-label="写文字"
          type="button"
        >
          <Type size={14} strokeWidth={2.4} />
        </button>

        <button
          className={showEmoji ? "active" : ""}
          onClick={() => {
            setShowText(false);
            setShowStickers(false);
            setShowEmoji((v) => !v);
            setMode("idle");
          }}
          aria-label="emoji"
          type="button"
        >
          <Smile size={14} strokeWidth={2.4} />
        </button>

        <button
          className={showStickers ? "active" : ""}
          onClick={() => {
            setShowText(false);
            setShowEmoji(false);
            setShowStickers((v) => !v);
            setMode("idle");
          }}
          aria-label="素材"
          type="button"
        >
          <Sticker size={14} strokeWidth={2.4} />
        </button>

        <button
          className={mode === "erase" ? "active" : ""}
          onClick={() => {
            setShowText(false);
            setShowEmoji(false);
            setShowStickers(false);
            setMode(
              mode === "erase" ? "idle" : "erase"
            );
          }}
          aria-label="擦除"
          type="button"
        >
          <Eraser size={14} strokeWidth={2.4} />
        </button>
      </div>

      {mode === "draw" && (
        <div className="fridge-board-inkbar">
          <div className="fridge-board-colors">
            {INK_COLORS.map((c) => (
              <button
                key={c.id}
                className={
                  inkColor === c.value ? "active" : ""
                }
                style={{ background: c.value }}
                onClick={() => setInkColor(c.value)}
                aria-label={c.label}
                type="button"
              />
            ))}
          </div>
          <div className="fridge-board-brush">
            <button
              className={brushSize === 0.3 ? "active" : ""}
              onClick={() => setBrushSize(0.3)}
              type="button"
            >
              细
            </button>
            <button
              className={brushSize === 0.5 ? "active" : ""}
              onClick={() => setBrushSize(0.5)}
              type="button"
            >
              中
            </button>
            <button
              className={brushSize === 0.9 ? "active" : ""}
              onClick={() => setBrushSize(0.9)}
              type="button"
            >
              粗
            </button>
          </div>
        </div>
      )}

      {showText && (
        <div
          className="fridge-board-textback"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            className="fridge-board-textinput"
            style={{
              fontFamily: fonts.user
                ? "FridgeUserFont"
                : undefined,
            }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="写点什么…"
            maxLength={80}
            rows={2}
            autoFocus
          />
          <div className="fridge-board-textactions">
            <button
              onClick={() => {
                setShowText(false);
                setDraft("");
              }}
              type="button"
            >
              取消
            </button>
            <button onClick={submitText} type="button">
              放上去
            </button>
          </div>
        </div>
      )}

      {showEmoji && (
        <div
          className="fridge-board-emojitray"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fridge-board-emojigrid">
            {EMOJI_PALETTE.map((e) => (
              <button
                key={e}
                onClick={() => {
                  createPendingEmoji(e);
                  setShowEmoji(false);
                }}
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
          <button
            className="fridge-board-emojiclose"
            onClick={() => setShowEmoji(false)}
            type="button"
            aria-label="关闭"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {showStickers && (
        <div
          className="fridge-board-stickertray"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fridge-board-stickergrid">
            {STICKER_FILES.map((name) => (
              <button
                key={name}
                onClick={() => {
                  createPendingSticker(
                    `/fridge-stickers/${name}.svg`
                  );
                  setShowStickers(false);
                }}
                type="button"
              >
                <img
                  src={`/fridge-stickers/${name}.svg`}
                  alt={name}
                  draggable={false}
                />
              </button>
            ))}
          </div>
          <button
            className="fridge-board-emojiclose"
            onClick={() => setShowStickers(false)}
            type="button"
            aria-label="关闭"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  );
}