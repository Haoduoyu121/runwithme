"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cards as defaultCards } from "@/data/cards";
import { loadCards } from "@/lib/storage";

import {
  loadMessages,
  saveMessages,
} from "@/lib/chatStorage";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
} from "@/data/chat";

import { createReplyMessage } from "@/lib/chatReply";
import { pickCardWithRules } from "@/lib/cardPicker";

import { getImageFile } from "@/lib/imageFiles";
import { getStickerFile } from "@/lib/stickerFiles";
import { getVoiceFile } from "@/lib/voiceFiles";

import { useCall } from "@/lib/CallContext";
import { useSystem } from "@/lib/SystemContext";
import { useNotifications } from "@/lib/NotificationContext";

import {
  loadPhotoTextCards,
} from "@/lib/photoTextStorage";
import type {
  PhotoTextCardSnapshot,
} from "@/data/photoTextCards";

import type { WorldEvent } from "@/data/worldEvents";
import {
  loadWorldEvents,
  loadSeenEventIds,
  saveSeenEventIds,
  WORLD_EVENT_DISPATCH,
} from "@/lib/worldEventsStorage";
import { convertWorldEvent } from "@/lib/worldEventToChat";

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: "initial-001",
    sender: "Levi",
    type: "text",
    text: "你来了。",
    timestamp: Date.now(),
  },
  {
    id: "initial-002",
    sender: "Erwin",
    type: "text",
    text: "今天过得怎么样？",
    timestamp: Date.now(),
  },
];

function randomInteger(min: number, max: number) {
  return (
    Math.floor(Math.random() * (max - min + 1)) + min
  );
}

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function pickTextCardSnapshotFor(
  character: ChatSender
): PhotoTextCardSnapshot | null {
  if (character !== "Levi" && character !== "Erwin") {
    return null;
  }
  const cards = loadPhotoTextCards();
  const pool = cards.filter(
    (c) => c.author === character
  );
  if (pool.length === 0) return null;

  const card =
    pool[Math.floor(Math.random() * pool.length)];
  return {
    author: card.author,
    place: card.place,
    weather: card.weather,
    person: card.person,
    action: card.action,
    mood: card.mood,
  };
}

