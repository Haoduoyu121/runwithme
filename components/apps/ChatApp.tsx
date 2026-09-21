"use client";

import { useEffect, useRef, useState } from "react";

import {
  ArrowUp,
  Check,
  ChevronLeft,
  Ellipsis,
  Hand,
  ImagePlus,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Plus,
  Smile,
  Sparkles,
  X,
} from "lucide-react";

import { saveImageFile } from "@/lib/imageFiles";

import type { Character } from "@/data/cards";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
  type CallStatus,
  type CallDirection,
  type CallCharacter,
} from "@/data/chat";

import type { StickerItem } from "@/data/stickers";

import {
  loadStickers,
  saveStickers,
} from "@/lib/stickerStorage";
import {
  deleteStickerFile,
  getStickerFile,
  saveStickerFile,
} from "@/lib/stickerFiles";
import TextCard from "@/components/apps/photos/TextCard";
import { useCall } from "@/lib/CallContext";
import { useSystem } from "@/lib/SystemContext";
import { useChat } from "@/lib/ChatContext";
import { useCollection } from "@/lib/CollectionContext";
import { getChatFile } from "@/lib/chatFiles";

import ChatSettingsPanel from "@/components/apps/chat/ChatSettingsPanel";

import type { CharacterNames } from "@/lib/systemStorage";

type ChatAppProps = {
  onBack: () => void;
};

const LONG_PRESS_DURATION = 500;

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

function getSenderName(
  sender: ChatSender,
  names: CharacterNames
) {
  if (sender === "You") return names.you;
  if (sender === "Levi") return names.levi;
  if (sender === "Erwin") return names.erwin;
  return sender;
}

/* -------------------------------------------------------
   子组件
   ------------------------------------------------------- */

function MessageActions({
  message,
  isCollected,
  onCollect,
  onDelete,
  onRecall,
  onQuote,
  onMultiSelect,
}: {
  message: ChatMessage;
  isCollected: boolean;
  onCollect: () => void;
  onDelete: () => void;
  onRecall: () => void;
  onQuote: () => void;
  onMultiSelect: () => void;
}) {
  const isCollectable =
    !message.deleted &&
    !message.recalled &&
    (message.type === "text" || message.type === "pat");

  return (
    <div
      className="chat-message-actions"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {!message.recalled && !message.deleted && (
        <button onClick={onRecall}>撤回</button>
      )}

      {!message.deleted && (
        <button onClick={onDelete}>删除</button>
      )}

      {!message.deleted &&
        !message.recalled &&
        message.type === "text" && (
          <button onClick={onQuote}>引用</button>
        )}

      {isCollectable && (
        <button onClick={onCollect}>
          {isCollected ? "取消收藏" : "收藏"}
        </button>
      )}

      <button onClick={onMultiSelect}>多选</button>
    </div>
  );
}

function MessageQuote({
  quote,
  names,
}: {
  quote: {
    sender: ChatSender;
    text: string;
    sourceApp?: string;
  };
  names: CharacterNames;
}) {
  return (
    <div className="message-quote">
      <div className="message-quote-sender">
        <span>{getSenderName(quote.sender, names)}</span>
        {quote.sourceApp === "icity" && (
          <span className="message-quote-source-tag">
            iCity
          </span>
        )}
      </div>
      <div className="message-quote-text">{quote.text}</div>
    </div>
  );
}

function TextMessage({
  message,
  names,
}: {
  message: ChatMessage;
  names: CharacterNames;
}) {
  if (message.deleted) {
    return <div className="message-deleted">此消息已删除</div>;
  }

  if (message.recalled) {
    return (
      <div className="message-recalled">
        {message.sender === "You"
          ? "你撤回了一条消息"
          : `${getSenderName(
              message.sender,
              names
            )}撤回了一条消息`}
      </div>
    );
  }

  return (
    <div className="message-text-wrapper">
      {message.quote && (
        <MessageQuote quote={message.quote} names={names} />
      )}
      <div className="message-bubble">{message.text}</div>
    </div>
  );
}

