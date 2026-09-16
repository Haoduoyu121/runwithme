"use client";

import { useEffect, useState } from "react";

import { useSystem } from "@/lib/SystemContext";
import { useChat } from "@/lib/ChatContext";

import {
  saveChatFile,
  getChatFile,
  deleteChatFile,
} from "@/lib/chatFiles";

import {
  loadStickers,
  saveStickers,
} from "@/lib/stickerStorage";

import {
  saveStickerFile,
  getStickerFile,
  deleteStickerFile,
} from "@/lib/stickerFiles";

import type { StickerItem } from "@/data/stickers";

import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/notifications";

type ChatSettingsPanelProps = {
  onClose: () => void;
};

const AVATAR_KEYS = [
  { key: "you" as const, label: "You", fallback: "Y" },
  { key: "levi" as const, label: "Levi", fallback: "L" },
  { key: "erwin" as const, label: "Erwin", fallback: "E" },
];

const IOS_SAFE_FILE_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  opacity: 0,
  overflow: "hidden",
  zIndex: -1,
};

const COMPRESS_KEEP = 100;

function notifyStickersUpdated() {
  window.dispatchEvent(
    new Event("runwithme:stickers-updated")
  );
}

export default function ChatSettingsPanel({
  onClose,
}: ChatSettingsPanelProps) {
  const { settings, updateSettings } = useSystem();
  const { messages, updateMessages } = useChat();

  const [nameDraft, setNameDraft] = useState(
    settings.chatName
  );

  const [nameYouDraft, setNameYouDraft] = useState(
    settings.characterNames.you
  );
  const [nameLeviDraft, setNameLeviDraft] = useState(
    settings.characterNames.levi
  );
  const [nameErwinDraft, setNameErwinDraft] = useState(
    settings.characterNames.erwin
  );

  const [patLeviDraft, setPatLeviDraft] = useState(
    settings.patMessages.levi.join("\n")
  );
  const [patErwinDraft, setPatErwinDraft] = useState(
    settings.patMessages.erwin.join("\n")
  );

  const [cssDraft, setCssDraft] = useState(
    settings.chatCustomCSS ?? ""
  );

  const [bgPreview, setBgPreview] = useState<string | null>(
    null
  );

  const [avatarPreviews, setAvatarPreviews] = useState<
    Record<"you" | "levi" | "erwin", string | null>
  >({ you: null, levi: null, erwin: null });

  const [notifState, setNotifState] =
    useState<NotificationPermissionState>("default");

  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [stickerUrls, setStickerUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    setNameDraft(settings.chatName);
  }, [settings.chatName]);

  useEffect(() => {
    setNameYouDraft(settings.characterNames.you);
    setNameLeviDraft(settings.characterNames.levi);
    setNameErwinDraft(settings.characterNames.erwin);
  }, [settings.characterNames]);

  useEffect(() => {
    setPatLeviDraft(settings.patMessages.levi.join("\n"));
    setPatErwinDraft(settings.patMessages.erwin.join("\n"));
  }, [settings.patMessages]);

  useEffect(() => {
    setCssDraft(settings.chatCustomCSS ?? "");
  }, [settings.chatCustomCSS]);

  useEffect(() => {
    setNotifState(getNotificationPermission());
  }, []);

  /* 壁纸 / 头像预览 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function load() {
      if (settings.chatBackground === "custom") {
        const file = await getChatFile("chat-bg");
        if (file && !cancelled) {
          const url = URL.createObjectURL(file);
          created.push(url);
          setBgPreview(url);
        }
      } else {
        setBgPreview(null);
      }

      const next: Record<
        "you" | "levi" | "erwin",
        string | null
      > = { you: null, levi: null, erwin: null };

      for (const avatar of AVATAR_KEYS) {
        if (!settings.avatars[avatar.key]) continue;
        const file = await getChatFile(
          `avatar-${avatar.key}`
        );
        if (file) {
          const url = URL.createObjectURL(file);
          created.push(url);
          next[avatar.key] = url;
        }
      }

      if (!cancelled) setAvatarPreviews(next);
    }

    void load();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [settings.chatBackground, settings.avatars]);

  /* 表情包 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    async function loadStickersList() {
      const list = loadStickers();
      setStickers(list);

      const urls: Record<string, string> = {};
      for (const s of list) {
        try {
          const file = await getStickerFile(s.id);
          if (!file) continue;
          const url = URL.createObjectURL(file);
          created.push(url);
          urls[s.id] = url;
        } catch (e) {
          console.error("加载表情失败:", s.id, e);
        }
      }
      if (!cancelled) setStickerUrls(urls);
    }

    void loadStickersList();

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    updateSettings({ chatName: trimmed });
  }

  function saveCharacterNames() {
    updateSettings({
      characterNames: {
        you: nameYouDraft.trim() || "You",
        levi: nameLeviDraft.trim() || "Levi",
        erwin: nameErwinDraft.trim() || "Erwin",
      },
    });
  }

  function savePatLevi() {
    const list = patLeviDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    updateSettings({
      patMessages: {
        ...settings.patMessages,
        levi: list,
      },
    });
  }

  function savePatErwin() {
    const list = patErwinDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    updateSettings({
      patMessages: {
        ...settings.patMessages,
        erwin: list,
      },
    });
  }

  function updateReply<
    K extends keyof typeof settings.chatReply,
  >(key: K, value: (typeof settings.chatReply)[K]) {
    updateSettings({
      chatReply: {
        ...settings.chatReply,
        [key]: value,
      },
    });
  }

  /* -------------------------------------------------------
     ★ 数据管理
     ------------------------------------------------------- */

  function handleClearAll() {
    if (messages.length === 0) {
      alert("当前没有聊天记录。");
      return;
    }
    if (
      !window.confirm(
        `确定清空全部 ${messages.length} 条聊天记录？此操作不可恢复。`
      )
    ) {
      return;
    }
    updateMessages(() => []);
  }

  function handleCompress() {
    if (messages.length <= COMPRESS_KEEP) {
      alert(
        `当前只有 ${messages.length} 条，未超过 ${COMPRESS_KEEP} 条，无需压缩。`
      );
      return;
    }
    const removeCount = messages.length - COMPRESS_KEEP;
    if (
      !window.confirm(
        `将保留最新 ${COMPRESS_KEEP} 条，删除较早的 ${removeCount} 条。继续？`
      )
    ) {
      return;
    }
    updateMessages((prev) =>
      prev.slice(-COMPRESS_KEEP)
    );
  }

  /* -------------------------------------------------------
     上传 / 表情
     ------------------------------------------------------- */

  async function uploadBg(file: File) {
    await saveChatFile("chat-bg", file);
    const url = URL.createObjectURL(file);
    setBgPreview(url);
    updateSettings({ chatBackground: "custom" });
  }

  async function removeBg() {
    await deleteChatFile("chat-bg");
    if (bgPreview) URL.revokeObjectURL(bgPreview);
    setBgPreview(null);
    updateSettings({ chatBackground: null });
  }

  async function uploadAvatar(
    key: "you" | "levi" | "erwin",
    file: File
  ) {
    await saveChatFile(`avatar-${key}`, file);
    const url = URL.createObjectURL(file);
    setAvatarPreviews((prev) => ({
      ...prev,
      [key]: url,
    }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: "custom",
      },
    });
  }

  async function removeAvatar(
    key: "you" | "levi" | "erwin"
  ) {
    await deleteChatFile(`avatar-${key}`);
    setAvatarPreviews((prev) => ({
      ...prev,
      [key]: null,
    }));
    updateSettings({
      avatars: {
        ...settings.avatars,
        [key]: null,
      },
    });
  }

  async function addSticker(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件。");
      return;
    }
    const id = `sticker-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    try {
      await saveStickerFile(id, file);
      const next: StickerItem[] = [
        ...stickers,
        {
          id,
          fileName: file.name,
          url: "",
          enabled: true,
        },
      ];
      saveStickers(next);
      setStickers(next);
      const url = URL.createObjectURL(file);
      setStickerUrls((prev) => ({ ...prev, [id]: url }));
      notifyStickersUpdated();
    } catch (e) {
      console.error("保存表情失败:", e);
      alert("保存失败。");
    }
  }

  async function removeSticker(id: string) {
    if (!window.confirm("删除这个表情？")) return;
    try {
      await deleteStickerFile(id);
    } catch (e) {
      console.error(e);
    }
    const next = stickers.filter((s) => s.id !== id);
    saveStickers(next);
    setStickers(next);
    setStickerUrls((prev) => {
      const copy = { ...prev };
      const url = copy[id];
      if (url) URL.revokeObjectURL(url);
      delete copy[id];
      return copy;
    });
    notifyStickersUpdated();
  }

  function toggleStickerEnabled(id: string) {
    const next = stickers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveStickers(next);
    setStickers(next);
    notifyStickersUpdated();
  }

  async function handleEnableNotifications() {
    const granted =
      await requestNotificationPermission();
    setNotifState(getNotificationPermission());
    if (!granted) {
      alert(
        "浏览器未授权通知。\n\n" +
          "局域网 IP 测试时可能无法弹通知，正式 HTTPS 部署后即可。"
      );
    }
  }

  const cfg = settings.chatReply;
  const cn = settings.characterNames;

  return (
    <div
      className="chat-settings-backdrop"
      onClick={onClose}
    >
      <div
        className="chat-settings-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="chat-settings-header">
          <h2>Chat Settings</h2>
          <button
            className="chat-settings-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="chat-settings-body">
          {/* ★ 聊天数据管理 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              聊天数据
            </div>

            <div className="chat-settings-storage">
              <div className="chat-settings-storage-info">
                <strong>当前聊天记录</strong>
                <small>
                  共 {messages.length} 条消息
                </small>
              </div>

              <div className="chat-settings-storage-actions">
                <button
                  className="chat-settings-btn small"
                  onClick={handleCompress}
                  disabled={
                    messages.length <= COMPRESS_KEEP
                  }
                >
                  压缩（保留 {COMPRESS_KEEP} 条）
                </button>

                <button
                  className="chat-settings-btn small danger"
                  onClick={handleClearAll}
                  disabled={messages.length === 0}
                >
                  清空全部
                </button>
              </div>
            </div>

            <div className="chat-settings-hint">
              提示：长按任意聊天气泡也能进入多选模式批量删除。
            </div>
          </section>

          {/* 群聊名称 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              群聊名称
            </div>
            <div className="chat-settings-name-row">
              <input
                type="text"
                value={nameDraft}
                onChange={(event) =>
                  setNameDraft(event.target.value)
                }
                onBlur={saveName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveName();
                    (
                      event.target as HTMLInputElement
                    ).blur();
                  }
                }}
                placeholder="Levi & Erwin"
              />
            </div>
          </section>

          {/* 角色名字 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              角色名字
            </div>
            <div className="chat-settings-names-grid">
              <label className="chat-settings-name-item">
                <span>你（You）</span>
                <input
                  type="text"
                  value={nameYouDraft}
                  onChange={(e) =>
                    setNameYouDraft(e.target.value)
                  }
                  onBlur={saveCharacterNames}
                  maxLength={12}
                />
              </label>
              <label className="chat-settings-name-item">
                <span>角色 1</span>
                <input
                  type="text"
                  value={nameLeviDraft}
                  onChange={(e) =>
                    setNameLeviDraft(e.target.value)
                  }
                  onBlur={saveCharacterNames}
                  maxLength={12}
                />
              </label>
              <label className="chat-settings-name-item">
                <span>角色 2</span>
                <input
                  type="text"
                  value={nameErwinDraft}
                  onChange={(e) =>
                    setNameErwinDraft(e.target.value)
                  }
                  onBlur={saveCharacterNames}
                  maxLength={12}
                />
              </label>
            </div>
            <div className="chat-settings-hint">
              只改显示，卡片里的归属还是 Levi / Erwin。
            </div>
          </section>

          {/* 拍一拍 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              拍一拍
            </div>
            <div className="chat-settings-pat-group">
              <label className="chat-settings-pat-label">
                <strong>对 {cn.levi}</strong>
                <small>
                  每行一条，双击 {cn.levi} 头像时随机选一条发送
                </small>
                <textarea
                  value={patLeviDraft}
                  onChange={(event) =>
                    setPatLeviDraft(event.target.value)
                  }
                  onBlur={savePatLevi}
                  rows={4}
                  placeholder={`拍了拍 ${cn.levi} 的头像`}
                />
              </label>
              <label className="chat-settings-pat-label">
                <strong>对 {cn.erwin}</strong>
                <small>
                  每行一条，双击 {cn.erwin} 头像时随机选一条发送
                </small>
                <textarea
                  value={patErwinDraft}
                  onChange={(event) =>
                    setPatErwinDraft(event.target.value)
                  }
                  onBlur={savePatErwin}
                  rows={4}
                  placeholder={`拍了拍 ${cn.erwin} 的头像`}
                />
              </label>
            </div>
          </section>

          {/* 回复频率 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              回复频率
            </div>
            <div className="chat-settings-reply-group">
              <div className="chat-settings-reply-row">
                <span className="chat-settings-reply-label">
                  一次回复条数
                </span>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最少
                  </span>
                  <input
                    type="number"
                    value={cfg.replyCountMin}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      updateReply(
                        "replyCountMin",
                        Math.max(
                          1,
                          Number(e.target.value) || 1
                        )
                      )
                    }
                  />
                </label>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最多
                  </span>
                  <input
                    type="number"
                    value={cfg.replyCountMax}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      updateReply(
                        "replyCountMax",
                        Math.max(
                          1,
                          Number(e.target.value) || 1
                        )
                      )
                    }
                  />
                </label>
              </div>

              <div className="chat-settings-reply-row">
                <span className="chat-settings-reply-label">
                  你发言后开始回复
                </span>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最短
                    <small className="chat-settings-num-suffix">
                      秒
                    </small>
                  </span>
                  <input
                    type="number"
                    value={cfg.userReplyDelayMin}
                    min={0}
                    max={300}
                    onChange={(e) =>
                      updateReply(
                        "userReplyDelayMin",
                        Math.max(
                          0,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                  />
                </label>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最长
                    <small className="chat-settings-num-suffix">
                      秒
                    </small>
                  </span>
                  <input
                    type="number"
                    value={cfg.userReplyDelayMax}
                    min={0}
                    max={300}
                    onChange={(e) =>
                      updateReply(
                        "userReplyDelayMax",
                        Math.max(
                          0,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                  />
                </label>
              </div>

              <div className="chat-settings-reply-row">
                <span className="chat-settings-reply-label">
                  后台自动发消息
                </span>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最短
                    <small className="chat-settings-num-suffix">
                      分
                    </small>
                  </span>
                  <input
                    type="number"
                    value={cfg.autoReplyMin}
                    min={1}
                    max={720}
                    onChange={(e) =>
                      updateReply(
                        "autoReplyMin",
                        Math.max(
                          1,
                          Number(e.target.value) || 1
                        )
                      )
                    }
                  />
                </label>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    最长
                    <small className="chat-settings-num-suffix">
                      分
                    </small>
                  </span>
                  <input
                    type="number"
                    value={cfg.autoReplyMax}
                    min={1}
                    max={720}
                    onChange={(e) =>
                      updateReply(
                        "autoReplyMax",
                        Math.max(
                          1,
                          Number(e.target.value) || 1
                        )
                      )
                    }
                  />
                </label>
              </div>

              <div className="chat-settings-reply-row">
                <span className="chat-settings-reply-label">
                  引用你消息的概率
                </span>
                <label className="chat-settings-num">
                  <span className="chat-settings-num-label">
                    0~100
                    <small className="chat-settings-num-suffix">
                      %
                    </small>
                  </span>
                  <input
                    type="number"
                    value={Math.round(
                      cfg.quoteChance * 100
                    )}
                    min={0}
                    max={100}
                    onChange={(e) =>
                      updateReply(
                        "quoteChance",
                        Math.min(
                          100,
                          Math.max(
                            0,
                            Number(e.target.value) || 0
                          )
                        ) / 100
                      )
                    }
                  />
                </label>
              </div>

              <div className="chat-settings-hint">
                改完立即生效，不用重开 App。
              </div>
            </div>
          </section>

          {/* 我的表情包 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              我的表情包
            </div>
            <div className="chat-settings-stickers">
              <div className="chat-settings-stickers-actions">
                <label className="chat-settings-btn">
                  ＋ 添加表情
                  <input
                    type="file"
                    accept="image/*"
                    style={IOS_SAFE_FILE_STYLE}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];
                      if (file) void addSticker(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                <span className="chat-settings-stickers-count">
                  共 {stickers.length} 个
                </span>
              </div>

              {stickers.length === 0 ? (
                <div className="chat-settings-stickers-empty">
                  还没有表情包，点上面按钮添加
                </div>
              ) : (
                <div className="chat-settings-stickers-grid">
                  {stickers.map((s) => {
                    const url = stickerUrls[s.id];
                    return (
                      <div
                        key={s.id}
                        className={`chat-settings-sticker${
                          s.enabled ? "" : " is-disabled"
                        }`}
                      >
                        <div className="chat-settings-sticker-thumb">
                          {url ? (
                            <img src={url} alt="表情" />
                          ) : (
                            <span>…</span>
                          )}
                        </div>
                        <div className="chat-settings-sticker-btns">
                          <button
                            onClick={() =>
                              toggleStickerEnabled(s.id)
                            }
                          >
                            {s.enabled ? "停用" : "启用"}
                          </button>
                          <button
                            className="danger"
                            onClick={() =>
                              void removeSticker(s.id)
                            }
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 消息通知 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              消息通知
            </div>
            <div className="chat-settings-notif">
              <div className="chat-settings-notif-info">
                <strong>后台消息推送</strong>
                <small>
                  {notifState === "granted"
                    ? "已开启。切到后台时也会收到消息通知。"
                    : notifState === "denied"
                      ? "已被浏览器拒绝。请到浏览器设置里手动开启。"
                      : notifState === "unsupported"
                        ? "当前浏览器或环境不支持通知。"
                        : "允许通知后，即使离开聊天页面也能收到新消息提醒。"}
                </small>
              </div>
              {notifState === "default" && (
                <button
                  className="chat-settings-btn"
                  onClick={() =>
                    void handleEnableNotifications()
                  }
                >
                  开启通知
                </button>
              )}
              {notifState === "granted" && (
                <div className="chat-settings-notif-badge">
                  ✓ 已开启
                </div>
              )}
            </div>
          </section>

          {/* 聊天背景 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              聊天背景
            </div>
            <div className="chat-settings-bg-row">
              <div
                className="chat-settings-bg-preview"
                style={
                  bgPreview
                    ? {
                        backgroundImage: `url("${bgPreview}")`,
                      }
                    : undefined
                }
              >
                {!bgPreview && <span>默认</span>}
              </div>
              <div className="chat-settings-bg-actions">
                <label className="chat-settings-btn">
                  上传背景
                  <input
                    type="file"
                    accept="image/*"
                    style={IOS_SAFE_FILE_STYLE}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];
                      if (file) void uploadBg(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {bgPreview && (
                  <button
                    className="chat-settings-btn ghost"
                    onClick={() => void removeBg()}
                  >
                    恢复默认
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 自定义 CSS */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              自定义 CSS
            </div>
            <div className="chat-settings-css">
              <textarea
                className="chat-settings-css-textarea"
                value={cssDraft}
                onChange={(event) =>
                  setCssDraft(event.target.value)
                }
                onBlur={() =>
                  updateSettings({
                    chatCustomCSS: cssDraft,
                  })
                }
                rows={10}
                spellCheck={false}
                placeholder={
                  "/* 改聊天气泡，示例： */\n.message-bubble {\n  border-radius: 20px;\n}"
                }
              />
              <div className="chat-settings-css-actions">
                <button
                  className="chat-settings-btn small ghost"
                  onClick={() => {
                    setCssDraft("");
                    updateSettings({
                      chatCustomCSS: "",
                    });
                  }}
                >
                  清空
                </button>
                <button
                  className="chat-settings-btn small"
                  onClick={() =>
                    updateSettings({
                      chatCustomCSS: cssDraft,
                    })
                  }
                >
                  立即应用
                </button>
              </div>
            </div>
          </section>

          {/* 头像 */}
          <section className="chat-settings-section">
            <div className="chat-settings-section-title">
              头像
            </div>
            <div className="chat-settings-avatar-grid">
              {AVATAR_KEYS.map((avatar) => {
                const preview = avatarPreviews[avatar.key];
                const displayLabel =
                  avatar.key === "you"
                    ? cn.you
                    : avatar.key === "levi"
                      ? cn.levi
                      : cn.erwin;
                return (
                  <div
                    key={avatar.key}
                    className="chat-settings-avatar-item"
                  >
                    <div className="chat-settings-avatar-preview">
                      {preview ? (
                        <img
                          src={preview}
                          alt={displayLabel}
                        />
                      ) : (
                        <span>
                          {displayLabel
                            .charAt(0)
                            .toUpperCase() ||
                            avatar.fallback}
                        </span>
                      )}
                    </div>
                    <div className="chat-settings-avatar-name">
                      {displayLabel}
                    </div>
                    <div className="chat-settings-avatar-actions">
                      <label className="chat-settings-btn small">
                        上传
                        <input
                          type="file"
                          accept="image/*"
                          style={IOS_SAFE_FILE_STYLE}
                          onChange={(event) => {
                            const file =
                              event.target.files?.[0];
                            if (file)
                              void uploadAvatar(
                                avatar.key,
                                file
                              );
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {preview && (
                        <button
                          className="chat-settings-btn small ghost"
                          onClick={() =>
                            void removeAvatar(avatar.key)
                          }
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}