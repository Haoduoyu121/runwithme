"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useICity } from "@/lib/ICityContext";
import { compressImage } from "@/lib/photoUtils";

const MAX_LENGTH = 500;
const MAX_IMAGES = 2;

type NewPostModalProps = {
  onClose: () => void;
  onSubmit: (text: string, files: File[]) => void;
};

type PreviewImage = {
  file: File;
  url: string;
};

export default function NewPostModal({
  onClose,
  onSubmit,
}: NewPostModalProps) {
  const { profiles, avatarUrls } = useICity();

  const [text, setText] = useState("");
  const [images, setImages] = useState<PreviewImage[]>(
    []
  );
  const [compressing, setCompressing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const myProfile = profiles.Yui;
  const myAvatarUrl = avatarUrls.Yui;
  const initial =
    myProfile.name.trim().charAt(0) || "Y";

  const trimmed = text.trim();
  const canPost =
    (trimmed.length > 0 || images.length > 0) &&
    !compressing;

  /* 卸载时回收预览 URL */
  useEffect(() => {
    return () => {
      images.forEach((img) =>
        URL.revokeObjectURL(img.url)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePickFiles(
    files: FileList
  ) {
    const incoming = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (incoming.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;

    const toAdd = incoming.slice(0, remaining);

    setCompressing(true);

    try {
      const next: PreviewImage[] = [];

      for (const file of toAdd) {
        try {
          const { blob } = await compressImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            maxSizeBytes: 1.2 * 1024 * 1024,
          });

          /* 把 Blob 转回 File，方便存 IndexedDB */
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + ".jpg",
            { type: blob.type || "image/jpeg" }
          );

          const url = URL.createObjectURL(compressed);

          next.push({ file: compressed, url });
        } catch (e) {
          console.error("压缩图片失败:", e);
          /* 压缩失败就用原文件 */
          const url = URL.createObjectURL(file);
          next.push({ file, url });
        }
      }

      setImages((prev) => [...prev, ...next]);
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const target = next[index];
      if (target) URL.revokeObjectURL(target.url);
      next.splice(index, 1);
      return next;
    });
  }

  function handleSubmit() {
    if (!canPost) return;

    onSubmit(
      trimmed,
      images.map((img) => img.file)
    );
    onClose();
  }

  return (
    <div
      className="icity-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="icity-modal icity-post-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="icity-modal-header">
          <h2>New Post</h2>

          <button
            className="icity-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="icity-modal-avatar">
          <div
            className={`icity-avatar icity-avatar-you${
              myAvatarUrl
                ? " icity-avatar-has-image"
                : ""
            }`}
          >
            {myAvatarUrl ? (
              <img
                src={myAvatarUrl}
                alt={myProfile.name}
              />
            ) : (
              initial
            )}
          </div>
          <span className="icity-modal-name">
            {myProfile.name}
          </span>
        </div>

        <textarea
          className="icity-modal-textarea"
          value={text}
          onChange={(e) =>
            setText(e.target.value.slice(0, MAX_LENGTH))
          }
          placeholder="What's on your mind?"
          maxLength={MAX_LENGTH}
          autoFocus
          rows={5}
        />

        {/* 图片预览 */}
        {images.length > 0 && (
          <div
            className={`icity-post-preview-grid count-${images.length}`}
          >
            {images.map((img, index) => (
              <div
                key={img.url}
                className="icity-post-preview-item"
              >
                <img src={img.url} alt="" />

                <button
                  className="icity-post-preview-remove"
                  onClick={() => removeImage(index)}
                  aria-label="移除图片"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="icity-modal-footer icity-post-modal-footer">
          <div className="icity-post-modal-tools">
            <button
              type="button"
              className="icity-post-add-image"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                images.length >= MAX_IMAGES ||
                compressing
              }
              aria-label="添加图片"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="3"
                />
                <circle cx="9" cy="10" r="1.6" />
                <path d="M3 17l5-4 4 3 4-3 5 4" />
              </svg>

              <span>
                {compressing
                  ? "处理中…"
                  : images.length === 0
                    ? "添加图片"
                    : `${images.length}/${MAX_IMAGES}`}
              </span>
            </button>

            <span className="icity-modal-count">
              {text.length} / {MAX_LENGTH}
            </span>
          </div>

          <button
            className="icity-modal-post"
            disabled={!canPost}
            onClick={handleSubmit}
          >
            Post
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
}}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              void handlePickFiles(files);
            }
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}