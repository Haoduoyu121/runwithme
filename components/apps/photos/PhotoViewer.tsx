"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  PhotoItem,
  PhotoCategory,
} from "@/lib/photoStorage";

const MAX_DESC = 300;

type PhotoViewerProps = {
  photos: PhotoItem[];
  urls: Record<string, string>;
  index: number;
  categories: PhotoCategory[];
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  onUpdateDescription: (
    id: string,
    description: string
  ) => void;
  onSetCategory: (
    id: string,
    categoryId: string | null
  ) => void;
  onDelete: (id: string) => void;
};

export default function PhotoViewer({
  photos,
  urls,
  index,
  categories,
  onClose,
  onNavigate,
  onUpdateDescription,
  onSetCategory,
  onDelete,
}: PhotoViewerProps) {
  const photo = photos[index];

  const [desc, setDesc] = useState(
    photo?.description ?? ""
  );

  const [showUI, setShowUI] = useState(true);

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    active: false,
  });

  useEffect(() => {
    setDesc(photo?.description ?? "");
  }, [photo?.id, photo?.description]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowLeft" && index > 0) {
        onNavigate(index - 1);
      }

      if (
        e.key === "ArrowRight" &&
        index < photos.length - 1
      ) {
        onNavigate(index + 1);
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [index, photos.length, onClose, onNavigate]);

  function handleTouchStart(
    e: React.TouchEvent<HTMLDivElement>
  ) {
    const t = e.touches[0];
    if (!t) return;

    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      active: true,
    };
  }

  function handleTouchEnd(
    e: React.TouchEvent<HTMLDivElement>
  ) {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;

    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - touchRef.current.startX;
    const dy = t.clientY - touchRef.current.startY;

    if (
      Math.abs(dx) < 60 ||
      Math.abs(dx) < Math.abs(dy)
    ) {
      return;
    }

    if (dx < 0 && index < photos.length - 1) {
      onNavigate(index + 1);
    }

    if (dx > 0 && index > 0) {
      onNavigate(index - 1);
    }
  }

  function handleDescChange(value: string) {
    const v = value.slice(0, MAX_DESC);
    setDesc(v);

    if (photo) {
      onUpdateDescription(photo.id, v);
    }
  }

  function handleDelete() {
    if (!photo) return;

    const confirmed = window.confirm(
      "确定要删除这张照片吗？此操作不可恢复。"
    );
    if (!confirmed) return;

    onDelete(photo.id);
  }

  function handleBackdropClick(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!photo) return null;

  const url = urls[photo.id];

  const date = new Date(photo.createdAt);
  const dateText = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="photo-viewer"
      onClick={handleBackdropClick}
    >
      <div
        className={`photo-viewer-top${
          showUI ? "" : " is-hidden"
        }`}
      >
        <button
          className="photo-viewer-btn"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>

        <div className="photo-viewer-date">
          {dateText}
        </div>

        <button
          className="photo-viewer-btn photo-viewer-btn-danger"
          onClick={handleDelete}
          aria-label="删除"
        >
          🗑
        </button>
      </div>

      <div
        className="photo-viewer-image"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowUI((prev) => !prev);
          }
        }}
      >
        {url ? (
          <img
            src={url}
            alt={photo.fileName || "Photo"}
            onClick={() =>
              setShowUI((prev) => !prev)
            }
          />
        ) : (
          <div className="photo-viewer-loading">
            加载中…
          </div>
        )}

        {index > 0 && (
          <button
            className="photo-viewer-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index - 1);
            }}
            aria-label="上一张"
          >
            ‹
          </button>
        )}

        {index < photos.length - 1 && (
          <button
            className="photo-viewer-nav next"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(index + 1);
            }}
            aria-label="下一张"
          >
            ›
          </button>
        )}
      </div>

      <div
        className={`photo-viewer-bottom${
          showUI ? "" : " is-hidden"
        }`}
      >
        {/* 分类 pills */}
        <div className="photo-viewer-cats">
          <button
            className={
              photo.categoryId === null
                ? "photo-viewer-cat active"
                : "photo-viewer-cat"
            }
            onClick={() =>
              onSetCategory(photo.id, null)
            }
          >
            未分类
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              className={
                photo.categoryId === c.id
                  ? "photo-viewer-cat active"
                  : "photo-viewer-cat"
              }
              onClick={() =>
                onSetCategory(photo.id, c.id)
              }
            >
              {c.name}
            </button>
          ))}
        </div>

        <textarea
          className="photo-viewer-textarea"
          value={desc}
          onChange={(e) =>
            handleDescChange(e.target.value)
          }
          placeholder="添加描述…"
          maxLength={MAX_DESC}
          rows={3}
        />

        <div className="photo-viewer-count">
          <span>
            {desc.length} / {MAX_DESC}
          </span>

          <span>
            {index + 1} / {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}