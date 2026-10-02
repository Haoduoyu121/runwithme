"use client";

import { useEffect, useState } from "react";

import {
  ChevronLeft,
  ImagePlus,
  Images,
  Trash2,
  Wallet as WalletIcon,
} from "lucide-react";

import { useSystem } from "@/lib/SystemContext";
import { loadSystemSettings } from "@/lib/systemStorage";

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
import RoleWalletPage from "@/components/apps/potato/RoleWalletPage";

import {
  loadWalletEvalPool,
  saveWalletEvalPool,
  resetWalletEvalPool,
} from "@/lib/walletEvalStorage";

import {
  loadRemarkPool,
  saveRemarkPool,
  resetRemarkPool,
} from "@/lib/remarkStorage";

import { roleRemarkUser } from "@/lib/remarkScheduler";

type Props = { onBack: () => void };

type TabKey = "levi" | "erwin" | "sentence" | "general";

export default function PotatoApp({ onBack }: Props) {
  const { settings, updateSettings, theme } = useSystem();

  const [tab, setTab] = useState<TabKey>("levi");
  const [galleryOwner, setGalleryOwner] =
    useState<GalleryOwner | null>(null);
  const [avatarLibOwner, setAvatarLibOwner] =
    useState<AvatarLibraryOwner | null>(null);
  const [roleWalletOwner, setRoleWalletOwner] =
    useState<"Levi" | "Erwin" | null>(null);

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

  /* 钱包评价卡池 */
  const [evalPool, setEvalPool] = useState(
    loadWalletEvalPool
  );

  /* 备注卡池 */
  const [remarkPool, setRemarkPool] = useState(
    loadRemarkPool
  );
  const [remarkLeviDraft, setRemarkLeviDraft] =
    useState(loadRemarkPool().Levi.join("\n"));
  const [remarkErwinDraft, setRemarkErwinDraft] =
    useState(loadRemarkPool().Erwin.join("\n"));
    /* 特殊金额草稿 */
  const [specialAmountsDraft, setSpecialAmountsDraft] =
    useState<string>(() =>
      loadSystemSettings()
        .roleRedPacket.specialAmounts.join(", ")
    );
  const [evalLeviDraft, setEvalLeviDraft] = useState(
    loadWalletEvalPool().Levi.join("\n")
  );
  const [evalErwinDraft, setEvalErwinDraft] = useState(
    loadWalletEvalPool().Erwin.join("\n")
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

  function saveEvalLevi() {
    const list = evalLeviDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...evalPool, Levi: list };
    saveWalletEvalPool(next);
    setEvalPool(next);
  }

  function saveEvalErwin() {
    const list = evalErwinDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...evalPool, Erwin: list };
    saveWalletEvalPool(next);
    setEvalPool(next);
  }

  function handleResetEvalPool() {
    if (!window.confirm("恢复默认评价卡池？")) return;
    const d = resetWalletEvalPool();
    setEvalPool(d);
    setEvalLeviDraft(d.Levi.join("\n"));
    setEvalErwinDraft(d.Erwin.join("\n"));
  }

  function saveRemarkLevi() {
    const list = remarkLeviDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...remarkPool, Levi: list };
    saveRemarkPool(next);
    setRemarkPool(next);
  }

  function saveRemarkErwin() {
    const list = remarkErwinDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = { ...remarkPool, Erwin: list };
    saveRemarkPool(next);
    setRemarkPool(next);
  }

  function handleResetRemarkPool() {
    if (!window.confirm("恢复默认备注卡池？")) return;
    const d = resetRemarkPool();
    setRemarkPool(d);
    setRemarkLeviDraft(d.Levi.join("\n"));
    setRemarkErwinDraft(d.Erwin.join("\n"));
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

    const oldName = settings.characterNames[key];
    if (trimmed === oldName) return;

    updateSettings({
      characterNames: {
        ...settings.characterNames,
        [key]: trimmed,
      },
    });

    /* ★ 回礼：改了角色名字，角色偶尔改用户备注 */
    const cfg = settings.roleRemark;
    if (!cfg.enabled) return;
    if (Math.random() >= cfg.retaliateChance) return;

    const owner = key === "levi" ? "Levi" : "Erwin";
    const delay = 5000 + Math.random() * 15000;
    window.setTimeout(() => {
      const result = roleRemarkUser(owner);
      if (!result) return;
      try {
        window.dispatchEvent(
          new CustomEvent("runwithme:role-remark-user", {
            detail: result,
          })
        );
      } catch {}
    }, delay);
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

  /* ---------- 角色钱包子页 ---------- */
  if (roleWalletOwner) {
    const displayName =
      roleWalletOwner === "Levi"
        ? settings.characterNames.levi
        : settings.characterNames.erwin;
    const avatarUrl =
      roleWalletOwner === "Levi"
        ? avatarPreviews.levi
        : avatarPreviews.erwin;

    return (
      <main
        className={`phone-screen potato-app${themeClass}`}
      >
        <RoleWalletPage
          owner={roleWalletOwner}
          displayName={displayName}
          avatarUrl={avatarUrl}
          onBack={() => setRoleWalletOwner(null)}
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
            onOpenWallet={() => setRoleWalletOwner("Levi")}
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
            onOpenWallet={() => setRoleWalletOwner("Erwin")}
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

            {/* ---------- 用户请求换头像 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              用户请求换头像
            </div>
            <div className="potato-hint">
              在 Chat 的 + 菜单里可以向角色提议换头像。
              角色会考虑一段时间后决定是否接受。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后点「换头像」不会响应</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.avatarSwitch.requestEnabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    avatarSwitch: {
                      ...settings.avatarSwitch,
                      requestEnabled:
                        !settings.avatarSwitch
                          .requestEnabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                答应概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.avatarSwitch.requestChance *
                      100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        requestChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">
                  %
                </span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                考虑时间
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={
                      settings.avatarSwitch.requestDelayMin
                    }
                    min={1}
                    max={600}
                    onChange={(e) =>
                      updateSettings({
                        avatarSwitch: {
                          ...settings.avatarSwitch,
                          requestDelayMin: Math.max(
                            1,
                            Math.min(
                              600,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    秒
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={
                      settings.avatarSwitch.requestDelayMax
                    }
                    min={1}
                    max={600}
                    onChange={(e) =>
                      updateSettings({
                        avatarSwitch: {
                          ...settings.avatarSwitch,
                          requestDelayMax: Math.max(
                            1,
                            Math.min(
                              600,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    秒
                  </span>
                </label>
              </div>
            </div>

            {/* ---------- 后台主动换头像 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              后台主动换头像
            </div>
            <div className="potato-hint">
              角色会自己定期从头像库里挑一张换上。
              默认 30~180 分钟掷一次骰子。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后角色不会主动换</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.avatarSwitch.backgroundEnabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    avatarSwitch: {
                      ...settings.avatarSwitch,
                      backgroundEnabled:
                        !settings.avatarSwitch
                          .backgroundEnabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                参与角色
              </span>
              <div className="potato-inline-nums">
                <button
                  type="button"
                  className={
                    "potato-chip" +
                    (settings.avatarSwitch.backgroundLevi
                      ? " is-on"
                      : "")
                  }
                  onClick={() =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        backgroundLevi:
                          !settings.avatarSwitch
                            .backgroundLevi,
                      },
                    })
                  }
                >
                  {settings.characterNames.levi}
                </button>
                <button
                  type="button"
                  className={
                    "potato-chip" +
                    (settings.avatarSwitch.backgroundErwin
                      ? " is-on"
                      : "")
                  }
                  onClick={() =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        backgroundErwin:
                          !settings.avatarSwitch
                            .backgroundErwin,
                      },
                    })
                  }
                >
                  {settings.characterNames.erwin}
                </button>
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                掷骰子概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.avatarSwitch
                      .backgroundChance * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        backgroundChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">
                  %
                </span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                间隔
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={
                      settings.avatarSwitch
                        .backgroundIntervalMin
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        avatarSwitch: {
                          ...settings.avatarSwitch,
                          backgroundIntervalMin:
                            Math.max(
                              1,
                              Math.min(
                                1440,
                                Number(e.target.value) || 1
                              )
                            ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={
                      settings.avatarSwitch
                        .backgroundIntervalMax
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        avatarSwitch: {
                          ...settings.avatarSwitch,
                          backgroundIntervalMax:
                            Math.max(
                              1,
                              Math.min(
                                1440,
                                Number(e.target.value) || 1
                              )
                            ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
              </div>
            </div>

            {/* ---------- iCity 头像 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              iCity 头像
            </div>
            <div className="potato-hint">
              角色在 iCity 发帖 / 评论时，有概率换 iCity 头像。
            </div>

            {(
              [
                {
                  label: settings.characterNames.levi,
                  key: "icityChanceLevi" as const,
                },
                {
                  label: settings.characterNames.erwin,
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

            {/* ---------- 钱包评价 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              钱包评价
            </div>
            <div className="potato-hint">
              记支出时，有存钱目标的监督角色会偶尔评价一句，
              显示在那笔记录底下。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后永不评价</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.walletEval.enabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    walletEval: {
                      ...settings.walletEval,
                      enabled:
                        !settings.walletEval.enabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                触发概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.walletEval.chance * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      walletEval: {
                        ...settings.walletEval,
                        chance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">
                  %
                </span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                延迟
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={
                      settings.walletEval.delayMinSec
                    }
                    min={0}
                    max={3600}
                    onChange={(e) =>
                      updateSettings({
                        walletEval: {
                          ...settings.walletEval,
                          delayMinSec: Math.max(
                            0,
                            Math.min(
                              3600,
                              Number(e.target.value) || 0
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    秒
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={
                      settings.walletEval.delayMaxSec
                    }
                    min={0}
                    max={3600}
                    onChange={(e) =>
                      updateSettings({
                        walletEval: {
                          ...settings.walletEval,
                          delayMaxSec: Math.max(
                            0,
                            Math.min(
                              3600,
                              Number(e.target.value) || 0
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    秒
                  </span>
                </label>
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                冷却
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={
                    settings.walletEval.cooldownSec
                  }
                  min={0}
                  max={3600}
                  onChange={(e) =>
                    updateSettings({
                      walletEval: {
                        ...settings.walletEval,
                        cooldownSec: Math.max(
                          0,
                          Math.min(
                            3600,
                            Number(e.target.value) || 0
                          )
                        ),
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">
                  秒
                </span>
              </label>
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                {settings.characterNames.levi} 的卡池
                （一行一条）
              </span>
              <textarea
                className="potato-sentence-textarea"
                value={evalLeviDraft}
                onChange={(e) =>
                  setEvalLeviDraft(e.target.value)
                }
                onBlur={saveEvalLevi}
                rows={6}
                spellCheck={false}
              />
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                {settings.characterNames.erwin} 的卡池
                （一行一条）
              </span>
              <textarea
                className="potato-sentence-textarea"
                value={evalErwinDraft}
                onChange={(e) =>
                  setEvalErwinDraft(e.target.value)
                }
                onBlur={saveEvalErwin}
                rows={6}
                spellCheck={false}
              />
            </div>

            <button
              type="button"
              className="potato-sentence-reset"
              onClick={handleResetEvalPool}
            >
              恢复默认卡池
            </button>

            {/* ---------- 角色主动发红包 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              角色主动发红包
            </div>
            <div className="potato-hint">
              角色在后台自己决定给你发红包。
              概率很小，不然会很烦。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后角色不会主动发红包</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.roleRedPacket.enabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    roleRedPacket: {
                      ...settings.roleRedPacket,
                      enabled:
                        !settings.roleRedPacket.enabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                谁发
              </span>
              <div className="potato-inline-nums">
                {(
                  [
                    { v: "random" as const, l: "随机" },
                    { v: "levi" as const, l: "Levi" },
                    { v: "erwin" as const, l: "Erwin" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    className={
                      "potato-chip" +
                      (settings.roleRedPacket.targetMode ===
                      opt.v
                        ? " is-on"
                        : "")
                    }
                    onClick={() =>
                      updateSettings({
                        roleRedPacket: {
                          ...settings.roleRedPacket,
                          targetMode: opt.v,
                        },
                      })
                    }
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                触发概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.roleRedPacket.chance * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      roleRedPacket: {
                        ...settings.roleRedPacket,
                        chance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                间隔
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={
                      settings.roleRedPacket.intervalMin
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleRedPacket: {
                          ...settings.roleRedPacket,
                          intervalMin: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={
                      settings.roleRedPacket.intervalMax
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleRedPacket: {
                          ...settings.roleRedPacket,
                          intervalMax: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                金额范围
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <input
                    type="number"
                    value={settings.roleRedPacket.amountMin}
                    min={0.01}
                    step={1}
                    onChange={(e) =>
                      updateSettings({
                        roleRedPacket: {
                          ...settings.roleRedPacket,
                          amountMin: Math.max(
                            0.01,
                            Number(e.target.value) || 0.01
                          ),
                        },
                      })
                    }
                  />
                </label>
                <span className="potato-num-suffix">
                  ~
                </span>
                <label className="potato-num">
                  <input
                    type="number"
                    value={settings.roleRedPacket.amountMax}
                    min={0.01}
                    step={1}
                    onChange={(e) =>
                      updateSettings({
                        roleRedPacket: {
                          ...settings.roleRedPacket,
                          amountMax: Math.max(
                            0.01,
                            Number(e.target.value) || 0.01
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                特殊金额概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.roleRedPacket.specialChance *
                      100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      roleRedPacket: {
                        ...settings.roleRedPacket,
                        specialChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                特殊金额列表（逗号分隔）
              </span>
              <input
                type="text"
                className="potato-sentence-input"
                value={specialAmountsDraft}
                onChange={(e) =>
                  setSpecialAmountsDraft(e.target.value)
                }
                onBlur={() => {
                  const list: number[] =
                    specialAmountsDraft
                      .split(/[,，\s]+/)
                      .map((s: string) => parseFloat(s))
                      .filter(
                        (n: number) =>
                          Number.isFinite(n) && n > 0
                      );
                  updateSettings({
                    roleRedPacket: {
                      ...settings.roleRedPacket,
                      specialAmounts: list,
                    },
                  });
                }}
                placeholder="5.2, 13.14, 52, 131.4"
              />
              <div className="potato-hint">
                触发特殊金额时，从这里随机挑一个
              </div>
            </div>

            {/* ---------- 角色自动记账 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              角色自动记账
            </div>
            <div className="potato-hint">
              角色也会在后台偶尔记一笔日常开销或收入，
              可以在他们的钱包里看到。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后角色钱包只有红包进出</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.roleBookkeeping.enabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    roleBookkeeping: {
                      ...settings.roleBookkeeping,
                      enabled:
                        !settings.roleBookkeeping.enabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                掷骰子概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.roleBookkeeping.chance * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      roleBookkeeping: {
                        ...settings.roleBookkeeping,
                        chance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                间隔
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={
                      settings.roleBookkeeping.intervalMin
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleBookkeeping: {
                          ...settings.roleBookkeeping,
                          intervalMin: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={
                      settings.roleBookkeeping.intervalMax
                    }
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleBookkeeping: {
                          ...settings.roleBookkeeping,
                          intervalMax: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
              </div>
            </div>
            

            {/* ---------- 角色给用户换头像 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              角色给用户换头像
            </div>
            <div className="potato-hint">
              角色会主动从「我的头像库」里挑一张，
              帮你换上。间隔用上面「头像自动切换」的间隔。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>关掉后角色不会主动帮你换</small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.avatarSwitch.userAvatarEnabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    avatarSwitch: {
                      ...settings.avatarSwitch,
                      userAvatarEnabled:
                        !settings.avatarSwitch
                          .userAvatarEnabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

                       <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                触发概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.avatarSwitch.userAvatarChance *
                      100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        userAvatarChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>回礼概率</strong>
                <small>
                  用户给角色换头像后，角色反过来给你换的概率
                </small>
              </div>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    (settings.avatarSwitch.giftBackChance ??
                      0.2) * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      avatarSwitch: {
                        ...settings.avatarSwitch,
                        giftBackChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            {/* ---------- 改备注 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              改备注
            </div>
            <div className="potato-hint">
              角色偶尔会给你改一个备注，显示在「我的」名字下面。
              你改了角色名字后，他们也会偶尔"回礼"。
            </div>

            <div className="potato-sentence-row">
              <div className="potato-sentence-label">
                <strong>启用</strong>
                <small>
                  ⚠️ 默认关闭，必须打开才会生效。关掉后角色不会改你备注
                </small>
              </div>
              <button
                type="button"
                className={
                  "potato-switch" +
                  (settings.roleRemark.enabled
                    ? " is-on"
                    : "")
                }
                onClick={() =>
                  updateSettings({
                    roleRemark: {
                      ...settings.roleRemark,
                      enabled: !settings.roleRemark.enabled,
                    },
                  })
                }
                aria-label="开关"
              />
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                触发概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.roleRemark.chance * 100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      roleRemark: {
                        ...settings.roleRemark,
                        chance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                间隔
              </span>
              <div className="potato-inline-nums">
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最少
                  </span>
                  <input
                    type="number"
                    value={settings.roleRemark.intervalMin}
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleRemark: {
                          ...settings.roleRemark,
                          intervalMin: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
                <label className="potato-num">
                  <span className="potato-num-suffix">
                    最多
                  </span>
                  <input
                    type="number"
                    value={settings.roleRemark.intervalMax}
                    min={1}
                    max={1440}
                    onChange={(e) =>
                      updateSettings({
                        roleRemark: {
                          ...settings.roleRemark,
                          intervalMax: Math.max(
                            1,
                            Math.min(
                              1440,
                              Number(e.target.value) || 1
                            )
                          ),
                        },
                      })
                    }
                  />
                  <span className="potato-num-suffix">
                    分
                  </span>
                </label>
              </div>
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                回礼概率
              </span>
              <label className="potato-num">
                <input
                  type="number"
                  value={Math.round(
                    settings.roleRemark.retaliateChance *
                      100
                  )}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateSettings({
                      roleRemark: {
                        ...settings.roleRemark,
                        retaliateChance:
                          Math.max(
                            0,
                            Math.min(
                              100,
                              Number(e.target.value) || 0
                            )
                          ) / 100,
                      },
                    })
                  }
                />
                <span className="potato-num-suffix">%</span>
              </label>
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                {settings.characterNames.levi} 的备选名
                （一行一条）
              </span>
              <textarea
                className="potato-sentence-textarea"
                value={remarkLeviDraft}
                onChange={(e) =>
                  setRemarkLeviDraft(e.target.value)
                }
                onBlur={saveRemarkLevi}
                rows={6}
                spellCheck={false}
              />
            </div>

            <div className="potato-sentence-col">
              <span className="potato-sentence-label">
                {settings.characterNames.erwin} 的备选名
                （一行一条）
              </span>
              <textarea
                className="potato-sentence-textarea"
                value={remarkErwinDraft}
                onChange={(e) =>
                  setRemarkErwinDraft(e.target.value)
                }
                onBlur={saveRemarkErwin}
                rows={6}
                spellCheck={false}
              />
            </div>

            


            {/* ---------- 物流速度 ---------- */}
            <div
              className="potato-section-title"
              style={{ marginTop: 18 }}
            >
              物流速度
            </div>
            <div className="potato-hint">
              1 = 真实速度（商场约 90 秒，外卖约 55 秒）。
              数字越大越快，方便测试。
            </div>

            <div className="potato-sentence-row">
              <span className="potato-sentence-label">
                倍率
              </span>
              <div className="potato-inline-nums">
                {[1, 5, 10, 30].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={
                      "potato-chip" +
                      (settings.shopDelivery.speed === v
                        ? " is-on"
                        : "")
                    }
                    onClick={() =>
                      updateSettings({
                        shopDelivery: {
                          ...settings.shopDelivery,
                          speed: v,
                        },
                      })
                    }
                  >
                    {v}x
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="potato-sentence-reset"
              onClick={handleResetRemarkPool}
            >
              恢复默认卡池
            </button>

            {(settings.userRemarks.Levi ||
              settings.userRemarks.Erwin) && (
              <div className="potato-sentence-col">
                <span className="potato-sentence-label">
                  当前备注
                </span>
                <div className="potato-remark-current">
                  {settings.userRemarks.Levi && (
                    <div className="potato-remark-current-item">
                      <span>
                        {settings.characterNames.levi}：
                        {settings.userRemarks.Levi}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            userRemarks: {
                              ...settings.userRemarks,
                              Levi: null,
                            },
                          })
                        }
                      >
                        清除
                      </button>
                    </div>
                  )}
                  {settings.userRemarks.Erwin && (
                    <div className="potato-remark-current-item">
                      <span>
                        {settings.characterNames.erwin}：
                        {settings.userRemarks.Erwin}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            userRemarks: {
                              ...settings.userRemarks,
                              Erwin: null,
                            },
                          })
                        }
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
  onOpenWallet,
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
  onOpenWallet: () => void;
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

      <button
        type="button"
        className="potato-gallery-entry"
        onClick={onOpenWallet}
      >
        <WalletIcon size={18} strokeWidth={2.2} />
        <span>钱包</span>
      </button>
    </div>
  );
}