function VoiceMessage({
  message,
  names,
}: {
  message: ChatMessage;
  names: CharacterNames;
}) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showText, setShowText] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      loadedUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!message.mediaUrl) return;
    const url = message.mediaUrl;
    const audio = new Audio(url);
    audio.preload = "metadata";
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.load();
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [message.mediaUrl]);

  if (message.deleted) {
    return <div className="message-deleted">此消息已删除</div>;
  }

  if (message.recalled) {
    return (
      <div className="message-recalled">
        {message.sender === "You"
          ? "你撤回了一条消息"
          : `${getSenderName(
              message.sender,
              names
            )}撤回了一条消息`}
      </div>
    );
  }

  function togglePlay() {
    const url = message.mediaUrl;
    if (!url) return;
    let audio = audioRef.current;

    if (!audio || loadedUrlRef.current !== url) {
      audio?.pause();
      audio = new Audio(url);
      audioRef.current = audio;
      loadedUrlRef.current = url;

      audio.addEventListener("ended", () => {
        setPlaying(false);
        setCurrentTime(0);
      });
      audio.addEventListener("timeupdate", () => {
        if (audio) setCurrentTime(audio.currentTime);
      });
      audio.addEventListener("loadedmetadata", () => {
        if (audio && Number.isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      });
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch((err) => {
          console.error("播放语音失败:", err);
        });
    }
  }

  const total = Math.round(duration);
  const current = Math.round(currentTime);
  const displayTime = formatDuration(
    playing ? Math.max(0, total - current) : total
  );
  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  const WAVE = [
    8, 14, 10, 18, 12, 16, 9, 15, 11, 17, 13, 9, 14, 10,
  ];

  return (
    <div className="chat-voice-v2">
      <button
        className="chat-voice-bubble"
        onClick={togglePlay}
        type="button"
        disabled={!message.mediaUrl}
      >
        <span className="chat-voice-play">
          {playing ? (
            <Pause
              size={12}
              strokeWidth={2.4}
              fill="currentColor"
            />
          ) : (
            <Play
              size={12}
              strokeWidth={2.4}
              fill="currentColor"
            />
          )}
        </span>
        <span className="chat-voice-wave">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="chat-voice-bar"
              style={{
                height: `${h}px`,
                opacity:
                  progress > (i / WAVE.length) * 100
                    ? 1
                    : 0.35,
              }}
            />
          ))}
        </span>
        <span className="chat-voice-time">
          {message.mediaUrl ? displayTime : "…"}
        </span>
      </button>

      {message.text && (
        <button
          className="chat-voice-transcribe"
          onClick={() => setShowText((s) => !s)}
          type="button"
        >
          {showText ? "收起文字" : "转文字"}
        </button>
      )}

      {showText && message.text && (
        <div className="chat-voice-text">
          {message.text}
        </div>
      )}
    </div>
  );
}

function PatMessage({
  message,
}: {
  message: ChatMessage;
}) {
  if (message.deleted) {
    return (
      <div className="chat-pat-message chat-pat-deleted">
        此消息已删除
      </div>
    );
  }
  if (message.recalled) {
    return (
      <div className="chat-pat-message chat-pat-recalled">
        {message.sender === "You"
          ? "你撤回了一条拍一拍"
          : `${message.sender}撤回了一条拍一拍`}
      </div>
    );
  }
  const name =
    message.sender === "You" ? "你" : message.sender;
  return (
    <div className="chat-pat-message">
      {name}
      {message.text ?? "拍了一拍"}
    </div>
  );
}

