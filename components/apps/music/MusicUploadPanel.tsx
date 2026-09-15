"use client";

import { useEffect, useState } from "react";

import {
  defaultMusic,
  type MusicItem,
  type MusicSource,
} from "@/data/music";

import {
  loadMusic,
  saveMusic,
} from "@/lib/musicStorage";

import {
  saveMusicFile,
  deleteMusicFile,
} from "@/lib/musicFiles";

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

  useEffect(() => {
    setMusic(loadMusic(defaultMusic));
  }, []);

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
      if (!file.name.toLowerCase().endsWith(".mp3")) {
        alert("目前只接受 MP3 文件。");
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
                <option value="file">本地 MP3</option>
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
              <label>
                MP3 文件
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
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
              music.map((item) => (
                <div
                  key={item.id}
                  className="music-v2-panel-item"
                >
                  <div className="music-v2-panel-item-info">
                    <strong>{item.title}</strong>
                    <small>
                      {item.artist || "RunWithme"}
                      {item.fileName
                        ? ` · ${item.fileName}`
                        : ""}
                    </small>
                  </div>

                  <button
                    className="music-v2-panel-item-toggle"
                    onClick={() => handleToggle(item)}
                  >
                    {item.enabled ? "启用" : "停用"}
                  </button>

                  <button
                    className="music-v2-panel-item-delete"
                    onClick={() => void handleDelete(item)}
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}