"use client";

import { useEffect, useRef, useState } from "react";

import {
  createVoiceCardId,
  type VoiceCard,
  type VoiceCardCharacter,
} from "@/data/checkinVoiceCards";

import {
  saveVoiceFile,
  getVoiceFile,
  deleteVoiceFile,
} from "@/lib/checkinVoiceFiles";

type Props = {
  cards: VoiceCard[];
  onChange: (next: VoiceCard[]) => void;
  onClose: () => void;
};

const LIMIT_AUDIO = 20 * 1024 * 1024;

export default function VoicePoolEditor({
  cards,
  onChange,
  onClose,
}: Props) {
  const [tab, setTab] =
    useState<VoiceCardCharacter>("Levi");

  /* 新卡草稿 */
  const [draftText, setDraftText] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  /* 试听状态 */
  const [playingId, setPlayingId] = useState<
    string | null
  >(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  /* 文件选择 */
  const fileInputRef = useRef<HTMLInputElement | null>(
    null
  );

  /* 挂载时清理 */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  function pickFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    const nameLower = (file.name || "").toLowerCase();
    const isAudioByName =
      nameLower.endsWith(".mp3") ||
      nameLower.endsWith(".m4a") ||
      nameLower.endsWith(".wav") ||
      nameLower.endsWith(".aac") ||
      nameLower.endsWith(".ogg") ||
      nameLower.endsWith(".opus");
    const isAudioByType =
      typeof file.type === "string" &&
      file.type.toLowerCase().startsWith("audio/");

    if (!isAudioByName && !isAudioByType) {
      alert(
        "请上传音频文件（mp3 / m4a / wav / aac / ogg / opus）。"
      );
      return;
    }

    if (file.size > LIMIT_AUDIO) {
      alert(
        `音频不能超过 20MB，当前 ${(
          file.size /
          1024 /
          1024
        ).toFixed(1)}MB。`
      );
      return;
    }

    setDraftFile(file);
  }

  async function handleAdd() {
    const text = draftText.trim();
    if (!text) {
      alert("请填写语音对应的文字。");
      return;
    }
    if (!draftFile) {
      alert("请上传一个语音文件。");
      return;
    }

    setSaving(true);
    try {
      const id = createVoiceCardId();

      console.log(
        "[VoicePool] 保存文件…",
        id,
        draftFile.name,
        draftFile.size,
        "bytes"
      );

      await saveVoiceFile(id, draftFile);

      console.log("[VoicePool] 文件已保存，写入卡片列表");

      const next: VoiceCard = {
        id,
        character: tab,
        text,
        audioMime: draftFile.type,
        enabled: true,
        createdAt: Date.now(),
      };

      onChange([...cards, next]);
      setDraftText("");
      setDraftFile(null);
    } catch (e) {
      console.error("[VoicePool] 保存失败:", e);
      alert(
        "保存失败：" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(id: string, text: string) {
    onChange(
      cards.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }

  function handleToggle(id: string) {
    onChange(
      cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    );
  }

  async function handleDelete(id: string) {
    if (!window.confirm("删除这张语音卡？")) return;
    try {
      await deleteVoiceFile(id);
    } catch (e) {
      console.error("删除语音文件失败:", e);
    }
    onChange(cards.filter((c) => c.id !== id));

    if (playingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }

  async function handlePlay(id: string) {
    /* 正在播 → 停止 */
    if (playingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      return;
    }

    /* 换一张 → 停旧的 */
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    try {
      const blob = await getVoiceFile(id);
      if (!blob) {
        alert("找不到这个语音文件。");
        return;
      }
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        setPlayingId(null);
        if (urlRef.current === url) {
          URL.revokeObjectURL(url);
          urlRef.current = null;
        }
        audioRef.current = null;
      });

      await audio.play();
      setPlayingId(id);
    } catch (e) {
      console.error("试听失败:", e);
      setPlayingId(null);
    }
  }

  const filtered = cards.filter((c) => c.character === tab);

  return (
    <div
      className="checkin-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="checkin-modal checkin-voice-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkin-modal-header">
          <h2>Voice Cards</h2>
          <button
            className="checkin-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="checkin-segment">
          <button
            className={tab === "Levi" ? "active" : ""}
            onClick={() => setTab("Levi")}
          >
            Levi
          </button>
          <button
            className={tab === "Erwin" ? "active" : ""}
            onClick={() => setTab("Erwin")}
          >
            Erwin
          </button>
        </div>

        {/* 新增 */}
        <div className="voice-add-panel">
          <div className="voice-add-row">
            <textarea
              className="voice-add-text"
              value={draftText}
              onChange={(e) =>
                setDraftText(e.target.value)
              }
              placeholder="语音对应的文字（气泡里显示这句）…"
              maxLength={80}
              rows={2}
            />
          </div>

          <div className="voice-add-row voice-add-file-row">
            <button
              type="button"
              className="voice-add-file"
              onClick={() => fileInputRef.current?.click()}
            >
              {draftFile
                ? draftFile.name
                : "选择 mp3 / m4a"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="ios-file-input-detached"
              accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.opus,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a"
              onChange={(e) => {
                pickFile(e.target.files);
                e.target.value = "";
              }}
            />

            <button
              className="voice-add-btn"
              onClick={handleAdd}
              disabled={saving || !draftText.trim() || !draftFile}
            >
              {saving ? "保存中…" : "添加"}
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="checkin-pool-list">
          {filtered.length === 0 ? (
            <div className="checkin-pool-empty">
              还没有 {tab} 的语音卡
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`voice-card-item${
                  c.enabled ? "" : " is-disabled"
                }`}
              >
                <button
                  className="voice-card-play"
                  onClick={() => handlePlay(c.id)}
                  aria-label={
                    playingId === c.id ? "停止" : "试听"
                  }
                >
                  {playingId === c.id ? "❚❚" : "▶"}
                </button>

                <input
                  className="voice-card-text"
                  type="text"
                  value={c.text}
                  onChange={(e) =>
                    handleRename(c.id, e.target.value)
                  }
                  maxLength={80}
                />

                <button
                  className="checkin-pool-toggle"
                  onClick={() => handleToggle(c.id)}
                >
                  {c.enabled ? "停用" : "启用"}
                </button>

                <button
                  className="checkin-pool-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="checkin-modal-footer">
          <button
            className="checkin-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}