type ChatContextValue = {
  messages: ChatMessage[];
  generatingCount: number;
  autoReplyEnabled: boolean;
  addMessage: (msg: ChatMessage) => void;
  updateMessages: (
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
  generateResponse: () => Promise<void>;
  generateAutoReply: () => Promise<void>;
  setAutoReplyEnabled: (v: boolean) => void;
  scheduleAutoReplyAfterUserMessage: () => void;
};

const ChatContext =
  createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { notify } = useNotifications();
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  const {
    activeCall,
    triggerIncomingCall,
    registerCallEndListener,
  } = useCall();

  const { settings } = useSystem();

  const [messages, setMessages] = useState<ChatMessage[]>(
    []
  );
  const [generatingCount, setGeneratingCount] =
    useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] =
    useState(true);

  const restoredImageUrlsRef = useRef<
    Record<string, string>
  >({});
  const restoredStickerUrlsRef = useRef<
    Record<string, string>
  >({});
  const createdMediaUrlsRef = useRef<
    Record<string, string>
  >({});

  const lastUserMessageRef =
    useRef<ChatMessage | null>(null);

  const userLastActiveAtRef = useRef(0);

  const pendingQuoteEventsRef = useRef<WorldEvent[]>(
    []
  );
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const messagesInitRef = useRef(false);

  /* 初始化 */
  useEffect(() => {
    setMessages(loadMessages(DEFAULT_MESSAGES));
  }, []);

  useEffect(() => {
    // 首次进入：messages 是从 storage 加载的，不要反过来再保存
    if (!messagesInitRef.current) {
      messagesInitRef.current = true;
      return;
    }
    const t = window.setTimeout(() => {
      saveMessages(messages);
    }, 400);
    return () => window.clearTimeout(t);
  }, [messages]);

  /* 更新 lastUserMessageRef */
  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m.sender === "You" &&
        !m.deleted &&
        !m.recalled &&
        m.text
      ) {
        lastUserMessageRef.current = m;
        return;
      }
    }
    lastUserMessageRef.current = null;
  }, [messages]);

  useEffect(() => {
    return () => {
      Object.values(
        restoredImageUrlsRef.current
      ).forEach((url) => URL.revokeObjectURL(url));
      Object.values(
        restoredStickerUrlsRef.current
      ).forEach((url) => URL.revokeObjectURL(url));
      Object.values(
        createdMediaUrlsRef.current
      ).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  /* 媒体恢复 */
  useEffect(() => {
    if (messages.length === 0) return;

    let cancelled = false;

    async function restore() {
      for (const message of messages) {
        if (!message.mediaId) continue;

        if (
          message.mediaUrl ||
          message.deleted ||
          message.recalled
        ) {
          continue;
        }

        try {
          let file: Blob | null = null;

          if (message.type === "image") {
            file = await getImageFile(message.mediaId);
          }
          if (message.type === "sticker") {
            file = await getStickerFile(message.mediaId);
          }
          if (message.type === "voice") {
            file = await getVoiceFile(message.mediaId);
          }

          if (!file) continue;

          const url = URL.createObjectURL(file);

          if (cancelled) {
            URL.revokeObjectURL(url);
            continue;
          }

          if (message.type === "image") {
            restoredImageUrlsRef.current[message.id] =
              url;
          }
          if (message.type === "sticker") {
            restoredStickerUrlsRef.current[
              message.id
            ] = url;
          }
          if (message.type === "voice") {
            createdMediaUrlsRef.current[message.id] =
              url;
          }

          setMessages((previous) =>
            previous.map((item) =>
              item.id === message.id
                ? { ...item, mediaUrl: url }
                : item
            )
          );
        } catch (error) {
          console.error(
            "恢复聊天媒体失败:",
            message.mediaId,
            error
          );
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [messages]);

  /* addMessage */
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);

    if (msg.sender === "You") {
      userLastActiveAtRef.current = Date.now();
      return;
    }

    if (msg.type === "system") return;

    const title = msg.sender;

    let body = "";
    if (msg.type === "text") body = msg.text ?? "";
    else if (msg.type === "pat")
      body = `${msg.sender}${msg.text ?? ""}`;
    else if (msg.type === "voice") body = "发来了一条语音";
    else if (msg.type === "sticker") body = "发来了一个表情";
    else if (msg.type === "image") body = "发来了一张图片";
    else if (msg.type === "textcard")
      body = "发来了一张照片";
    else if (msg.type === "call") body = "来电";

    if (!body) return;

    const idleMs = Date.now() - userLastActiveAtRef.current;
    const isHidden =
      typeof document !== "undefined" &&
      document.visibilityState === "hidden";

    if (isHidden || idleMs > 60_000) {
      notifyRef.current({
        appId: "chat",
        character: msg.sender as "Levi" | "Erwin",
        title,
        body:
          body.length > 40
            ? body.slice(0, 40) + "…"
            : body,
      });
    }
  }, []);

  /* 通话结束 → 生成气泡 */
  useEffect(() => {
    const unsubscribe = registerCallEndListener(
      (record) => {
        const sender: ChatSender =
          record.direction === "outgoing"
            ? "You"
            : record.target === "Both"
              ? "Levi"
              : record.target;

        addMessage({
          id: createMessageId(),
          sender,
          type: "call",
          callDirection: record.direction,
          callStatus: record.status,
          callDuration: record.durationSec,
          callCharacter: record.target,
          timestamp: Date.now(),
        });
      }
    );

    return unsubscribe;
  }, [registerCallEndListener, addMessage]);

  /* 世界事件消费 */
  const consumeEvent = useCallback(
    (ev: WorldEvent) => {
      const { immediate, quoteCandidate } =
        convertWorldEvent(ev);

      for (const msg of immediate) {
        addMessage(msg);
      }

      if (quoteCandidate) {
        const list = pendingQuoteEventsRef.current;
        const next = [quoteCandidate, ...list].slice(
          0,
          10
        );
        pendingQuoteEventsRef.current = next;
      }
    },
    [addMessage]
  );

  useEffect(() => {
    const events = loadWorldEvents();
    const seen = loadSeenEventIds();

    const unread = events
      .filter((e) => !seen.has(e.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const ev of unread) {
      consumeEvent(ev);
      seen.add(ev.id);
    }
    if (unread.length > 0) {
      saveSeenEventIds(seen);
    }

    function onEvent(e: Event) {
      const detail = (e as CustomEvent<WorldEvent>)
        .detail;
      if (!detail) return;

      const s = loadSeenEventIds();
      if (s.has(detail.id)) return;
      s.add(detail.id);
      saveSeenEventIds(s);

      consumeEvent(detail);
    }

    window.addEventListener(
      WORLD_EVENT_DISPATCH,
      onEvent
    );
    return () => {
      window.removeEventListener(
        WORLD_EVENT_DISPATCH,
        onEvent
      );
    };
  }, [consumeEvent]);

  /* 生成单条回复 */
  const createReplyFromPicked = useCallback(
    async (
      picked: ReturnType<typeof pickCardWithRules>
    ) => {
      if (!picked) return;

      const {
        card,
        character,
        emojiPrefix,
        emojiSuffix,
        standaloneEmoji,
      } = picked;

      const textCardChance =
        settingsRef.current.chatTextCardChance ?? 0.05;
      if (Math.random() < textCardChance) {
        const snapshot =
          pickTextCardSnapshotFor(character);
        if (snapshot) {
          addMessage({
            id: createMessageId(),
            sender: character,
            type: "textcard",
            timestamp: Date.now(),
            textCardSnapshot: snapshot,
          });
          return;
        }
      }

      let textOverride: string | undefined;

      if (card.type === "text") {
        let t = card.text;
        if (emojiPrefix) t = `${emojiPrefix} ${t}`;
        if (emojiSuffix) t = `${t} ${emojiSuffix}`;
        textOverride = t;
      }

      const result = await createReplyMessage(
        card,
        character,
        textOverride
      );

      if (result.message) {
        const quoteChance =
          settingsRef.current.chatReply?.quoteChance ??
          0.25;

        const lastUser = lastUserMessageRef.current;

        if (
          lastUser &&
          lastUser.text &&
          card.type === "text" &&
          Math.random() < quoteChance
        ) {
          result.message.quote = {
            messageId: lastUser.id,
            sender: lastUser.sender,
            text: lastUser.text,
          };
        }

        if (result.mediaUrl) {
          createdMediaUrlsRef.current[
            result.mediaUrl.messageId
          ] = result.mediaUrl.url;
        }
        addMessage(result.message);
      }

      if (standaloneEmoji) {
        await sleep(600);

        addMessage({
          id: createMessageId(),
          sender: character,
          type: "text",
          text: standaloneEmoji,
          timestamp: Date.now(),
        });
      }
    },
    [addMessage]
  );

  /* 生成多条 */
  const generateResponse = useCallback(async () => {
    const latestCards = loadCards(defaultCards);

    const enabledCards = latestCards.filter(
      (card) => card.enabled
    );
    if (enabledCards.length === 0) return;

    const cfg = settingsRef.current.chatReply;

    const replyCount = randomInteger(
      cfg?.replyCountMin ?? 1,
      cfg?.replyCountMax ?? 3
    );

    setGeneratingCount((prev) => prev + 1);

    try {
      await sleep(randomInteger(1000, 4000));

      for (let i = 0; i < replyCount; i++) {
        const picked = pickCardWithRules(latestCards);
        if (!picked) break;

        await createReplyFromPicked(picked);

        if (i < replyCount - 1) {
          const dMin = cfg?.replyIntervalMin ?? 2;
          const dMax = cfg?.replyIntervalMax ?? 6;
          await sleep(
            randomInteger(dMin * 1000, dMax * 1000)
          );
        }
      }
    } finally {
      setGeneratingCount((prev) =>
        Math.max(0, prev - 1)
      );
    }
  }, [createReplyFromPicked]);

  const generateAutoReply = useCallback(async () => {
    const latestCards = loadCards(defaultCards);

    const enabledCards = latestCards.filter(
      (card) => card.enabled
    );
    if (enabledCards.length === 0) return;

    setGeneratingCount((prev) => prev + 1);

    try {
      await sleep(randomInteger(1000, 4000));

      /* 通话中不再触发电来，但消息照常回复 */
      if (!activeCall && Math.random() < 0.15) {
        triggerIncomingCall();
        return;
      }

      /* ★ 世界事件引用 */
      const quoteChance =
        settingsRef.current.chatWorldQuoteChance ?? 0.3;
      const pending = pendingQuoteEventsRef.current;

      if (
        pending.length > 0 &&
        Math.random() < quoteChance
      ) {
        const ev = pending[0];
        pendingQuoteEventsRef.current =
          pending.slice(1);

        const sender: ChatSender =
          ev.actor === "Levi"
            ? "Erwin"
            : ev.actor === "Erwin"
              ? "Levi"
              : Math.random() < 0.5
                ? "Levi"
                : "Erwin";

        const picked = pickCardWithRules(latestCards);
        const text =
          picked?.card.text?.trim() ||
          "刚才看到你发的了。";

        addMessage({
          id: createMessageId(),
          sender,
          type: "text",
          text,
          timestamp: Date.now(),
          quote: {
            messageId: `world-${ev.id}`,
            sender: ev.actor,
            text: ev.preview || ev.title,
            sourceApp: ev.app,
            sourceId: ev.sourceId,
          },
        });
        return;
      }

      const picked = pickCardWithRules(latestCards);
      if (!picked) return;

      await createReplyFromPicked(picked);
    } finally {
      setGeneratingCount((prev) =>
        Math.max(0, prev - 1)
      );
    }
  }, [
    activeCall,
    addMessage,
    createReplyFromPicked,
    triggerIncomingCall,
  ]);

  /* 通话开始时清空生成状态 */
  useEffect(() => {
    if (activeCall) {
      setGeneratingCount(0);
    }
  }, [activeCall]);

  /* 后台自动回复计时器 */
  useEffect(() => {
    if (!autoReplyEnabled) return;
    if (activeCall) return;
    if (messages.length === 0) return;

    const cfg = settings.chatReply;
    const minMs = (cfg?.autoReplyMin ?? 3) * 60 * 1000;
    const maxMs = (cfg?.autoReplyMax ?? 30) * 60 * 1000;

    const delay = randomInteger(minMs, maxMs);

    const timer = window.setTimeout(() => {
      void generateAutoReply();
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoReplyEnabled,
    activeCall,
    messages.length,
    generateAutoReply,
    settings.chatReply,
  ]);

  const scheduleAutoReplyAfterUserMessage =
    useCallback(() => {
      const cfg = settingsRef.current.chatReply;
      const minMs =
        (cfg?.userReplyDelayMin ?? 2) * 1000;
      const maxMs =
        (cfg?.userReplyDelayMax ?? 8) * 1000;

      const delay = randomInteger(minMs, maxMs);

      window.setTimeout(() => {
        void generateAutoReply();
      }, delay);
    }, [generateAutoReply]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        generatingCount,
        autoReplyEnabled,
        addMessage,
        updateMessages: setMessages,
        generateResponse,
        generateAutoReply,
        setAutoReplyEnabled,
        scheduleAutoReplyAfterUserMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
}