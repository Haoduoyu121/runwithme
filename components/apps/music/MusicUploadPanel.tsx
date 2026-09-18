"use client";

import { useEffect, useRef, useState } from "react";

import {
  defaultMusic,
  type MusicItem,
  type MusicSource,
} from "@/data/music";

import { loadMusic, saveMusic } from "@/lib/musicStorage";

import {
  saveMusicFile,
  deleteMusicFile,
} from "@/lib/musicFiles";

import {
  saveMusicCover,
  getMusicCover,
  deleteMusicCover,
} from "@/lib/musicCoverFiles";

type MusicUploadPanelProps = {
  onClose: () => void;
};


export default function MusicUploadPanel({
  onClose,
}: MusicUploadPanelProps) {
  const [music, setMusic] = useState<MusicItem[]>([]);
  const [tab, setTab] = useState<"add" | "manage">("add");

  const [source, setSource] = useState<MusicSource>("file");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  /* ★ 管理面板封面 */
  const [coverUrls, setCoverUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setMusic(loadMusic(defaultMusic));
  }, []);

  /* 加载所有封面缩略图 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: Record<string, string> = {};
      for (const item of music) {
        if (!item.coverId) continue;
        try {
          const blob = await getMusicCover(item.coverId);
          if (!blob || cancelled) continue;
          const u = URL.createObjectURL(blob);
          created.push(u);
          next[item.id] = u;
        } catch (e) {
          console.error("加载封面失败:", e);
        }
      }
      if (!cancelled) setCoverUrls(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [music]);

  function updateList(next: MusicItem[]) {
    setMusic(next);
    saveMusic(next);
  }

  function resetForm() {
    setTitle("");
    setArtist("");
    setUrl("");
    setFile(null);
    setSource("file");
  }

  async function handleAdd() {
    if (!title.trim()) {
      alert("请填写歌曲名。");
      return;
    }

    if (source === "file") {
      if (!file) {
        alert("请选择 MP3 文件。");
        return;
      }

      const nameLower = file.name.toLowerCase();
      const isAudioByName =
        nameLower.endsWith(".mp3") ||
        nameLower.endsWith(".m4a") ||
        nameLower.endsWith(".wav") ||
        nameLower.endsWith(".aac") ||
        nameLower.endsWith(".ogg") ||
        nameLower.endsWith(".opus");
      const isAudioByType = file.type
        .toLowerCase()
        .startsWith("audio/");

      if (!isAudioByName && !isAudioByType) {
        alert("目前只接受音频文件。");
        return;
      }

      const id = `music-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      try {
        await saveMusicFile(id, file);

        const newItem: MusicItem = {
          id,
          title: title.trim(),
          artist: artist.trim() || "RunWithme",
          url: "",
          enabled: true,
          source: "file",
          fileName: file.name,
        };

        updateList([...music, newItem]);
        resetForm();
      } catch (e) {
        console.error(e);
        alert("保存失败，请查看控制台。");
      }

      return;
    }

    if (!url.trim()) {
      alert("请填写音频地址。");
      return;
    }

    const id = `music-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const newItem: MusicItem = {
      id,
      title: title.trim(),
      artist: artist.trim() || "RunWithme",
      url: url.trim(),
      enabled: true,
      source: "url",
    };

    updateList([...music, newItem]);
    resetForm();
  }

  async function handleDelete(item: MusicItem) {
    if (!window.confirm(`确定删除《${item.title}》吗？`)) {
      return;
    }

    if (item.source === "file") {
      try {
        await deleteMusicFile(item.id);
      } catch (e) {
        console.error(e);
      }
    }

    /* ★ 同时删除封面 */
    if (item.coverId) {
      try {
        await deleteMusicCover(item.coverId);
      } catch (e) {
        console.error(e);
      }
    }

    updateList(music.filter((m) => m.id !== item.id));
  }

  function handleToggle(item: MusicItem) {
    updateList(
      music.map((m) =>
        m.id === item.id
          ? { ...m, enabled: !m.enabled }
          : m
      )
    );
  }

  /* ★ 封面管理（直接接收 itemId，不再用 ref 中转） */
  async function handleCoverFile(itemId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件。");
      return;
    }

    const coverId = `cover-${itemId}`;

    try {
      await saveMusicCover(coverId, file);

      const next = music.map((m) =>
        m.id === itemId ? { ...m, coverId } : m
      );
      updateList(next);

      const u = URL.createObjectURL(file);
      setCoverUrls((prev) => ({
        ...prev,
        [itemId]: u,
      }));
    } catch (e) {
      console.error("保存封面失败:", e);
      alert("封面保存失败。");
    }
  }

  async function handleCoverRemove(item: MusicItem) {
    if (!item.coverId) return;
    if (!window.confirm("移除这张封面？")) return;

    try {
      await deleteMusicCover(item.coverId);
    } catch (e) {
      console.error(e);
    }

    const next = music.map((m) =>
      m.id === item.id ? { ...m, coverId: undefined } : m
    );
    updateList(next);

    setCoverUrls((prev) => {
      const copy = { ...prev };
      const u = copy[item.id];
      if (u) URL.revokeObjectURL(u);
      delete copy[item.id];
      return copy;
    });
  }

  return (
    <div
      className="music-v2-panel-backdrop"
      onClick={onClose}
    >
      <div
        className="music-v2-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="music-v2-panel-header">
          <h2>音乐管理</h2>

          <button onClick={onClose}>×</button>
        </div>

        <div className="music-v2-panel-tabs">
          <button
            className={tab === "add" ? "active" : ""}
            onClick={() => setTab("add")}
          >
            添加
          </button>

          <button
            className={tab === "manage" ? "active" : ""}
            onClick={() => setTab("manage")}
          >
            管理 ({music.length})
          </button>
        </div>

        {tab === "add" && (
          <div className="music-v2-panel-form">
            <label>
              来源
              <select
                value={source}
                onChange={(e) =>
                  setSource(e.target.value as MusicSource)
                }
              >
                <option value="file">本地音频</option>
                <option value="url">网络 URL</option>
              </select>
            </label>

            <label>
              歌曲名
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Run With Me"
              />
            </label>

            <label>
              歌手
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="可留空"
              />
            </label>

            {source === "file" ? (
              <label className="music-upload-file-label">
                <span>音频文件</span>
                <span className="music-upload-file-value">
                  {file ? file.name : "选择文件"}
                </span>
                <input
                  type="file"
                  className="ios-file-input"
                  accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
            ) : (
              <label>
                音频地址
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
            )}

            <button
              className="music-v2-panel-primary"
              onClick={() => void handleAdd()}
            >
              添加到播放列表
            </button>
          </div>
        )}

        {tab === "manage" && (
          <div className="music-v2-panel-manage">
            {music.length === 0 ? (
              <div className="music-v2-panel-empty">
                还没有音乐
              </div>
            ) : (
              music.map((item) => {
                const coverUrl = coverUrls[item.id];

                return (
                  <div
                    key={item.id}
                    className="music-v2-panel-item"
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt=""
                        className="music-v2-panel-item-cover"
                      />
                    ) : (
                      <div className="music-v2-panel-item-cover music-v2-panel-item-cover-empty">
                        ♪
                      </div>
                    )}

                    <div className="music-v2-panel-item-info">
                      <strong>{item.title}</strong>
                      <small>
                        {item.artist || "RunWithme"}
                        {item.fileName
                          ? ` · ${item.fileName}`
                          : ""}
                      </small>
                    </div>

                    <label
                      className="music-v2-panel-item-cover-btn"
                      title="设置封面"
                    >
                      {item.coverId ? "换封面" : "设封面"}
                      <input
                        type="file"
                        className="ios-file-input"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleCoverFile(item.id, f);
                          e.target.value = "";
                        }}
                      />
                    </label>

                    {item.coverId && (
                      <button
                        className="music-v2-panel-item-cover-btn"
                        onClick={() =>
                          void handleCoverRemove(item)
                        }
                        title="移除封面"
                      >
                        移除
                      </button>
                    )}

                    <button
                      className="music-v2-panel-item-toggle"
                      onClick={() => handleToggle(item)}
                    >
                      {item.enabled ? "启用" : "停用"}
                    </button>

                    <button
                      className="music-v2-panel-item-delete"
                      onClick={() =>
                        void handleDelete(item)
                      }
                    >
                      删除
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}