"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ImagePlus,
  Trash2,
} from "lucide-react";

import type {
  AvatarLibraryItem,
  AvatarLibraryOwner,
  AvatarLibraryScope,
} from "@/data/avatarLibrary";
import { createAvatarLibraryId } from "@/data/avatarLibrary";

import {
  loadAvatarLibrary,
  saveAvatarLibrary,
} from "@/lib/avatarLibraryStorage";

import {
  saveAvatarLibraryFile,
  getAvatarLibraryFile,
  deleteAvatarLibraryFile,
} from "@/lib/avatarLibraryFiles";

import { compressImage } from "@/lib/imageCompress";

type Props = {
  owner: AvatarLibraryOwner;
  onBack: () => void;
};

export default function AvatarLibraryPage({
  owner,
  onBack,
}: Props) {
  const [scope, setScope] =
    useState<AvatarLibraryScope>("chat");
  const [items, setItems] = useState<AvatarLibraryItem[]>(
    []
  );
  const [urls, setUrls] = useState<Record<string, string>>(
    {}
  );
  const [busy, setBusy] = useState(false);

  /* 加载列表 */
  useEffect(() => {
    const all = loadAvatarLibrary();
    setItems(
      all.filter(
        (a) => a.owner === owner && a.scope === scope
      )
    );
  }, [owner, scope]);

  /* 加载预览 URL */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const it of items) {
        try {
          const blob = await getAvatarLibraryFile(it.id);
          if (!blob || cancelled) continue;
          const url = URL.createObjectURL(blob);
          created.push(url);
          next[it.id] = url;
        } catch (e) {
          console.error("加载头像库失败:", it.id, e);
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
      const all = loadAvatarLibrary();
      const added: AvatarLibraryItem[] = [];

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const id = createAvatarLibraryId();
        try {
          const compressed = await compressImage(
            file,
            800,
            0.85
          );
          await saveAvatarLibraryFile(id, compressed);
          added.push({
            id,
            owner,
            scope,
            fileName: file.name,
            enabled: true,
          });
        } catch (e) {
          console.error("保存头像库失败:", file.name, e);
        }
      }

      if (added.length === 0) return;
      const next = [...all, ...added];
      saveAvatarLibrary(next);
      setItems(
        next.filter(
          (a) => a.owner === owner && a.scope === scope
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("删除这张头像？")) return;
    try {
      await deleteAvatarLibraryFile(id);
    } catch (e) {
      console.error(e);
    }
    const next = loadAvatarLibrary().filter(
      (a) => a.id !== id
    );
    saveAvatarLibrary(next);
    setItems(
      next.filter(
        (a) => a.owner === owner && a.scope === scope
      )
    );
  }

  function toggleEnabled(id: string) {
    const next = loadAvatarLibrary().map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    saveAvatarLibrary(next);
    setItems(
      next.filter(
        (a) => a.owner === owner && a.scope === scope
      )
    );
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
          {owner} 的头像库
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

      <div className="avatar-lib-scope-tabs">
        <button
          type="button"
          className={scope === "chat" ? "active" : ""}
          onClick={() => setScope("chat")}
        >
          Chat 头像
        </button>
        <button
          type="button"
          className={scope === "icity" ? "active" : ""}
          onClick={() => setScope("icity")}
        >
          iCity 头像
        </button>
      </div>

      <div className="gallery-scroll">
        {busy && (
          <div className="gallery-busy">正在上传…</div>
        )}

        {items.length === 0 ? (
          <div className="gallery-empty">
            <div className="gallery-empty-title">
              还没有头像
            </div>
            <div className="gallery-empty-desc">
              点右上角上传，聊到一定概率时会自动换上其中一张
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