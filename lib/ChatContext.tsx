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

import {
  cards as defaultCards,
} from "@/data/cards";

import { loadCards } from "@/lib/storage";

import {
  loadMessages,
  saveMessages,
} from "@/lib/chatStorage";

import {
  createMessageId,
  type ChatMessage,
} from "@/data/chat";

import { createReplyMessage } from "@/lib/chatReply";
import { pickCardWithRules } from "@/lib/cardPicker";

import { getImageFile } from "@/lib/imageFiles";
import { getStickerFile } from "@/lib/stickerFiles";
import { getVoiceFile } from "@/lib/voiceFiles";

import { useCall } from "@/lib/CallContext";
import { useSystem } from "@/lib/SystemContext";
import { sendNotification } from "@/lib/notifications";

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
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const ChatContext = createContext<ChatContextValue | null>(
  null
);

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { activeCall, triggerIncomingCall } = useCall();
  const { settings } = useSystem();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generatingCount, setGeneratingCount] = useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  const restoredImageUrlsRef = useRef<
    Record<string, string>
  >({});
  const restoredStickerUrlsRef = useRef<
    Record<string, string>
  >({});
  const createdMediaUrlsRef = useRef<
    Record<string, string>
  >({});

  /* 最近一条用户消息，用于引用 */
  const lastUserMessageRef = useRef<ChatMessage | null>(null);

  /* settings ref，避免闭包过期 */
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /* -------------------------------------------------------
     初始化
     ------------------------------------------------------- */

  useEffect(() => {
    setMessages(loadMessages(DEFAULT_MESSAGES));
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    saveMessages(messages);
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
      Object.values(restoredImageUrlsRef.current).forEach(
        (url) => URL.revokeObjectURL(url)
      );
      Object.values(
        restoredStickerUrlsRef.current
      ).forEach((url) => URL.revokeObjectURL(url));
      Object.values(createdMediaUrlsRef.current).forEach(
        (url) => URL.revokeObjectURL(url)
      );
    };
  }, []);

  /* -------------------------------------------------------
     媒体恢复
     ------------------------------------------------------- */

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
            restoredImageUrlsRef.current[message.id] = url;
          }
          if (message.type === "sticker") {
            restoredStickerUrlsRef.current[message.id] = url;
          }
          if (message.type === "voice") {
            createdMediaUrlsRef.current[message.id] = url;
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

  /* -------------------------------------------------------
     addMessage（带通知）
     ------------------------------------------------------- */

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);

    if (
      msg.sender !== "You" &&
      msg.type !== "system" &&
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      const title = msg.sender;

      let body = "";
      if (msg.type === "text") body = msg.text ?? "";
      else if (msg.type === "pat")
        body = `${msg.sender}${msg.text ?? ""}`;
      else if (msg.type === "voice")
        body = "发来了一条语音";
      else if (msg.type === "sticker")
        body = "发来了一个表情";
      else if (msg.type === "image")
        body = "发来了一张图片";
      else if (msg.type === "call") body = "来电";

      if (body) {
        sendNotification(title, body, msg.id);
      }
    }
  }, []);

  /* -------------------------------------------------------
     生成单条回复
     ------------------------------------------------------- */

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

      /* 主消息：附加 emoji 到文本 */
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
        /* ★ 一定概率引用最近一条用户消息 */
        const quoteChance =
          settingsRef.current.chatReply?.quoteChance ?? 0.15;

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

      /* 单独发 emoji */
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

  /* -------------------------------------------------------
     生成多条
     ------------------------------------------------------- */

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
    if (activeCall) return;

    const latestCards = loadCards(defaultCards);

    const enabledCards = latestCards.filter(
      (card) => card.enabled
    );
    if (enabledCards.length === 0) return;

    setGeneratingCount((prev) => prev + 1);

    try {
      await sleep(randomInteger(1000, 4000));

      /* 有概率改打电话 */
      if (Math.random() < 0.15) {
        triggerIncomingCall();
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
    createReplyFromPicked,
    triggerIncomingCall,
  ]);

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

  const scheduleAutoReplyAfterUserMessage = useCallback(() => {
    const cfg = settingsRef.current.chatReply;
    const minMs = (cfg?.userReplyDelayMin ?? 2) * 1000;
    const maxMs = (cfg?.userReplyDelayMax ?? 8) * 1000;

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