function CallMessage({
  message,
  names,
}: {
  message: ChatMessage;
  names: CharacterNames;
}) {
  const direction: CallDirection =
    message.callDirection ?? "outgoing";
  const status: CallStatus =
    message.callStatus ?? "completed";
  const duration = message.callDuration ?? 0;
  const target: CallCharacter =
    message.callCharacter ?? "Levi";

  const targetName =
    target === "Both"
      ? "群组"
      : getSenderName(target, names);

  let title = "";
  if (direction === "outgoing") {
    title = target === "Both" ? "群组语音通话" : "语音通话";
  } else {
    title =
      target === "Both"
        ? "群组语音通话"
        : `${targetName} 的语音通话`;
  }

  let subtitle = "";
  if (status === "completed") {
    subtitle = formatDuration(duration);
  } else if (status === "no-answer") {
    subtitle =
      direction === "outgoing" ? "对方未接听" : "未接来电";
  } else if (status === "rejected") {
    subtitle = "对方已拒绝";
  } else if (status === "cancelled") {
    subtitle = "已取消";
  } else if (status === "declined") {
    subtitle = "你已拒绝";
  } else if (status === "missed") {
    subtitle = "未接来电";
  }

  const isCompleted = status === "completed";

  return (
    <div className="chat-call-bubble">
      <div className="chat-call-icon">
        {isCompleted ? (
          <Phone size={14} strokeWidth={2} />
        ) : (
          <PhoneOff size={14} strokeWidth={2} />
        )}
      </div>
      <div className="chat-call-info">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

/* =========================================================
   ChatApp
   ========================================================= */

export default function ChatApp({ onBack }: ChatAppProps) {
  const { activeCall, startOutgoingCall } = useCall();
  const { settings, theme } = useSystem();

  const {
    messages,
    generatingCount,
    addMessage,
    updateMessages,
    generateResponse,
    scheduleAutoReplyAfterUserMessage,
  } = useChat();

  const {
    items: collectionItems,
    add: addCollection,
    remove: removeCollection,
    tryAutoCollect,
  } = useCollection();

  function isMessageCollected(messageId: string): boolean {
    return collectionItems.some(
      (it) =>
        it.owner === "user" &&
        it.source === "chat" &&
        it.sourceId === messageId
    );
  }

  function toggleCollectMessage(message: ChatMessage) {
    const existing = collectionItems.find(
      (it) =>
        it.owner === "user" &&
        it.source === "chat" &&
        it.sourceId === message.id
    );

    if (existing) {
      removeCollection(existing.id);
    } else {
      const content =
        message.type === "pat"
          ? message.text ?? "拍了一拍"
          : message.text ?? "";

      if (!content.trim()) {
        setSelectedMessageId(null);
        return;
      }

      const sender: "You" | "Levi" | "Erwin" | null =
        message.sender === "You" ||
        message.sender === "Levi" ||
        message.sender === "Erwin"
          ? message.sender
          : null;

      addCollection({
        owner: "user",
        source: "chat",
        sourceId: message.id,
        content,
        sender,
        originalAt: message.timestamp,
      });
    }

    setSelectedMessageId(null);
  }

  const names = settings.characterNames;

  const [input, setInput] = useState("");
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [stickerUrls, setStickerUrls] = useState<
    Record<string, string>
  >({});

  const [showStickerPanel, setShowStickerPanel] =
    useState(false);
  const [stickerManageMode, setStickerManageMode] =
    useState(false);
  const [selectedStickerIds, setSelectedStickerIds] =
    useState<Set<string>>(new Set());
  const [showCallPicker, setShowCallPicker] =
    useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const [selectedMessageId, setSelectedMessageId] =
    useState<string | null>(null);

  /* ★ 多选模式 */
  const [selectionMode, setSelectionMode] =
    useState(false);
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  const [quoteDraft, setQuoteDraft] = useState<{
    messageId: string;
    sender: ChatSender;
    text: string;
  } | null>(null);

  const [customBgUrl, setCustomBgUrl] = useState<
    string | null
  >(null);

  const [avatarUrls, setAvatarUrls] = useState<{
    you: string | null;
    levi: string | null;
    erwin: string | null;
  }>({ you: null, levi: null, erwin: null });

  const longPressTimer = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);
  const longPressTriggered = useRef(false);
  const longPressStart = useRef<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  const chatName = settings.chatName;

  /* ---------------- 注入自定义 CSS ---------------- */

  useEffect(() => {
    const STYLE_ID = "runwithme-chat-custom-css";
    let el = document.getElementById(
      STYLE_ID
    ) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = settings.chatCustomCSS ?? "";
  }, [settings.chatCustomCSS]);

  /* ---------------- 双击头像 = 拍一拍 ---------------- */

  const patMessages = settings.patMessages;
  const avatarTapRef = useRef<Record<string, number>>({});

  function pickPatText(sender: "Levi" | "Erwin"): string {
    const key = sender.toLowerCase() as "levi" | "erwin";
    const list = patMessages[key] ?? [];
    if (list.length === 0) {
      return `拍了拍 ${sender} 的头像`;
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  function handleAvatarTap(sender: "Levi" | "Erwin") {
    if (selectionMode) return;
    const now = Date.now();
    const last = avatarTapRef.current[sender] ?? 0;
    if (now - last < 350) {
      avatarTapRef.current[sender] = 0;
      addMessage({
        id: createMessageId(),
        sender: "You",
        type: "pat",
        text: pickPatText(sender),
        timestamp: Date.now(),
      });
    } else {
      avatarTapRef.current[sender] = now;
    }
  }

  /* 加载表情包 */
  useEffect(() => {
    const reload = () => setStickers(loadStickers());
    reload();
    window.addEventListener(
      "runwithme:stickers-updated",
      reload
    );
    return () => {
      window.removeEventListener(
        "runwithme:stickers-updated",
        reload
      );
    };
  }, []);

  /* 自定义背景 */
  useEffect(() => {
    if (settings.chatBackground !== "custom") {
      setCustomBgUrl(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;
    async function loadBg() {
      const file = await getChatFile("chat-bg");
      if (!file) return;
      url = URL.createObjectURL(file);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      setCustomBgUrl(url);
    }
    void loadBg();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [settings.chatBackground]);

  /* 头像 */
  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    async function loadAvatars() {
      const next: {
        you: string | null;
        levi: string | null;
        erwin: string | null;
      } = { you: null, levi: null, erwin: null };
      for (const key of [
        "you",
        "levi",
        "erwin",
      ] as const) {
        if (!settings.avatars[key]) continue;
        const file = await getChatFile(`avatar-${key}`);
        if (!file) continue;
        const url = URL.createObjectURL(file);
        created.push(url);
        next[key] = url;
      }
      if (!cancelled) setAvatarUrls(next);
    }
    void loadAvatars();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [settings.avatars]);

  /* 表情包预览 */
  useEffect(() => {
    let cancelled = false;
    async function loadStickerPreviews() {
      const nextUrls: Record<string, string> = {};
      for (const sticker of stickers) {
        if (!sticker.enabled) continue;
        try {
          const file = await getStickerFile(sticker.id);
          if (!file) continue;
          nextUrls[sticker.id] = URL.createObjectURL(file);
        } catch (error) {
          console.error(
            "加载表情包失败:",
            sticker.id,
            error
          );
        }
      }
      if (cancelled) {
        Object.values(nextUrls).forEach((url) =>
          URL.revokeObjectURL(url)
        );
        return;
      }
      setStickerUrls(nextUrls);
    }
    void loadStickerPreviews();
    return () => {
      cancelled = true;
    };
  }, [stickers]);

  /* 自动滚底 */
  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;

    const behavior = initialScrollDoneRef.current
      ? "smooth"
      : "auto";

    initialScrollDoneRef.current = true;

    const doScroll = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    };

    // 先滚一次
    doScroll();

    // 等一帧再滚一次（等图片 / 卡片撑开高度）
    const raf = requestAnimationFrame(doScroll);

    // 再过 200ms 兜底滚一次
    const t = window.setTimeout(doScroll, 200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [messages, generatingCount]);

  /* 键盘弹起时滚到底部 */
  useEffect(() => {
    function onKb(e: Event) {
      const detail = (
        e as CustomEvent<{ inset: number }>
      ).detail;
      if (!detail) return;
      if (detail.inset <= 0) return;

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "auto",
          block: "end",
        });
      });
    }

    window.addEventListener("runwithme:kb-change", onKb);
    return () => {
      window.removeEventListener(
        "runwithme:kb-change",
        onKb
      );
    };
  }, []);

  /* -------------------------------------------------------
     发送
     ------------------------------------------------------- */

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const messageId = createMessageId();
    addMessage({
      id: messageId,
      sender: "You",
      type: "text",
      text,
      timestamp: Date.now(),
      ...(quoteDraft
        ? {
            quote: {
              messageId: quoteDraft.messageId,
              sender: quoteDraft.sender,
              text: quoteDraft.text,
            },
          }
        : {}),
    });
    setInput("");
    setQuoteDraft(null);
    setShowPlusMenu(false);
    setSelectedMessageId(null);
    scheduleAutoReplyAfterUserMessage();

    tryAutoCollect({
      source: "chat",
      sourceId: messageId,
      content: text,
      sender: "You",
      originalAt: Date.now(),
    });
  }

    /* ★ 批量添加表情（面板里的「+ 添加」用） */
  async function handleBatchAddStickers(
    files: File[]
  ) {
    if (files.length === 0) return;

    const current = loadStickers();
    const added: StickerItem[] = [];
    const newUrls: Record<string, string> = {};

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const id = `sticker-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}-${Math.random()
        .toString(36)
        .slice(2, 5)}`;
      try {
        await saveStickerFile(id, file);
        added.push({
          id,
          fileName: file.name,
          url: "",
          enabled: true,
        });
        newUrls[id] = URL.createObjectURL(file);
      } catch (e) {
        console.error("保存表情失败:", file.name, e);
      }
    }

    if (added.length === 0) return;

    const next = [...current, ...added];
    saveStickers(next);
    setStickers(next);
    setStickerUrls((prev) => ({
      ...prev,
      ...newUrls,
    }));

    try {
      window.dispatchEvent(
        new Event("runwithme:stickers-updated")
      );
    } catch {}
  }

    /* ★ 批量删除表情 */
  async function handleBatchDeleteStickers() {
    if (selectedStickerIds.size === 0) return;
    if (
      !window.confirm(
        `确定删除选中的 ${selectedStickerIds.size} 个表情？此操作不可恢复。`
      )
    )
      return;

    /* 删 IDB 文件 */
    for (const id of selectedStickerIds) {
      try {
        await deleteStickerFile(id);
      } catch (e) {
        console.error("删除表情文件失败:", id, e);
      }
      /* 顺便释放旧的 objectURL */
      const u = stickerUrls[id];
      if (u) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      }
    }

    /* 更新列表 */
    const next = loadStickers().filter(
      (s) => !selectedStickerIds.has(s.id)
    );
    saveStickers(next);
    setStickers(next);

    /* 清 selected */
    setSelectedStickerIds(new Set());
    setStickerManageMode(false);

    try {
      window.dispatchEvent(
        new Event("runwithme:stickers-updated")
      );
    } catch {}
  }

  /* ★ 单个表情选择切换 */
  function toggleStickerSelect(id: string) {
    setSelectedStickerIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function sendSticker(sticker: StickerItem) {
    const url = stickerUrls[sticker.id];
    if (!url) return;
    addMessage({
      id: createMessageId(),
      sender: "You",
      type: "sticker",
      mediaId: sticker.id,
      mediaUrl: url,
      timestamp: Date.now(),
    });
    setShowStickerPanel(false);
    setSelectedMessageId(null);
  }

  async function sendImage(file: File) {
    const messageId = createMessageId();
    const mediaId = `image-${messageId}`;
    await saveImageFile(mediaId, file);
    const imageUrl = URL.createObjectURL(file);
    addMessage({
      id: messageId,
      sender: "You",
      type: "image",
      mediaId,
      mediaUrl: imageUrl,
      timestamp: Date.now(),
    });
    setSelectedMessageId(null);
    setShowPlusMenu(false);
  }

  /* -------------------------------------------------------
     单条操作
     ------------------------------------------------------- */

  function deleteMessage(messageId: string) {
    updateMessages((prev) =>
      prev.filter((m) => m.id !== messageId)
    );
    setSelectedMessageId(null);
  }

  function recallMessage(messageId: string) {
    updateMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, recalled: true } : m
      )
    );
    setSelectedMessageId(null);
  }

  function quoteMessage(message: ChatMessage) {
    if (
      message.deleted ||
      message.recalled ||
      message.type !== "text" ||
      !message.text
    ) {
      setSelectedMessageId(null);
      return;
    }
    setQuoteDraft({
      messageId: message.id,
      sender: message.sender,
      text: message.text,
    });
    setSelectedMessageId(null);
    setShowPlusMenu(false);
  }

  function clearQuote() {
    setQuoteDraft(null);
  }

  function patCharacter(sender: Character) {
    const target: "Levi" | "Erwin" =
      sender === "Erwin" ? "Erwin" : "Levi";
    addMessage({
      id: createMessageId(),
      sender: "You",
      type: "pat",
      text: pickPatText(target),
      timestamp: Date.now(),
    });
    setShowPlusMenu(false);
    setSelectedMessageId(null);
  }

  /* -------------------------------------------------------
     ★ 多选
     ------------------------------------------------------- */

  function enterSelectionMode(initialId: string) {
    setSelectionMode(true);
    setSelectedIds([initialId]);
    setSelectedMessageId(null);
    setShowPlusMenu(false);
    setShowCallPicker(false);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds([]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
    const allIds = messages
      .filter((m) => !m.deleted)
      .map((m) => m.id);
    setSelectedIds(allIds);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `确定删除已选的 ${selectedIds.length} 条消息？`
      )
    ) {
      return;
    }
    const idSet = new Set(selectedIds);
    updateMessages((prev) =>
      prev.filter((m) => !idSet.has(m.id))
    );
    exitSelectionMode();
  }

  /* -------------------------------------------------------
     长按 / 点击
     ------------------------------------------------------- */

  function startLongPress(
    messageId: string,
    x: number,
    y: number
  ) {
    if (selectionMode) return;
    longPressTriggered.current = false;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressStart.current = { x, y };
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedMessageId(messageId);
      setShowPlusMenu(false);
    }, LONG_PRESS_DURATION);
  }

  function moveLongPress(x: number, y: number) {
    if (!longPressTimer.current) return;
    const dx = x - longPressStart.current.x;
    const dy = y - longPressStart.current.y;
    if (dx * dx + dy * dy > 100) {
      cancelLongPress();
    }
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleMessageClick(messageId: string) {
    if (selectionMode) {
      const msg = messages.find((m) => m.id === messageId);
      if (msg?.deleted) return;
      toggleSelect(messageId);
      return;
    }

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setSelectedMessageId((previous) =>
      previous === messageId ? null : messageId
    );
  }

  function handlePlusAction() {
    setShowPlusMenu(false);
    setShowStickerPanel(true);
  }

  function handleStartCall(
    target: "Levi" | "Erwin" | "Both"
  ) {
    setShowCallPicker(false);
    setShowPlusMenu(false);
    setSelectedMessageId(null);
    startOutgoingCall(target);
  }

  /* -------------------------------------------------------
     渲染消息
     ------------------------------------------------------- */

  function renderMessage(
    message: ChatMessage,
    index: number
  ) {
    const isYou = message.sender === "You";
    const isSystem = message.type === "system";
    const isSelected = selectedIds.includes(message.id);
    const selectable = !message.deleted;

    if (isSystem) {
      return (
        <div
          key={message.id}
          className="chat-system-message"
        >
          {message.text}
        </div>
      );
    }

    /* 拍一拍 */
    if (message.type === "pat") {
      return (
        <div
          key={message.id}
          className={`chat-pat-row${
            selectedMessageId === message.id
              ? " message-selected"
              : ""
          }${selectionMode ? " is-selection-mode" : ""}${
            isSelected ? " is-picked" : ""
          }`}
        >
          <div className="chat-pat-wrapper">
            <div
              className="chat-message-longpress-target"
              onPointerDown={(e) =>
                startLongPress(
                  message.id,
                  e.clientX,
                  e.clientY
                )
              }
              onPointerMove={(e) =>
                moveLongPress(e.clientX, e.clientY)
              }
              onPointerUp={cancelLongPress}
              onClick={() =>
                handleMessageClick(message.id)
              }
              onContextMenu={(event) => {
                event.preventDefault();
                if (selectionMode) return;
                cancelLongPress();
                setSelectedMessageId(message.id);
                setShowPlusMenu(false);
              }}
            >
              <PatMessage message={message} />
            </div>

            {selectionMode && selectable && (
              <span className="chat-pick-indicator">
                {isSelected ? (
                  <Check size={12} strokeWidth={3} />
                ) : null}
              </span>
            )}

            {!selectionMode &&
              selectedMessageId === message.id && (
                <div className="chat-message-context">
                  <MessageActions
                    message={message}
                    isCollected={isMessageCollected(
                      message.id
                    )}
                    onCollect={() =>
                      toggleCollectMessage(message)
                    }
                    onDelete={() =>
                      deleteMessage(message.id)
                    }
                    onRecall={() =>
                      recallMessage(message.id)
                    }
                    onQuote={() => quoteMessage(message)}
                    onMultiSelect={() =>
                      enterSelectionMode(message.id)
                    }
                  />
                </div>
              )}
          </div>
        </div>
      );
    }

    const prev =
      index > 0 ? messages[index - 1] : null;
    const next =
      index < messages.length - 1
        ? messages[index + 1]
        : null;

    const sameAsPrev =
      prev !== null &&
      prev.sender === message.sender &&
      prev.type !== "system" &&
      prev.type !== "pat";

    const sameAsNext =
      next !== null &&
      next.sender === message.sender &&
      next.type !== "system" &&
      next.type !== "pat";

    const isGroupStart = !sameAsPrev;
    const isGroupEnd = !sameAsNext;

    const senderKey: "you" | "levi" | "erwin" = isYou
      ? "you"
      : message.sender === "Levi"
        ? "levi"
        : "erwin";

    const avatarUrl = avatarUrls[senderKey];

    return (
      <div
        key={message.id}
        className={`message-row${
          isYou ? " message-you" : " message-other"
        }${
          isGroupStart
            ? " message-group-start"
            : " message-group-middle"
        }${
          isGroupEnd
            ? " message-group-end"
            : " message-group-middle"
        }${
          selectedMessageId === message.id
            ? " message-selected"
            : ""
        }${selectionMode ? " is-selection-mode" : ""}${
          isSelected ? " is-picked" : ""
        }`}
      >
        {!isYou && (
          <div className="message-avatar-column">
            {isGroupEnd ? (
              <div
                className={`message-avatar${
                  message.sender === "Levi"
                    ? " avatar-levi"
                    : " avatar-erwin"
                }${
                  avatarUrl ? " message-avatar-image" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectionMode) {
                    handleMessageClick(message.id);
                    return;
                  }
                  if (
                    message.sender === "Levi" ||
                    message.sender === "Erwin"
                  ) {
                    handleAvatarTap(message.sender);
                  }
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={message.sender}
                  />
                ) : message.sender === "Levi" ? (
                  names.levi.charAt(0).toUpperCase()
                ) : (
                  names.erwin.charAt(0).toUpperCase()
                )}
              </div>
            ) : (
              <div className="message-avatar-placeholder" />
            )}
          </div>
        )}

        <div className="message-content">
          {isGroupStart && (
            <div className="message-name">
              {getSenderName(message.sender, names)}
            </div>
          )}

          <div
            className="chat-message-longpress-target"
            onPointerDown={(e) =>
              startLongPress(
                message.id,
                e.clientX,
                e.clientY
              )
            }
            onPointerMove={(e) =>
              moveLongPress(e.clientX, e.clientY)
            }
            onPointerUp={cancelLongPress}
            onClick={() =>
              handleMessageClick(message.id)
            }
            onContextMenu={(event) => {
              event.preventDefault();
              if (selectionMode) return;
              cancelLongPress();
              setSelectedMessageId(message.id);
              setShowPlusMenu(false);
            }}
          >
            {message.type === "text" && (
              <TextMessage
                message={message}
                names={names}
              />
            )}

            {message.type === "voice" && (
              <VoiceMessage
                message={message}
                names={names}
              />
            )}

            {message.type === "sticker" &&
              message.mediaUrl && (
                <div className="chat-sticker-message">
                  <img
                    src={message.mediaUrl}
                    alt={message.text || "表情包"}
                  />
                </div>
              )}

            {message.type === "image" &&
              message.mediaUrl && (
                <div className="chat-image-message">
                  <img
                    src={message.mediaUrl}
                    alt="图片"
                  />
                </div>
              )}

                          {message.type === "textcard" &&
              message.textCardSnapshot && (
                <div className="chat-textcard-message">
                  <TextCard
                    card={message.textCardSnapshot}
                    variant="bubble"
                    avatars={{
                      you: avatarUrls.you,
                      levi: avatarUrls.levi,
                      erwin: avatarUrls.erwin,
                    }}
                  />
                </div>
              )}

            {message.type === "call" && (
              <CallMessage
                message={message}
                names={names}
              />
            )}
          </div>

          {isGroupEnd && !selectionMode && (
            <div className="message-meta">
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
              {isYou && (
                <span className="message-status">
                  已送达
                </span>
              )}
            </div>
          )}

          {selectionMode && selectable && (
            <span className="chat-pick-indicator">
              {isSelected ? (
                <Check size={12} strokeWidth={3} />
              ) : null}
            </span>
          )}

          {!selectionMode &&
            selectedMessageId === message.id && (
              <div className="chat-message-context">
                <MessageActions
                  message={message}
                  isCollected={isMessageCollected(
                    message.id
                  )}
                  onCollect={() =>
                    toggleCollectMessage(message)
                  }
                  onDelete={() =>
                    deleteMessage(message.id)
                  }
                  onRecall={() =>
                    recallMessage(message.id)
                  }
                  onQuote={() => quoteMessage(message)}
                  onMultiSelect={() =>
                    enterSelectionMode(message.id)
                  }
                />
              </div>
            )}
        </div>

        {isYou && (
          <div className="message-avatar-column">
            {isGroupEnd ? (
              <div
                className={`message-avatar avatar-you${
                  avatarUrls.you
                    ? " message-avatar-image"
                    : ""
                }`}
                onClick={(e) => {
                  if (selectionMode) {
                    e.stopPropagation();
                    handleMessageClick(message.id);
                  }
                }}
              >
                {avatarUrls.you ? (
                  <img src={avatarUrls.you} alt="You" />
                ) : (
                  names.you.charAt(0).toUpperCase()
                )}
              </div>
            ) : (
              <div className="message-avatar-placeholder" />
            )}
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */

  return (
    <main
      data-fs={
        settings.chatFontScale >= 1.25
          ? "xl"
          : settings.chatFontScale >= 1.05
            ? "lg"
            : settings.chatFontScale >= 0.95
              ? "md"
              : "sm"
      }
      className={`phone-screen chat-page${
        theme === "dark" ? " chat-dark" : " chat-light"
      }${customBgUrl ? " chat-has-custom-bg" : ""}${
        selectionMode ? " is-selection-mode" : ""
      }`}
      style={
        customBgUrl
          ? {
              backgroundImage: `url("${customBgUrl}")`,
            }
          : undefined
      }
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          if (selectionMode) return;
          setSelectedMessageId(null);
          setShowPlusMenu(false);
          setShowCallPicker(false);
        }
      }}
    >
      <header className="telegram-header">
        {selectionMode ? (
          <>
            <button
              className="telegram-back"
              onClick={exitSelectionMode}
              aria-label="取消"
            >
              <X size={22} strokeWidth={2.4} />
            </button>

            <div className="telegram-contact">
              <div className="telegram-name">
                已选 {selectedIds.length} 条
              </div>
              <div className="telegram-status">
                点击消息继续选择
              </div>
            </div>

            <button
              className="telegram-more telegram-select-all"
              onClick={selectAll}
              aria-label="全选"
            >
              全选
            </button>
          </>
        ) : (
          <>
            <button
              className="telegram-back"
              onClick={() => {
                setSelectedMessageId(null);
                setShowPlusMenu(false);
                setShowCallPicker(false);
                setQuoteDraft(null);
                onBack();
              }}
              aria-label="返回桌面"
            >
              <ChevronLeft
                size={26}
                strokeWidth={2.4}
              />
            </button>

            <div className="telegram-contact">
              <div className="telegram-name">
                {chatName}
              </div>
              <div className="telegram-status">
                {activeCall
                  ? activeCall.phase === "minimized"
                    ? "通话中（悬浮中）"
                    : "通话中…"
                  : generatingCount > 0
                    ? "正在输入…"
                    : "online"}
              </div>
            </div>

            <button
              className="telegram-more"
              onClick={() => {
                setSelectedMessageId(null);
                setShowPlusMenu(false);
                setShowCallPicker(false);
                setShowSettings(true);
              }}
              aria-label="Chat 设置"
            >
              <Ellipsis size={22} strokeWidth={2} />
            </button>
          </>
        )}
      </header>

      <section
        className="chat-messages"
        ref={messagesScrollRef}
      >
        <div className="chat-date">TODAY</div>
        {messages.map(renderMessage)}

        {generatingCount > 0 && !activeCall && (
          <div className="typing-row">
            <div className="typing-avatar">•••</div>
            <div className="typing-bubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* ★ 多选模式底部操作条 */}
      {selectionMode ? (
        <div className="chat-selection-bar">
          <button
            className="chat-selection-btn chat-selection-cancel"
            onClick={exitSelectionMode}
          >
            取消
          </button>
          <button
            className="chat-selection-btn chat-selection-delete"
            disabled={selectedIds.length === 0}
            onClick={deleteSelected}
          >
            删除
            {selectedIds.length > 0
              ? ` (${selectedIds.length})`
              : ""}
          </button>
        </div>
      ) : (
        <div className="chat-composer">
          {showPlusMenu && (
            <div className="chat-plus-menu">
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setShowCallPicker(true);
                }}
              >
                <span>
                  <Phone size={20} strokeWidth={1.9} />
                </span>
                <small>通话</small>
              </button>
              <button onClick={() => handlePlusAction()}>
                <span>
                  <Smile size={20} strokeWidth={1.9} />
                </span>
                <small>表情包</small>
              </button>

              <label className="chat-plus-menu-item">
                <span>
                  <ImagePlus
                    size={20}
                    strokeWidth={1.9}
                  />
                </span>
                <small>图片</small>
                <input
                  type="file"
                  accept="image/*"
                  className="ios-file-input"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];
                    if (file) void sendImage(file);
                    event.target.value = "";
                    setShowPlusMenu(false);
                  }}
                />
              </label>
              <button
                onClick={() =>
                  patCharacter(
                    Math.random() < 0.5 ? "Levi" : "Erwin"
                  )
                }
              >
                <span>
                  <Hand size={20} strokeWidth={1.9} />
                </span>
                <small>拍一拍</small>
              </button>
            </div>
          )}

          {showCallPicker && (
            <div className="chat-call-picker">
              <div className="chat-call-picker-title">
                选择通话对象
              </div>
              <div className="chat-call-picker-options">
                <button
                  onClick={() => handleStartCall("Levi")}
                >
                  <span className="chat-call-picker-avatar avatar-levi">
                    {names.levi.charAt(0).toUpperCase()}
                  </span>
                  <small>{names.levi}</small>
                </button>
                <button
                  onClick={() => handleStartCall("Erwin")}
                >
                  <span className="chat-call-picker-avatar avatar-erwin">
                    {names.erwin.charAt(0).toUpperCase()}
                  </span>
                  <small>{names.erwin}</small>
                </button>
                <button
                  onClick={() => handleStartCall("Both")}
                >
                  <span className="chat-call-picker-avatar avatar-both">
                    L&E
                  </span>
                  <small>一起</small>
                </button>
              </div>
              <button
                className="chat-call-picker-cancel"
                onClick={() => setShowCallPicker(false)}
              >
                取消
              </button>
            </div>
          )}

                   {showStickerPanel && (
            <div className="chat-sticker-panel">
              <div className="chat-sticker-panel-header">
                {!stickerManageMode ? (
                  <>
                    <span className="chat-sticker-panel-title">
                      我的表情
                    </span>
                    <span className="chat-sticker-panel-count">
                      共 {stickers.length} 个
                    </span>

                    {stickers.length > 0 && (
                      <button
                        className="chat-sticker-manage-btn"
                        onClick={() => {
                          setStickerManageMode(true);
                          setSelectedStickerIds(
                            new Set()
                          );
                        }}
                      >
                        管理
                      </button>
                    )}

                    <label className="chat-sticker-add-btn">
                      <Plus size={14} strokeWidth={2.6} />
                      添加
                      <input
                        type="file"
                        className="ios-file-input"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          const files = Array.from(
                            event.target.files ?? []
                          );
                          if (files.length > 0) {
                            void handleBatchAddStickers(
                              files
                            );
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <button
                      className="chat-sticker-manage-btn"
                      onClick={() => {
                        setStickerManageMode(false);
                        setSelectedStickerIds(new Set());
                      }}
                    >
                      完成
                    </button>
                    <span className="chat-sticker-panel-count">
                      已选 {selectedStickerIds.size}
                    </span>
                    <button
                      className="chat-sticker-manage-btn"
                      onClick={() => {
                        const all = stickers
                          .filter((s) => s.enabled)
                          .map((s) => s.id);
                        if (
                          selectedStickerIds.size ===
                          all.length
                        ) {
                          setSelectedStickerIds(new Set());
                        } else {
                          setSelectedStickerIds(
                            new Set(all)
                          );
                        }
                      }}
                    >
                      {selectedStickerIds.size ===
                      stickers.filter((s) => s.enabled)
                        .length
                        ? "取消全选"
                        : "全选"}
                    </button>
                    <button
                      className="chat-sticker-delete-btn"
                      disabled={
                        selectedStickerIds.size === 0
                      }
                      onClick={() =>
                        void handleBatchDeleteStickers()
                      }
                    >
                      删除
                    </button>
                  </>
                )}
              </div>

              {stickers.filter((s) => s.enabled).length ===
              0 ? (
                <div className="chat-sticker-empty">
                  还没有表情包
                  <br />
                  <small>点右上角「添加」加几张</small>
                </div>
              ) : (
                <div className="chat-sticker-grid">
                  {stickers
                    .filter((s) => s.enabled)
                    .map((sticker) => {
                      const url = stickerUrls[sticker.id];
                      if (!url) return null;
                      const checked =
                        selectedStickerIds.has(sticker.id);

                      return (
                        <button
                          key={sticker.id}
                          className={
                            "chat-sticker-item" +
                            (stickerManageMode
                              ? " is-manage"
                              : "") +
                            (checked ? " is-checked" : "")
                          }
                          onClick={() => {
                            if (stickerManageMode) {
                              toggleStickerSelect(
                                sticker.id
                              );
                            } else {
                              sendSticker(sticker);
                            }
                          }}
                        >
                          <img src={url} alt="表情包" />
                          {stickerManageMode && (
                            <span className="chat-sticker-check">
                              {checked ? "✓" : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          {quoteDraft && (
            <div className="chat-quote-preview">
              <div className="chat-quote-preview-content">
                <div className="chat-quote-preview-header">
                  回复{" "}
                  {getSenderName(quoteDraft.sender, names)}
                </div>
                <div className="chat-quote-preview-text">
                  {quoteDraft.text}
                </div>
              </div>
              <button
                className="chat-quote-preview-close"
                onClick={clearQuote}
                aria-label="取消引用"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
          )}

          <div className="chat-input-container">
            <button
              className="composer-plus"
              onClick={() => {
                setSelectedMessageId(null);
                setShowCallPicker(false);
                setShowPlusMenu((previous) => !previous);
              }}
              aria-label="更多功能"
            >
              <Plus size={22} strokeWidth={2.2} />
            </button>

            <input
              className="chat-input"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onFocus={() => {
                setSelectedMessageId(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                quoteDraft ? "回复消息…" : "Message"
              }
            />


            <button
              className={
                showStickerPanel
                  ? "composer-sticker active"
                  : "composer-sticker"
              }
              onClick={() => {
                setSelectedMessageId(null);
                setShowPlusMenu(false);
                setShowStickerPanel(
                  (previous) => !previous
                );
              }}
              aria-label="表情包"
            >
              <Smile size={20} strokeWidth={1.9} />
            </button>

            <button
              className="composer-card"
              onClick={() => void generateResponse()}
              aria-label="随机生成回复"
            >
              <Sparkles size={20} strokeWidth={1.9} />
            </button>

            <button
              className="composer-send"
              onClick={() => sendMessage()}
              aria-label="发送"
            >
              <ArrowUp size={20} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <ChatSettingsPanel
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}