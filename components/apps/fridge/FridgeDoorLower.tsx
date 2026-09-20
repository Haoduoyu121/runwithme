"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ImagePlus, StickyNote, X } from "lucide-react";

import {
  NOTE_COLORS,
  createFridgeDoorItemId,
  type FridgeDoorItem,
} from "@/data/fridgeDoor";

import {
  addFridgeDoorItem,
  makeNoteExpiry,
  removeFridgeDoorItem,
  updateFridgeDoorItem,
} from "@/lib/fridgeDoorStorage";

import { FRIDGE_STICKER_FILES } from "@/data/fridgeStickerFiles";
import type { FridgeFonts } from "@/data/fridge";

type Props = {
  items: FridgeDoorItem[];
  fonts: FridgeFonts;
  onChange: (next: FridgeDoorItem[]) => void;
};

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  liveX: number;
  liveY: number;
  moved: boolean;
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function deriveBorderColor(bg: string): string {
  const { r, g, b } = hexToRgb(bg);
  return rgbToHex(r * 0.88, g * 0.88, b * 0.88);
}

function deriveTextColor(bg: string): string {
  const { r, g, b } = hexToRgb(bg);
  return rgbToHex(r * 0.38, g * 0.38, b * 0.38);
}

function fontFamilyFor(
  owner: FridgeDoorItem["owner"],
  fonts: FridgeFonts
): string | undefined {
  if (owner === "user")
    return fonts.user ? "FridgeUserFont" : undefined;
  if (owner === "levi")
    return fonts.levi ? "FridgeLeviFont" : undefined;
  if (owner === "erwin")
    return fonts.erwin ? "FridgeErwinFont" : undefined;
  return undefined;
}

