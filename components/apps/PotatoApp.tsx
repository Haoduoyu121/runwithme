"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ImagePlus,
  Images,
  Trash2,
} from "lucide-react";

import { useSystem } from "@/lib/SystemContext";

import {
  saveChatFile,
  getChatFile,
  deleteChatFile,
} from "@/lib/chatFiles";

import {
  loadSentenceSettings,
  saveSentenceSettings,
  resetSentenceSettings,
} from "@/lib/sentenceStorage";

import {
  DEFAULT_SENTENCE_WORD_POOL,
  type SentenceSettings,
  type SentenceJoinMode,
} from "@/data/sentence";

import {
  loadCardWeights,
  saveCardWeights,
  resetCardWeights,
  type CardWeights,
} from "@/lib/cardWeightStorage";

import type { GalleryOwner } from "@/data/gallery";
import GalleryPage from "@/components/apps/potato/GalleryPage";

import type { AvatarLibraryOwner } from "@/data/avatarLibrary";
import AvatarLibraryPage from "@/components/apps/potato/AvatarLibraryPage";

type Props = { onBack: () => void };

type TabKey = "levi" | "erwin" | "sentence" | "general";

export default function PotatoApp({ onBack }: Props) {
  const { settings, updateSettings, theme } = useSystem();

  const [tab, setTab] = useState<TabKey>("levi");
  const [galleryOwner, setGalleryOwner] =
    useState<GalleryOwner | null>(null);
  const [avatarLibOwner, setAvatarLibOwner] =
    useState<AvatarLibraryOwner | null>(null);

  const [avatarPreviews, setAvatarPreviews] = useState<{
    levi: string | null;
    erwin: string | null;
  }>({ levi: null, erwin: null });

  const [nameLeviDraft, setNameLeviDraft] = useState(
    settings.characterNames.levi
  );
  const [nameErwinDraft, setNameErwinDraft] = useState(
    settings.characterNames.erwin
  );

  /* 造句设置 */
  const [sentence, setSentence] = useState<SentenceSettings>(
    loadSentenceSettings
  );
  const [sentenceWordsDraft, setSentenceWordsDraft] =
    useState(loadSentenceSettings().wordPool.join("\n"));

  /* 抽卡权重 */
  const [weights, setWeights] = useState<CardWeights>(
    loadCardWeights
  );

  function updateWeights(patch: Partial<CardWeights>) {
    setWeights((prev) => {
      const next = { ...prev, ...patch };
      saveCardWeights(next);
      return next;
    });
  }

  function handleResetWeights() {
    if (!window.confirm("恢复默认抽卡权重？")) return;
    setWeights(resetCardWeights());
  }

  function updateSentence(patch: Partial<SentenceSettings>) {
    setSentence((prev) => {
      const next = { ...prev, ...patch };
      saveSentenceSettings(next);
      return next;
    });
  }

  function saveSentenceWords() {
    const words = sentenceWordsDraft
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    updateSentence({ wordPool: words });
  }

  function handleResetSentence() {
    if (!window.confirm("恢复造句设置为默认？")) return;
    const d = resetSentenceSettings();
    setSentence(d);
    setSentenceWordsDraft(d.wordPool.join("\n"));
  }

  /* 同步设置变化 */
  useEffect(() => {
    setNameLeviDraft(settings.characterNames.levi);
    setNameErwinDraft(settings.characterNames.erwin);
  }, [settings.characterNames]);

  /* 加载头像预览 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      const next: {
        levi: string | null;
        erwin: string | null;
      } = { levi: null, erwin: null };

      for (const key of ["levi", "erwin"] as const) {
        if (!settings.avatars[key]) continue;
        const file = await getChatFile(`avatar-${key}`);
        if (!file) continue;
        const url = URL.createObjectURL(file);
        created.push(url);
        next[key] = url;
      }
      if (!cancelled) setAvatarPreviews(next);
    }

    void load();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [settings.avatars]);

  async function uploadAvatar(
    key: "levi" | "erwin",
    file: File
  ) {
    await saveChatFile(`avatar-${key}`, file);
    const url = URL.createObjectURL(file);
    setAvatarPreviews((prev) => ({ ...prev, [key]: url }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: "custom",
      },
    });
  }

  async function removeAvatar(key: "levi" | "erwin") {
    await deleteChatFile(`avatar-${key}`);
    setAvatarPreviews((prev) => ({ ...prev, [key]: null }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: null,
      },
    });
  }

  function saveName(key: "levi" | "erwin") {
    const draft =
      key === "levi" ? nameLeviDraft : nameErwinDraft;
    const trimmed = draft.trim();
    if (!trimmed) return;
    updateSettings({
      characterNames: {
        ...settings.characterNames,
        [key]: trimmed,
      },
    });
  }

  /* 单聊回复时限 */
  const cfg = settings.chatReply;
  const singleMin = cfg.singleAutoReplyMin ?? 5;
  const singleMax = cfg.singleAutoReplyMax ?? 30;

  function setSingleMin(v: number) {
    const safe = Math.max(1, Math.min(720, v));
    updateSettings({
      chatReply: {
        ...settings.chatReply,
        singleAutoReplyMin: safe,
      },
    });
  }

  function setSingleMax(v: number) {
    const safe = Math.max(1, Math.min(720, v));
    updateSettings({
      chatReply: {
        ...settings.chatReply,
        singleAutoReplyMax: safe,
      },
    });
  }

  const themeClass =
    theme === "dark" ? " chat-dark" : " chat-light";

  /* ---------- 图库子页 ---------- */
  if (galleryOwner) {
    return (
      <main
        className={`phone-screen potato-app${themeClass}`}
      >
        <GalleryPage
          owner={galleryOwner}
          onBack={() => setGalleryOwner(null)}
        />
      </main>
    );
  }

  /* ---------- 头像库子页 ---------- */
  if (avatarLibOwner) {
    return (
      <main
        className={`phone-screen potato-app${themeClass}`}
      >
        <AvatarLibraryPage
          owner={avatarLibOwner}
          onBack={() => setAvatarLibOwner(null)}
        />
      </main>
    );
  }

  return (
    <main
      className={`phone-screen potato-app${themeClass}`}
    >
      <div className="potato-topbar">
        <button
          type="button"
          className="potato-topbar-back"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={26} strokeWidth={2.4} />
        </button>

        <div className="potato-topbar-title">
          生姜土豆
        </div>

        <div className="potato-topbar-spacer" />
      </div>

      <div className="potato-tabs">
        <button
          type="button"
          className={tab === "levi" ? "active" : ""}
          onClick={() => setTab("levi")}
        >
          {settings.characterNames.levi}
        </button>
        <button
          type="button"
          className={tab === "erwin" ? "active" : ""}
          onClick={() => setTab("erwin")}
        >
          {settings.characterNames.erwin}
        </button>
        <button
          type="button"
          className={tab === "sentence" ? "active" : ""}
          onClick={() => setTab("sentence")}
        >
          造句
        </button>
        <button
          type="button"
          className={tab === "general" ? "active" : ""}
          onClick={() => setTab("general")}
        >
          通用
        </button>
      </div>

      <div className="potato-scroll">
        {tab === "levi" && (
          <CharacterPanel
            avatarUrl={avatarPreviews.levi}
            avatarClass="avatar-levi"
            fallback={settings.characterNames.levi
              .charAt(0)
              .toUpperCase()}
            displayName={settings.characterNames.levi}
            nameDraft={nameLeviDraft}
            onNameChange={setNameLeviDraft}
            onNameSave={() => saveName("levi")}
            onUpload={(file) =>
              void uploadAvatar("levi", file)
            }
            onRemove={() => void removeAvatar("levi")}
            onOpenGallery={() => setGalleryOwner("Levi")}
            onOpenAvatarLib={() => setAvatarLibOwner("Levi")}
          />
        )}

        {tab === "erwin" && (
          <CharacterPanel
            avatarUrl={avatarPreviews.erwin}
            avatarClass="avatar-erwin"
            fallback={settings.characterNames.erwin
              .charAt(0)
              .toUpperCase()}
            displayName={settings.characterNames.erwin}
            nameDraft={nameErwinDraft}
            onNameChange={setNameErwinDraft}
            onNameSave={() => saveName("erwin")}
            onUpload={(file) =>
              void uploadAvatar("erwin", file)
            }
            onRemove={() => void removeAvatar("erwin")}
            onOpenGallery={() => setGalleryOwner("Erwin")}
            onOpenAvatarLib={() => setAvatarLibOwner("Erwin")}
          />
        )}

        {tab === "sentence" && (
          <div className="potato-sentence">
            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>自由造句</strong>
                <small>
                  角色发文本消息时，有概率把句子换成随机拼词
                </small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (sentence.enabled ? " is-on" : "")
                }
                onClick={() =>
                  updateSentence({
                    enabled: !sentence.enabled,
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                造句概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(sentence.chance * 100)}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSentence({
                      chance:
                        Math.min(
                          100,
                          Math.max(
                            0,
                            Number(e.target.value) || 0
                          )
                        ) / 100,
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                抽词数量
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={sentence.wordCountMin}
                    min={1}
                    max={50}
                    onChange={(e) =>
                      updateSentence({
                        wordCountMin: Math.max(
                          1,
                          Math.min(
                            50,
                            Number(e.target.value) || 1
                          )
                        ),
                      })
                    }
                  />
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={sentence.wordCountMax}
                    min={1}
                    max={50}
                    onChange={(e) =>
                      updateSentence({
                        wordCountMax: Math.max(
                          1,
                          Math.min(
                            50,
                            Number(e.target.value) || 1
                          )
                        ),
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                拼接方式
              </span>
              <div className="potato-segment">
                {(
                  [
                    { v: "none", l: "直接连" },
                    { v: "space", l: "加空格" },
                    { v: "punct", l: "加标点" },
                    { v: "random", l: "每次随机" },
                  ] as { v: SentenceJoinMode; l: string }[]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    className={
                      sentence.joinMode === opt.v
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      updateSentence({
                        joinMode: opt.v,
                      })
                    }
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {(sentence.joinMode === "punct" ||
              sentence.joinMode === "random") && (
              <div className="potato-sentence-row">
                <span className="potato-sentence-label">
                  标点出现概率
                </span>
                <label className="potato-num">
                  <input
                    type="number"
                    value={Math.round(
                      sentence.punctChance * 100
                    )}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateSentence({
                        punctChance:
                          Math.min(
                            100,
                            Math.max(
                              0,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    %
                  </span>
                </label>
              </div>
            )}

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>混合整句卡</strong>
                <small>
                  把角色现有的整句卡也丢进池子，整句当一个"词"
                </small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (sentence.includeWholeCards
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSentence({
                    includeWholeCards:
                      !sentence.includeWholeCards,
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                字池（一行一个）
              </span>
              <textarea
                className="potato-sentence-textarea"
                value={sentenceWordsDraft}
                onChange={(e) =>
                  setSentenceWordsDraft(e.target.value)
                }
                onBlur={saveSentenceWords}
                rows={10}
                spellCheck={false}
                placeholder={"你\n我\n是\n喜欢"}
              />
              <div className="potato-hint">
                当前 {sentence.wordPool.length} 个词。
                换行分隔，空行会被忽略。
              </div>
            </div>

            <button
              type="button"
              className="potato-sentence-reset"
              onClick={handleResetSentence}
            >
              恢复默认
            </button>

            <div className="potato-hint">
              提示：造句只替换"文本消息"，图片 / 语音 /
              表情 / 拍一拍不受影响。
            </div>
          </div>
        )}

        {tab === "general" && (
          <div className="potato-general">
            <div className="potato-section-title">
              单聊回复间隔
            </div>
            <div className="potato-hint">
              角色在单聊里后台主动发消息的间隔，群聊不受影响。
            </div>

            <div className="potato-reply-row">
              <span className="potato-reply-label">
                最短
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={singleMin}
                  min={1}
                  max={720}
                  onChange={(e) =>
                    setSingleMin(
                      Number(e.target.value) || 1
                    )
                  }
                />
                <span className="potato-num-suffix">
                  分
                </span>
              </label>
            </div>

            <div className="potato-reply-row">
              <span className="potato-reply-label">
                最长
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={singleMax}
                  min={1}
                  max={720}
                  onChange={(e) =>
                    setSingleMax(
                      Number(e.target.value) || 1
                    )
                  }
                />
                <span className="potato-num-suffix">
                  分
                </span>
              </label>
            </div>

            <div className="potato-hint">
              例：最短 5、最长 30，表示每次随机在
              5~30 分钟之间抽一个时间发消息。
            </div>

            {/* ---------- 抽卡权重 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              抽卡权重
            </div>
            <div className="potato-hint">
              数字越大越容易抽到，系统自动按比例归一化。
              设为 0 表示永不抽这种类型。
            </div>

            {(
              [
                { key: "text" as const, label: "文本" },
                {
                  key: "sticker" as const,
                  label: "表情包",
                },
                { key: "voice" as const, label: "语音" },
                { key: "pat" as const, label: "拍一拍" },
                {
                  key: "gallery" as const,
                  label: "图库",
                },
              ]
            ).map(({ key, label }) => (
              <div
                key={key}
                className="potato-reply-row"
              >
                <span className="potato-reply-label">
                  {label}
                </span>
                <label className="potato-num">
                  <input
                    type="number"
                    value={weights[key]}
                    min={0}
                    max={999}
                    onChange={(e) =>
                      updateWeights({
                        [key]: Math.max(
                          0,
                          Math.min(
                            999,
                            Number(e.target.value) || 0
                          )
                        ),
                      } as Partial<CardWeights>)
                    }
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              className="potato-sentence-reset"
              onClick={handleResetWeights}
              style={{ marginTop: 4 }}
            >
              恢复默认权重
            </button>

            {/* ---------- 头像自动切换 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              头像自动切换
            </div>
            <div className="potato-hint">
              用户发消息 / 角色发帖时，角色有概率从图库里换头像。
              默认很小，避免频繁换。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>总开关，关掉后永不自动换</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.avatarSwitch.enabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    avatarSwitch: {
                      ...settings.avatarSwitch,
                      enabled:
                        !settings.avatarSwitch.enabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            {(
              [
                {
                  label: "Chat · Levi",
                  key: "chatChanceLevi" as const,
                },
                {
                  label: "Chat · Erwin",
                  key: "chatChanceErwin" as const,
                },
                {
                  label: "iCity · Levi",
                  key: "icityChanceLevi" as const,
                },
                {
                  label: "iCity · Erwin",
                  key: "icityChanceErwin" as const,
                },
              ]
            ).map(({ label, key }) => (
              <div
                key={key}
                className="potato-reply-row"
              >
                <span className="potato-reply-label">
                  {label}
                </span>
                <label className="potato-num">
                  <input
                    type="number"
                    value={Number(
                      (
                        settings.avatarSwitch[key] * 100
                      ).toFixed(2)
                    )}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={(e) => {
                      const v =
                        Math.max(
                          0,
                          Math.min(
                            100,
                            Number(e.target.value) || 0
                          )
                        ) / 100;
                      updateSettings({
                        avatarSwitch: {
                          ...settings.avatarSwitch,
                          [key]: v,
                        },
                      });
                    }}
                  />
                  <span className="potato-num-suffix">
                    %
                  </span>
                </label>
              </div>
            ))}

            <div className="potato-hint">
              1% ≈ 每 100 条消息换一次。嫌频繁可以调到 0.5% 或更低。
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   角色面板
   ========================================================= */

function CharacterPanel({
  avatarUrl,
  avatarClass,
  fallback,
  displayName,
  nameDraft,
  onNameChange,
  onNameSave,
  onUpload,
  onRemove,
  onOpenGallery,
  onOpenAvatarLib,
}: {
  avatarUrl: string | null;
  avatarClass: string;
  fallback: string;
  displayName: string;
  nameDraft: string;
  onNameChange: (v: string) => void;
  onNameSave: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onOpenGallery: () => void;
  onOpenAvatarLib: () => void;
}) {
  return (
    <div className="potato-character">
      <div className="potato-avatar-wrap">
        <div
          className={`potato-avatar ${avatarClass}${
            avatarUrl ? " has-image" : ""
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            fallback
          )}
        </div>

        <div className="potato-avatar-actions">
          <label className="potato-avatar-btn">
            <ImagePlus size={16} strokeWidth={2.2} />
            <span>更换头像</span>
            <input
              type="file"
              accept="image/*"
              className="ios-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>

          {avatarUrl && (
            <button
              type="button"
              className="potato-avatar-btn is-danger"
              onClick={onRemove}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              <span>移除</span>
            </button>
          )}
        </div>
      </div>

      <div className="potato-field">
        <div className="potato-field-label">
          显示名字
        </div>
        <input
          type="text"
          className="potato-field-input"
          value={nameDraft}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onNameSave();
              (e.target as HTMLInputElement).blur();
            }
          }}
          maxLength={12}
          placeholder={displayName}
        />
        <div className="potato-hint">
          只改显示名，卡池归属仍然是 Levi / Erwin。
        </div>
      </div>

      <button
        type="button"
        className="potato-gallery-entry"
        onClick={onOpenGallery}
      >
        <Images size={18} strokeWidth={2.2} />
        <span>打开图库</span>
      </button>

      <button
        type="button"
        className="potato-gallery-entry"
        onClick={onOpenAvatarLib}
      >
        <ImagePlus size={18} strokeWidth={2.2} />
        <span>头像库</span>
      </button>
    </div>
  );
}