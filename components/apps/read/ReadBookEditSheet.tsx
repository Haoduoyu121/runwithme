"use client";

import { useEffect, useRef, useState } from "react";

import { Trash2, X } from "lucide-react";

import type { ReadBook } from "@/data/read";

import { clearReadChat } from "@/lib/readChatStorage";

import {
  saveReadCover,
  getReadCover,
  deleteReadCover,
} from "@/lib/readCoverFiles";

import {
  upsertBook,
  removeBook,
} from "@/lib/readLibraryStorage";
import { deleteBookText } from "@/lib/readBookFiles";

type ReadBookEditSheetProps = {
  book: ReadBook;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export default function ReadBookEditSheet({
  book,
  onClose,
  onSaved,
  onDeleted,
}: ReadBookEditSheetProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [coverImageId, setCoverImageId] = useState<
    string | undefined
  >(book.coverImageId);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);

  /* 所有创建过的 objectURL，卸载时统一释放 */
  const createdUrlsRef = useRef<string[]>([]);

  function trackUrl(url: string) {
    createdUrlsRef.current.push(url);
  }

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((u) =>
        URL.revokeObjectURL(u)
      );
      createdUrlsRef.current = [];
    };
  }, []);

  /* 加载已有的自定义封面预览 */
  useEffect(() => {
    const id = book.coverImageId;
    if (!id) return;

    let cancelled = false;

    async function load() {
      try {
        const blob = await getReadCover(id!);
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        trackUrl(url);
        setCoverPreviewUrl(url);
      } catch (e) {
        console.error("[Read] 加载封面失败:", e);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [book.coverImageId]);

  async function handleCoverFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("请选图片文件");
      return;
    }

    setBusy(true);
    try {
      const id = `read-cover-${book.id}`;
      await saveReadCover(id, file);
      const url = URL.createObjectURL(file);
      trackUrl(url);
      setCoverImageId(id);
      setCoverPreviewUrl(url);
    } catch (e) {
      console.error("[Read] 保存封面失败:", e);
      alert("封面保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveCover() {
    if (!coverImageId) return;
    if (!window.confirm("移除这本书的自定义封面？")) return;

    setBusy(true);
    try {
      await deleteReadCover(coverImageId);
      setCoverImageId(undefined);
      setCoverPreviewUrl(null);
    } catch (e) {
      console.error("[Read] 删除封面失败:", e);
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    const trimmedTitle = title.trim() || "未命名";
    const trimmedAuthor = author.trim();

    upsertBook({
      ...book,
      title: trimmedTitle,
      author: trimmedAuthor,
      coverImageId,
    });

    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `删除《${book.title}》？\n\n书的内容和封面也会一并删掉。`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      if (coverImageId) {
        try {
          await deleteReadCover(coverImageId);
        } catch (e) {
          console.error("[Read] 删封面失败:", e);
        }
      }
      try {
        await deleteBookText(book.id);
      } catch (e) {
        console.error("[Read] 删正文失败:", e);
      }
      clearReadChat(book.id);
      removeBook(book.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  const showPreviewImage =
    !!coverImageId && !!coverPreviewUrl;
  const showLoading =
    !!coverImageId && !coverPreviewUrl;
  const showFallback = !coverImageId;

  const previewStyle: React.CSSProperties =
    showPreviewImage
      ? {
          backgroundImage: `url(${coverPreviewUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : showFallback
        ? { background: book.coverColor }
        : {};

  return (
    <div
      className="read-edit-backdrop"
      onClick={onClose}
    >
      <div
        className="read-edit-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="read-edit-header">
          <h2>编辑书籍</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="read-edit-body">
          <div className="read-edit-cover-section">
            <div
              className="read-edit-cover-preview"
              style={previewStyle}
            >
              {showLoading && (
                <span className="read-edit-cover-loading">
                  加载中…
                </span>
              )}
              {showFallback && (
                <span className="read-edit-cover-title-preview">
                  {title.trim() || "书名"}
                </span>
              )}
            </div>

            <div className="read-edit-cover-actions">
              <label className="read-edit-cover-btn">
                {coverImageId ? "换封面" : "上传封面"}
                <input
                  type="file"
                  accept="image/*"
                  className="ios-file-input"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCoverFile(f);
                    e.target.value = "";
                  }}
                />
              </label>

              {coverImageId && (
                <button
                  className="read-edit-cover-btn danger"
                  onClick={() =>
                    void handleRemoveCover()
                  }
                  disabled={busy}
                >
                  移除封面
                </button>
              )}
            </div>
          </div>

          <label className="read-edit-field">
            <span>书名</span>
            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              maxLength={80}
              placeholder="书名"
            />
          </label>

          <label className="read-edit-field">
            <span>作者</span>
            <input
              type="text"
              value={author}
              onChange={(e) =>
                setAuthor(e.target.value)
              }
              maxLength={60}
              placeholder="留空为佚名"
            />
          </label>
        </div>

        <div className="read-edit-footer">
          <button
            className="read-edit-delete"
            onClick={() => void handleDelete()}
            disabled={busy}
          >
            <Trash2 size={14} strokeWidth={2.4} />
            删除
          </button>

          <div className="read-edit-footer-right">
            <button
              className="read-edit-btn ghost"
              onClick={onClose}
              disabled={busy}
            >
              取消
            </button>
            <button
              className="read-edit-btn"
              onClick={handleSave}
              disabled={busy}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}