export default function FridgeDoorLower({
  items,
  fonts,
  onChange,
}: Props) {
  const doorRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [showStickerPicker, setShowStickerPicker] =
    useState(false);
  const [showNoteEditor, setShowNoteEditor] =
    useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBgColor, setNoteBgColor] = useState(
    NOTE_COLORS[0].bg
  );
  const [noteSignature, setNoteSignature] = useState("");

  function relDelta(
    clientX: number,
    clientY: number,
    startX: number,
    startY: number,
    baseX: number,
    baseY: number
  ) {
    const rect = doorRef.current?.getBoundingClientRect();
    if (!rect) return { x: baseX, y: baseY };
    const dx = ((clientX - startX) / rect.width) * 100;
    const dy = ((clientY - startY) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(95, baseX + dx)),
      y: Math.max(0, Math.min(90, baseY + dy)),
    };
  }

  function startDrag(
    e: ReactPointerEvent,
    item: FridgeDoorItem
  ) {
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(
        e.pointerId
      );
    } catch {}
    setDrag({
      id: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: item.x,
      startY: item.y,
      liveX: item.x,
      liveY: item.y,
      moved: false,
    });
  }

  function moveDrag(e: ReactPointerEvent) {
    if (!drag) return;
    const { x, y } = relDelta(
      e.clientX,
      e.clientY,
      drag.startClientX,
      drag.startClientY,
      drag.startX,
      drag.startY
    );
    setDrag({
      ...drag,
      liveX: x,
      liveY: y,
      moved:
        drag.moved ||
        Math.abs(x - drag.startX) > 1 ||
        Math.abs(y - drag.startY) > 1,
    });
  }

  function endDrag() {
    if (!drag) return;
    if (drag.moved) {
      onChange(
        updateFridgeDoorItem(drag.id, {
          x: drag.liveX,
          y: drag.liveY,
        })
      );
    }
    setDrag(null);
  }

  function handleDelete(id: string) {
    if (!window.confirm("取下这张？")) return;
    onChange(removeFridgeDoorItem(id));
  }

  function handleAddSticker(url: string) {
    const next = addFridgeDoorItem({
      id: createFridgeDoorItemId(),
      kind: "sticker",
      owner: "user",
      x: 15 + Math.random() * 55,
      y: 15 + Math.random() * 45,
      rotation: (Math.random() - 0.5) * 30,
      createdAt: Date.now(),
      imageUrl: url,
    });
    onChange(next);
    setShowStickerPicker(false);
  }

  function handleAddNote() {
    const t = noteDraft.trim();
    if (!t) return;
    const next = addFridgeDoorItem({
      id: createFridgeDoorItemId(),
      kind: "note",
      owner: "user",
      x: 15 + Math.random() * 55,
      y: 15 + Math.random() * 45,
      rotation: (Math.random() - 0.5) * 12,
      createdAt: Date.now(),
      text: t,
      colorIdx: 0,
      bgColor: noteBgColor,
      expiresAt: makeNoteExpiry(),
      signature: noteSignature.trim() || undefined,
    });
    onChange(next);
    setNoteDraft("");
    setNoteSignature("");
    setShowNoteEditor(false);
  }

  function closeNoteEditor() {
    setShowNoteEditor(false);
    setNoteDraft("");
    setNoteSignature("");
  }

  function renderItem(item: FridgeDoorItem) {
    const isDragging = drag?.id === item.id;
    const x = isDragging ? drag.liveX : item.x;
    const y = isDragging ? drag.liveY : item.y;

    const style: React.CSSProperties = {
      left: `${x}%`,
      top: `${y}%`,
      transform: `rotate(${item.rotation}deg)`,
      touchAction: "none",
    };

    const commonHandlers = {
      onPointerDown: (e: ReactPointerEvent) =>
        startDrag(e, item),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    };

    const family = fontFamilyFor(item.owner, fonts);

    if (item.kind === "sticker") {
      return (
        <div
          key={item.id}
          className={`fridge-door-sticker owner-${item.owner}${
            isDragging ? " is-dragging" : ""
          }`}
          style={style}
          {...commonHandlers}
        >
          <img
            src={item.imageUrl}
            alt=""
            draggable={false}
          />
          <button
            className="fridge-door-x"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handleDelete(item.id)}
            aria-label="取下"
            type="button"
          >
            <X size={10} strokeWidth={2.6} />
          </button>
        </div>
      );
    }

    if (item.kind === "note") {
      const preset =
        NOTE_COLORS[item.colorIdx ?? 0] ?? NOTE_COLORS[0];
      const bg = item.bgColor ?? preset.bg;
      const border = item.bgColor
        ? deriveBorderColor(item.bgColor)
        : preset.border;
      const text = item.bgColor
        ? deriveTextColor(item.bgColor)
        : preset.text;

      const displayName =
        item.signature ||
        (item.owner === "levi"
          ? "L"
          : item.owner === "erwin"
            ? "E"
            : "我");

      return (
        <div
          key={item.id}
          className={`fridge-door-note owner-${item.owner}${
            isDragging ? " is-dragging" : ""
          }`}
          style={{
            ...style,
            background: bg,
            borderColor: border,
            color: text,
            fontFamily: family,
          }}
          {...commonHandlers}
        >
          <div className="fridge-door-note-text">
            {item.text}
          </div>
          <div className="fridge-door-note-name">
            {displayName}
          </div>
          <button
            className="fridge-door-x"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => handleDelete(item.id)}
            aria-label="撕下"
            type="button"
          >
            <X size={10} strokeWidth={2.6} />
          </button>
        </div>
      );
    }

    return null;
  }

  const editorBorder = deriveBorderColor(noteBgColor);
  const editorText = deriveTextColor(noteBgColor);

  return (
    <>
      <div ref={doorRef} className="fridge-door-lower">
        {items.map(renderItem)}
        <div className="fridge-door-handle" />

        <div className="fridge-door-actions">
          <button
            className="fridge-door-action-btn"
            onClick={() => {
              setShowNoteEditor(false);
              setShowStickerPicker(true);
            }}
            type="button"
          >
            <ImagePlus size={14} strokeWidth={2.2} />
            冰箱贴
          </button>
          <button
            className="fridge-door-action-btn"
            onClick={() => {
              setShowStickerPicker(false);
              setShowNoteEditor(true);
            }}
            type="button"
          >
            <StickyNote size={14} strokeWidth={2.2} />
            便利贴
          </button>
        </div>
      </div>

      {/* ★ 冰箱贴选择器（全屏浮层） */}
      {showStickerPicker && (
        <div
          className="fridge-modal-backdrop"
          onClick={() => setShowStickerPicker(false)}
        >
          <div
            className="fridge-door-picker"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fridge-door-picker-header">
              <h3>选一张冰箱贴</h3>
              <button
                className="fridge-door-picker-close"
                onClick={() =>
                  setShowStickerPicker(false)
                }
                type="button"
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="fridge-door-picker-grid">
              {FRIDGE_STICKER_FILES.map((name) => (
                <button
                  key={name}
                  onClick={() =>
                    handleAddSticker(
                      `/fridge-stickers/${name}.svg`
                    )
                  }
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
          </div>
        </div>
      )}

      {/* ★ 便利贴编辑器（全屏浮层） */}
      {showNoteEditor && (
        <div
          className="fridge-modal-backdrop"
          onClick={closeNoteEditor}
        >
          <div
            className="fridge-door-noteeditor"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fridge-door-noteeditor-header">
              <h3>写张便利贴</h3>
              <button
                className="fridge-door-picker-close"
                onClick={closeNoteEditor}
                type="button"
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* 颜色池 */}
            <div className="fridge-door-notecolors">
              {NOTE_COLORS.map((c, i) => (
                <button
                  key={i}
                  className={
                    noteBgColor.toLowerCase() ===
                    c.bg.toLowerCase()
                      ? "active"
                      : ""
                  }
                  style={{ background: c.bg }}
                  onClick={() => setNoteBgColor(c.bg)}
                  type="button"
                  aria-label={`预设 ${i + 1}`}
                />
              ))}

              <label className="fridge-door-notecolor-custom">
                <span
                  className="fridge-door-notecolor-ring"
                  style={{ background: noteBgColor }}
                />
                <span className="fridge-door-notecolor-plus">
                  +
                </span>
                <input
                  type="color"
                  value={noteBgColor}
                  onChange={(e) =>
                    setNoteBgColor(e.target.value)
                  }
                  aria-label="自定义颜色"
                />
              </label>
            </div>

            <textarea
              className="fridge-door-noteinput"
              style={{
                background: noteBgColor,
                color: editorText,
                borderColor: editorBorder,
                fontFamily: fonts.user
                  ? "FridgeUserFont"
                  : undefined,
              }}
              value={noteDraft}
              onChange={(e) =>
                setNoteDraft(e.target.value)
              }
              placeholder="写一句…… 三天后会自己掉"
              maxLength={60}
              rows={4}
              autoFocus
            />

            <div className="fridge-door-note-signature">
              <input
                type="text"
                value={noteSignature}
                onChange={(e) =>
                  setNoteSignature(e.target.value)
                }
                placeholder="署名（可留空）"
                maxLength={12}
                style={{
                  fontFamily: fonts.user
                    ? "FridgeUserFont"
                    : undefined,
                }}
              />
            </div>

            <div className="fridge-door-noteactions">
              <button
                onClick={closeNoteEditor}
                type="button"
              >
                取消
              </button>
              <button
                onClick={handleAddNote}
                type="button"
              >
                贴上
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}