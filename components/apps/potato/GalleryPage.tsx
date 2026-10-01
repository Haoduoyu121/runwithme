"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ImagePlus,
  Trash2,
} from "lucide-react";

import type {
  GalleryItem,
  GalleryOwner,
} from "@/data/gallery";
import { createGalleryId } from "@/data/gallery";

import {
  loadGallery,
  saveGallery,
} from "@/lib/galleryStorage";

import {
  saveGalleryFile,
  getGalleryFile,
  deleteGalleryFile,
} from "@/lib/galleryFiles";

import { compressImage } from "@/lib/imageCompress";

type Props = {
  owner: GalleryOwner;
  onBack: () => void;
};

export default function GalleryPage({
  owner,
  onBack,
}: Props) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>(
    {}
  );
  const [busy, setBusy] = useState(false);

  /* 加载列表 */
  useEffect(() => {
    const all = loadGallery();
    setItems(all.filter((g) => g.owner === owner));
  }, [owner]);

  /* 加载预览 URL */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const it of items) {
        try {
          const blob = await getGalleryFile(it.id);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[it.id] = url;
        } catch (e) {
          console.error("加载图库失败:", it.id, e);
        }
      }
      if (!cancelled) setUrls(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [items]);

  async function handleUpload(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);

    try {
      const all = loadGallery();
      const added: GalleryItem[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const id = createGalleryId();
        try {
          const compressed = await compressImage(file);
          await saveGalleryFile(id, compressed);
          added.push({
            id,
            owner,
            fileName: file.name,
            enabled: true,
          });
        } catch (e) {
          console.error("保存图库失败:", file.name, e);
        }
      }

      if (added.length === 0) return;
      const next = [...all, ...added];
      saveGallery(next);
      setItems(next.filter((g) => g.owner === owner));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("删除这张图？")) return;
    try {
      await deleteGalleryFile(id);
    } catch (e) {
      console.error(e);
    }
    const next = loadGallery().filter((g) => g.id !== id);
    saveGallery(next);
    setItems(next.filter((g) => g.owner === owner));
  }

  function toggleEnabled(id: string) {
    const next = loadGallery().map((g) =>
      g.id === id ? { ...g, enabled: !g.enabled } : g
    );
    saveGallery(next);
    setItems(next.filter((g) => g.owner === owner));
  }

  return (
    <div className="gallery-page">
      <div className="gallery-topbar">
        <button
          type="button"
          className="gallery-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="gallery-title">
          {owner} 的图库
        </div>

        <label className="gallery-upload">
          <ImagePlus size={20} strokeWidth={2.2} />
          <input
            type="file"
            accept="image/*"
            multiple
            className="ios-file-input"
            onChange={(e) => {
              const files = Array.from(
                e.target.files ?? []
              );
              if (files.length > 0) {
                void handleUpload(files);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="gallery-scroll">
        {busy && (
          <div className="gallery-busy">正在上传…</div>
        )}

        {items.length === 0 ? (
          <div className="gallery-empty">
            <div className="gallery-empty-title">
              还没有图片
            </div>
            <div className="gallery-empty-desc">
              点右上角上传，角色聊天时会随机发出来
            </div>
          </div>
        ) : (
          <div className="gallery-grid">
            {items.map((it) => {
              const url = urls[it.id];
              return (
                <div
                  key={it.id}
                  className={
                    "gallery-item" +
                    (it.enabled ? "" : " is-disabled")
                  }
                >
                  {url ? (
                    <img src={url} alt={it.fileName} />
                  ) : (
                    <div className="gallery-item-placeholder" />
                  )}

                  <div className="gallery-item-actions">
                    <button
                      type="button"
                      className="gallery-item-btn"
                      onClick={() => toggleEnabled(it.id)}
                      title={it.enabled ? "禁用" : "启用"}
                    >
                      {it.enabled ? "●" : "○"}
                    </button>
                    <button
                      type="button"
                      className="gallery-item-btn is-danger"
                      onClick={() => void handleDelete(it.id)}
                      title="删除"
                    >
                      <Trash2 size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}