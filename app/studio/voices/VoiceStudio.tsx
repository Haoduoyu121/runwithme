"use client";

import { useEffect, useRef, useState } from "react";
import type {
  VoiceCard,
  VoiceCharacter,
} from "@/data/voices";

import {
  loadVoices,
  saveVoices,
} from "@/lib/voiceStorage";

import {
  saveVoiceFile,
  getVoiceFile,
  deleteVoiceFile,
} from "@/lib/voiceFiles";

function createVoiceId(): string {
  return `voice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export default function VoiceStudio() {
  const [voices, setVoices] = useState<VoiceCard[]>([]);

  const [character, setCharacter] =
    useState<VoiceCharacter>("Levi");

  const [transcript, setTranscript] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrls, setPreviewUrls] =
    useState<Record<string, string>>({});

  const [playingId, setPlayingId] =
    useState<string | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  /*
   * 读取已经保存的语音卡
   */
  useEffect(() => {
    setVoices(loadVoices());
  }, []);

  /*
   * 保存语音卡资料
   *
   * MP3 文件本身不会放进 LocalStorage。
   * MP3 存在 IndexedDB。
   * LocalStorage 只保存：
   * 角色、文件名、文字稿、启用状态等资料。
   */
  useEffect(() => {
    saveVoices(voices);
  }, [voices]);

  /*
   * 页面打开时，为已经存在的语音
   * 生成可以播放的 Blob URL。
   */
  useEffect(() => {
    let cancelled = false;

    async function restoreAudioPreviews() {
      const urls: Record<string, string> = {};

      for (const voice of voices) {
        try {
          const file = await getVoiceFile(
            voice.mediaId
          );

          if (!file) {
            continue;
          }

          if (cancelled) {
            return;
          }

          urls[voice.id] =
            URL.createObjectURL(file);
        } catch (error) {
          console.error(
            "读取语音文件失败:",
            error
          );
        }
      }

      if (!cancelled) {
        setPreviewUrls(urls);
      }
    }

    if (voices.length > 0) {
      void restoreAudioPreviews();
    } else {
      setPreviewUrls({});
    }

    return () => {
      cancelled = true;
    };
  }, [voices]);

  /*
   * 离开页面时释放 Blob URL
   */
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(
        (url) => {
          URL.revokeObjectURL(url);
        }
      );

      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [previewUrls]);

  /*
   * 添加语音
   */
  async function handleAddVoice() {
    if (!selectedFile) {
      alert("请先选择 MP3 文件。");
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".mp3")
    ) {
      alert("目前只接受 MP3 文件。");
      return;
    }

    if (!transcript.trim()) {
      alert("请填写这条语音对应的文字稿。");
      return;
    }

    const id = createVoiceId();

    try {
      /*
       * MP3 文件保存到 IndexedDB
       */
      await saveVoiceFile(
        id,
        selectedFile
      );

      /*
       * 生成语音卡资料
       */
      const newVoice: VoiceCard = {
        id,
        character,
        mediaId: id,
        fileName: selectedFile.name,
        transcript: transcript.trim(),
        enabled: true,
      };

      /*
       * 保存到语音列表
       */
      setVoices((previous) => [
        ...previous,
        newVoice,
      ]);

      /*
       * 立即生成预览 URL
       */
      const previewUrl =
        URL.createObjectURL(selectedFile);

      setPreviewUrls((previous) => ({
        ...previous,
        [id]: previewUrl,
      }));

      /*
       * 清空输入
       */
      setSelectedFile(null);
      setTranscript("");
      setCharacter("Levi");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(
        "保存语音失败:",
        error
      );

      alert(
        "语音保存失败，请打开控制台查看错误。"
      );
    }
  }

  /*
   * 删除语音
   */
  async function handleDeleteVoice(
    voice: VoiceCard
  ) {
    const confirmed =
      window.confirm(
        `确定要删除「${voice.fileName}」吗？`
      );

    if (!confirmed) {
      return;
    }

    try {
      /*
       * 删除 IndexedDB 中的 MP3
       */
      await deleteVoiceFile(
        voice.mediaId
      );

      /*
       * 停止正在播放的音频
       */
      if (
        playingId === voice.id &&
        audioRef.current
      ) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      /*
       * 删除 Blob URL
       */
      const previewUrl =
        previewUrls[voice.id];

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPreviewUrls((previous) => {
        const next = {
          ...previous,
        };

        delete next[voice.id];

        return next;
      });

      /*
       * 删除语音卡
       */
      setVoices((previous) =>
        previous.filter(
          (item) =>
            item.id !== voice.id
        )
      );

      setPlayingId(null);
    } catch (error) {
      console.error(
        "删除语音失败:",
        error
      );

      alert("删除语音失败。");
    }
  }

  /*
   * 启用 / 停用
   */
  function toggleVoice(
    id: string
  ) {
    setVoices((previous) =>
      previous.map((voice) =>
        voice.id === id
          ? {
              ...voice,
              enabled: !voice.enabled,
            }
          : voice
      )
    );
  }

  /*
   * 播放 / 暂停预览
   */
  function handlePlayVoice(
    voice: VoiceCard
  ) {
    const url =
      previewUrls[voice.id];

    if (!url) {
      alert(
        "暂时找不到这个 MP3 文件。"
      );
      return;
    }

    /*
     * 如果点击的是正在播放的语音
     * 就暂停。
     */
    if (
      playingId === voice.id &&
      audioRef.current
    ) {
      if (
        audioRef.current.paused
      ) {
        void audioRef.current.play();
      } else {
        audioRef.current.pause();
      }

      return;
    }

    /*
     * 停止上一条
     */
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio =
      new Audio(url);

    audioRef.current = audio;

    audio.onplay = () => {
      setPlayingId(voice.id);
    };

    audio.onpause = () => {
      if (
        audioRef.current === audio
      ) {
        setPlayingId(null);
      }
    };

    audio.onended = () => {
      if (
        audioRef.current === audio
      ) {
        setPlayingId(null);
      }
    };

    audio.onerror = () => {
      console.error(
        "播放语音失败"
      );

      setPlayingId(null);
    };

    void audio.play();
  }

  const enabledCount =
    voices.filter(
      (voice) => voice.enabled
    ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        boxSizing: "border-box",
        background: "#FFF2E9",
        color: "#8E656F",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        {/* 页面标题 */}
        <header
          style={{
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "2px",
              opacity: 0.55,
              marginBottom: "8px",
            }}
          >
            RUNWITHME STUDIO
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 700,
            }}
          >
            Voice
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              opacity: 0.7,
            }}
          >
            管理 Levi / Erwin 的语音卡
          </p>
        </header>

        {/* 添加语音 */}
        <section
          style={{
            padding: "26px",
            borderRadius: "28px",
            background:
              "rgba(255,255,255,0.72)",
            border:
              "1px solid rgba(142,101,111,0.08)",
            boxShadow:
              "0 12px 40px rgba(142,101,111,0.08)",
            marginBottom: "34px",
          }}
        >
          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              添加语音
            </h2>

            <p
              style={{
                margin:
                  "7px 0 0",
                fontSize: "13px",
                opacity: 0.6,
              }}
            >
              MP3 + 对应文字稿 = 一张语音卡
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {/* 角色 */}
            <label>
              <div
                style={{
                  marginBottom: "7px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                角色
              </div>

              <select
                value={character}
                onChange={(event) =>
                  setCharacter(
                    event.target
                      .value as VoiceCharacter
                  )
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #CFDEE3",
                  background:
                    "rgba(255,255,255,0.9)",
                  color: "#8E656F",
                  fontSize: "14px",
                  outline: "none",
                }}
              >
                <option value="Levi">
                  Levi
                </option>

                <option value="Erwin">
                  Erwin
                </option>
              </select>
            </label>

            {/* MP3 */}
            <label>
              <div
                style={{
                  marginBottom: "7px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                MP3 文件
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={(event) => {
                  const file =
                    event.target
                      .files?.[0] ??
                    null;

                  setSelectedFile(
                    file
                  );
                }}
                style={{
                  width: "100%",
                }}
              />

              {selectedFile && (
                <div
                  style={{
                    marginTop: "9px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "12px",
                    background:
                      "rgba(207,222,227,0.35)",
                    fontSize: "13px",
                  }}
                >
                  🎙️{" "}
                  {selectedFile.name}
                </div>
              )}
            </label>

            {/* 文字稿 */}
            <label>
              <div
                style={{
                  marginBottom: "7px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                文字稿
              </div>

              <textarea
                value={transcript}
                onChange={(event) =>
                  setTranscript(
                    event.target.value
                  )
                }
                placeholder="填写这条语音实际说的内容……"
                rows={4}
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "13px 14px",
                  borderRadius:
                    "14px",
                  border:
                    "1px solid #CFDEE3",
                  background:
                    "rgba(255,255,255,0.9)",
                  color: "#8E656F",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  fontFamily:
                    "inherit",
                }}
              />
            </label>

            {/* 保存 */}
            <button
              type="button"
              onClick={() =>
                void handleAddVoice()
              }
              style={{
                padding:
                  "14px 20px",
                border: "none",
                borderRadius:
                  "15px",
                background:
                  "#FCBEC3",
                color: "#8E656F",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              ＋ 保存语音
            </button>
          </div>
        </section>

        {/* 统计 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              padding:
                "9px 14px",
              borderRadius:
                "999px",
              background:
                "rgba(255,255,255,0.65)",
              fontSize: "13px",
            }}
          >
            全部 {voices.length}
          </div>

          <div
            style={{
              padding:
                "9px 14px",
              borderRadius:
                "999px",
              background:
                "rgba(252,190,195,0.45)",
              fontSize: "13px",
            }}
          >
            已启用 {enabledCount}
          </div>
        </div>

        {/* 已保存语音 */}
        <section>
          <div
            style={{
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              已保存语音
            </h2>
          </div>

          {voices.length === 0 ? (
            <div
              style={{
                padding:
                  "55px 20px",
                borderRadius:
                  "24px",
                background:
                  "rgba(255,255,255,0.55)",
                textAlign: "center",
                opacity: 0.6,
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom:
                    "10px",
                }}
              >
                🎙️
              </div>

              <div>
                还没有语音卡
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  fontSize:
                    "12px",
                }}
              >
                添加第一条 Levi 或 Erwin 的语音吧
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",              }}            >              {voices.map(                (voice) => (                  <article                    key={voice.id}                    style={{                      padding:                        "20px",                      borderRadius:                        "22px",                      background:                        "rgba(255,255,255,0.72)",                      border:                        "1px solid rgba(142,101,111,0.07)",                      opacity:                        voice.enabled                          ? 1                          : 0.48,                    }}                  >                    <div                      style={{                        display:                          "flex",                        justifyContent:                          "space-between",                        alignItems:                          "flex-start",                        gap: "20px",                      }}                    >                      {/* 左侧资料 */}                      <div                        style={{                          minWidth: 0,                          flex: 1,                        }}                      >                        <div                          style={{                            display:                              "flex",                            alignItems:                              "center",                            gap: "9px",                            marginBottom:                              "8px",                          }}                        >                          <span                            style={{                              display:                                "inline-flex",                              padding:                                "5px 10px",                              borderRadius:                                "999px",                              background:                                voice.character ===                                "Levi"                                  ? "#CFDEE3"                                  : "#FCBEC3",                              fontSize:                                "12px",                              fontWeight:                                700,                            }}                          >                            {                              voice.character                            }                          </span>
                          {!voice.enabled && (                            <span                              style={{                                fontSize:                                  "12px",                                opacity:                                  0.65,                              }}                            >                              已停用                            </span>                          )}                        </div>
                        <div                          style={{                            fontSize:                              "13px",                            opacity:                              0.65,                            marginBottom:                              "10px",                            wordBreak:                              "break-all",                          }}                        >                          🎙️{" "}                          {                            voice.fileName                          }                        </div>
                        <div                          style={{                            fontSize:                              "15px",                            lineHeight:                              1.7,                          }}                        >                          「                          {                            voice.transcript                          }                          」                        </div>                      </div>
                      {/* 右侧操作 */}                      <div                        style={{                          display:                            "flex",                          gap: "8px",                          flexWrap:                            "wrap",                          justifyContent:                            "flex-end",                          flexShrink: 0,                        }}                      >                        <button                          type="button"                          onClick={() =>                            handlePlayVoice(                              voice                            )                          }                          style={{                            padding:                              "8px 12px",                            borderRadius:                              "11px",                            border:                              "1px solid #CFDEE3",                            background:                              "#fff",                            color:                              "#8E656F",                            cursor:                              "pointer",                            fontSize:                              "13px",                          }}                        >                          {playingId ===                          voice.id                            ? "⏸ 暂停"                            : "▶ 试听"}                        </button>
                        <button                          type="button"                          onClick={() =>                            toggleVoice(                              voice.id                            )                          }                          style={{                            padding:                              "8px 12px",                            borderRadius:                              "11px",                            border:                              "1px solid #CFDEE3",                            background:                              "#fff",                            color:                              "#8E656F",                            cursor:                              "pointer",                            fontSize:                              "13px",                          }}                        >                          {voice.enabled                            ? "已启用"                            : "启用"}                        </button>
                        <button                          type="button"                          onClick={() =>                            void handleDeleteVoice(                              voice                            )                          }                          style={{                            padding:                              "8px 12px",                            borderRadius:                              "11px",                            border:                              "1px solid #FCBEC3",                            background:                              "#fff",                            color:                              "#8E656F",                            cursor:                              "pointer",                            fontSize:                              "13px",                          }}                        >                          删除                        </button>                      </div>                    </div>                  </article>                )              )}            </div>          )}        </section>      </div>    </main>  );}