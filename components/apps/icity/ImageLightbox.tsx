"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
};

export default function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    dragging: false,
    moved: false,
    pinchStartDist: 0,
    pinchStartScale: 1,
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const lastTapRef = useRef(0);

  const total = images.length;
  const currentUrl = images[index] ?? "";

  /* 切换图片时重置缩放 */
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  /* 键盘操作 */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (scale > 1) return;

      if (e.key === "ArrowLeft" && index > 0) {
        setIndex(index - 1);
      }

      if (e.key === "ArrowRight" && index < total - 1) {
        setIndex(index + 1);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [index, total, scale, onClose]);

  /* 锁定 body 滚动 */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleDoubleTap() {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }

  function handleClick() {
    const now = Date.now();
    const diff = now - lastTapRef.current;

    if (diff < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
    /* 单击延迟关闭 —— 用 setTimeout 也行，
       但这里简单点，单击不关闭，让用户可以缩放 */
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      touchRef.current.pinchStartDist = Math.hypot(
        dx,
        dy
      );
      touchRef.current.pinchStartScale = scale;
      touchRef.current.dragging = false;
      return;
    }

    const t = e.touches[0];
    touchRef.current = {
      ...touchRef.current,
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now(),
      dragging: true,
      moved: false,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    /* 双指缩放 */
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = a.clientX - b.clientX;
      const dy = a.clientY - b.clientY;
      const dist = Math.hypot(dx, dy);
      const ratio =
        dist / (touchRef.current.pinchStartDist || 1);
      const next = Math.min(
        4,
        Math.max(
          1,
          touchRef.current.pinchStartScale * ratio
        )
      );
      setScale(next);
      return;
    }

    if (!touchRef.current.dragging) return;

    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      touchRef.current.moved = true;
    }

    /* 放大时平移 */
    if (scale > 1) {
      setOffset({ x: dx, y: dy });
      return;
    }

    /* 未放大时：
       - 竖向拖动 → 关闭
       - 横向拖动 → 切换
       先不实时移动，在 end 里处理 */
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (
      touchRef.current.dragging &&
      e.touches.length === 0
    ) {
      const touch =
        e.changedTouches[e.changedTouches.length - 1];
      const dx =
        touch.clientX - touchRef.current.startX;
      const dy =
        touch.clientY - touchRef.current.startY;
      const dt =
        Date.now() - touchRef.current.startTime;

      /* 缩小时 */
      if (scale > 1) {
        /* 拖动结束，保持 offset 不变或回弹 */
        if (
          Math.abs(dx) > 60 ||
          Math.abs(dy) > 60
        ) {
          /* 允许自由平移，不回弹 */
        }
        touchRef.current.dragging = false;
        return;
      }

      /* 快速滑动关闭 */
      if (
        Math.abs(dy) > 80 &&
        Math.abs(dy) > Math.abs(dx) &&
        dt < 400
      ) {
        onClose();
        touchRef.current.dragging = false;
        return;
      }

      /* 横向切换 */
      if (
        Math.abs(dx) > 60 &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        if (dx < 0 && index < total - 1) {
          setIndex(index + 1);
        } else if (dx > 0 && index > 0) {
          setIndex(index - 1);
        }
      }
    }

    touchRef.current.dragging = false;
  }

  /* 点击背景关闭 */
  function onBackdropClick(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!currentUrl) return null;

  return (
    <div
      className="icity-lightbox"
      onClick={onBackdropClick}
    >
      {/* 顶栏 */}
      <div className="icity-lightbox-top">
        <button
          className="icity-lightbox-close"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>

        {total > 1 && (
          <div className="icity-lightbox-counter">
            {index + 1} / {total}
          </div>
        )}

        <div className="icity-lightbox-placeholder" />
      </div>

      {/* 图片 */}
      <div
        className="icity-lightbox-body"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imageRef}
          className="icity-lightbox-image"
          src={currentUrl}
          alt=""
          onClick={handleClick}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? "move" : "zoom-in",
          }}
          draggable={false}
        />
      </div>

      {/* 左右切换（桌面） */}
      {total > 1 && scale === 1 && (
        <>
          {index > 0 && (
            <button
              className="icity-lightbox-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(index - 1);
              }}
              aria-label="上一张"
            >
              ‹
            </button>
          )}
          {index < total - 1 && (
            <button
              className="icity-lightbox-nav next"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(index + 1);
              }}
              aria-label="下一张"
            >
              ›
            </button>
          )}
        </>
      )}

      {/* 缩略图指示器 */}
      {total > 1 && (
        <div className="icity-lightbox-dots">
          {images.map((_, i) => (
            <button
              key={i}
              className={`icity-lightbox-dot${
                i === index ? " active" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              aria-label={`查看第 ${i + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  );
}