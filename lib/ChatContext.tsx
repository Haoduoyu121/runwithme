"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cards as defaultCards } from "@/data/cards";
import { loadCards } from "@/lib/storage";

import {
  loadThreadMessages,
  saveThreadMessages,
} from "@/lib/chatStorage";

import {
  createMessageId,
  type ChatMessage,
  type ChatSender,
  type ThreadId,
  type ForwardItem,
} from "@/data/chat";

import { createReplyMessage } from "@/lib/chatReply";
import { pickCardWithRules } from "@/lib/cardPicker";
import { loadSentenceSettings } from "@/lib/sentenceStorage";
import { generateSentence } from "@/lib/sentenceGenerator";

import { getImageFile } from "@/lib/imageFiles";
import { getStickerFile } from "@/lib/stickerFiles";
import { getVoiceFile } from "@/lib/voiceFiles";

import { useCall } from "@/lib/CallContext";
import { useSystem } from "@/lib/SystemContext";
import { useNotifications } from "@/lib/NotificationContext";

import { loadPhotoTextCards } from "@/lib/photoTextStorage";
import type { PhotoTextCardSnapshot } from "@/data/photoTextCards";

import type { WorldEvent } from "@/data/worldEvents";
import {
  loadWorldEvents,
  loadSeenEventIds,
  saveSeenEventIds,
  WORLD_EVENT_DISPATCH,
} from "@/lib/worldEventsStorage";
import { convertWorldEvent } from "@/lib/worldEventToChat";

const THREAD_IDS: ThreadId[] = ["group", "levi", "erwin"];

const DEFAULT_MESSAGES: Record<ThreadId, ChatMessage[]> = {
  group: [
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
  ],
  levi: [],
  erwin: [],
};

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

/**
 * 抽卡：群聊全卡池；单聊只出目标角色的卡。
 * 通过重试最多 30 次来实现角色筛选（不改 cardPicker 内部逻辑）。
 */
function pickCardForThread(
  cards: ReturnType<typeof loadCards>,
  threadId: ThreadId
) {
  if (threadId === "group") {
    return pickCardWithRules(cards);
  }
  const target: ChatSender =
    threadId === "levi" ? "Levi" : "Erwin";
  for (let i = 0; i < 30; i++) {
    const picked = pickCardWithRules(cards);
    if (!picked) return null;
    if (picked.character === target) return picked;
  }
  return null;
}

type AddMessageOptions = { threadId?: ThreadId };

type ChatContextValue = {
  /* 当前 thread 的消息（外部调用者视角不变） */
  messages: ChatMessage[];

  generatingCount: number;
  autoReplyEnabled: boolean;

  /* ★ 新增 */
  activeThreadId: ThreadId;
  setActiveThreadId: (id: ThreadId) => void;
  threadLastMessages: Record<
    ThreadId,
    ChatMessage | null
  >;

  addMessage: (
    msg: ChatMessage,
    options?: AddMessageOptions
  ) => void;
  updateMessages: (
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
  generateResponse: (threadId?: ThreadId) => Promise<void>;
  generateAutoReply: (
    threadId?: ThreadId
  ) => Promise<void>;
  setAutoReplyEnabled: (v: boolean) => void;
  scheduleAutoReplyAfterUserMessage: () => void;
  forwardMessages: (
    targetThreadId: ThreadId,
    items: ForwardItem[],
    fromThreadId: ThreadId
  ) => void;
};

const ChatContext =
  createContext<ChatContextValue | null>(null);

/* ---------- 单个 thread 的后台自动回复计时器 ---------- */

function useAutoReplyTimer(
  threadId: ThreadId,
  messagesLength: number,
  enabled: boolean,
  hasActiveCall: boolean,
  autoReplyMin: number | undefined,
  autoReplyMax: number | undefined,
  onFire: (id: ThreadId) => void
) {
  const onFireRef = useRef(onFire);
  useEffect(() => {
    onFireRef.current = onFire;
  }, [onFire]);

  useEffect(() => {
    if (!enabled) return;
    if (hasActiveCall) return;
    if (messagesLength === 0) return;

    const minMs = (autoReplyMin ?? 3) * 60 * 1000;
    const maxMs = (autoReplyMax ?? 30) * 60 * 1000;
    const delay = randomInteger(minMs, maxMs);

    const timer = window.setTimeout(() => {
      onFireRef.current(threadId);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    enabled,
    hasActiveCall,
    messagesLength,
    threadId,
    autoReplyMin,
    autoReplyMax,
  ]);
}

/* =========================================================
   Provider
   ========================================================= */

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

  /* ★ 三个 thread 的消息表 */
  const [threads, setThreads] = useState<
    Record<ThreadId, ChatMessage[]>
  >(() => ({
    group: loadThreadMessages(
      "group",
      DEFAULT_MESSAGES.group
    ),
    levi: loadThreadMessages("levi", DEFAULT_MESSAGES.levi),
    erwin: loadThreadMessages(
      "erwin",
      DEFAULT_MESSAGES.erwin
    ),
  }));

  const [activeThreadId, setActiveThreadIdState] =
    useState<ThreadId>("group");
  const [generatingCount, setGeneratingCount] =
    useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] =
    useState(true);

  const activeThreadIdRef = useRef<ThreadId>("group");
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  /* 当前 thread 的消息（对外暴露的 messages） */
  const messages = threads[activeThreadId];

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

  const pendingQuoteEventsRef = useRef<WorldEvent[]>([]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /* ---------- 持久化（每 thread 一个 debounce） ---------- */

  const threadsInitRef = useRef(false);
  useEffect(() => {
    if (!threadsInitRef.current) {
      threadsInitRef.current = true;
      return;
    }
    const t = window.setTimeout(() => {
      saveThreadMessages("group", threads.group);
      saveThreadMessages("levi", threads.levi);
      saveThreadMessages("erwin", threads.erwin);
    }, 400);
    return () => window.clearTimeout(t);
  }, [threads]);

  /* ---------- 更新 lastUserMessageRef（当前 thread） ---------- */

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

  /* ---------- 清理 objectURL ---------- */
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

  /* ---------- 媒体恢复（扫描所有 thread） ---------- */

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      /* 对每个 thread 单独扫描 */
      for (const tid of THREAD_IDS) {
        const list = threads[tid];
        for (const message of list) {
          if (!message.mediaId) continue;
          if (
            message.mediaUrl ||
            message.deleted ||
            message.recalled
          )
            continue;

          try {
            let file: Blob | null = null;
            if (message.type === "image") {
              file = await getImageFile(message.mediaId);
            }
            if (message.type === "sticker") {
              file = await getStickerFile(
                message.mediaId
              );
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

            setThreads((prev) => ({
              ...prev,
              [tid]: prev[tid].map((item) =>
                item.id === message.id
                  ? { ...item, mediaUrl: url }
                  : item
              ),
            }));
          } catch (error) {
            console.error(
              "恢复聊天媒体失败:",
              message.mediaId,
              error
            );
          }
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- addMessage ---------- */

  const addMessage = useCallback(
    (msg: ChatMessage, options?: AddMessageOptions) => {
      const tid =
        options?.threadId ?? activeThreadIdRef.current;

      setThreads((prev) => ({
        ...prev,
        [tid]: [...prev[tid], msg],
      }));

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
      else if (msg.type === "voice")
        body = "发来了一条语音";
      else if (msg.type === "sticker")
        body = "发来了一个表情";
      else if (msg.type === "image")
        body = "发来了一张图片";
      else if (msg.type === "textcard")
        body = "发来了一张照片";
      else if (msg.type === "call") body = "来电";

      if (!body) return;

      const idleMs =
        Date.now() - userLastActiveAtRef.current;
      const isHidden =
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";
      const isOtherThread =
        tid !== activeThreadIdRef.current;

      if (isHidden || idleMs > 60_000 || isOtherThread) {
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
    },
    []
  );

  /* ---------- 通话结束 → 固定加到群聊 ---------- */

  useEffect(() => {
    const unsubscribe = registerCallEndListener(
      (record) => {
        const sender: ChatSender =
          record.direction === "outgoing"
            ? "You"
            : record.target === "Both"
              ? "Levi"
              : record.target;

        addMessage(
          {
            id: createMessageId(),
            sender,
            type: "call",
            callDirection: record.direction,
            callStatus: record.status,
            callDuration: record.durationSec,
            callCharacter: record.target,
            timestamp: Date.now(),
          },
          { threadId: "group" }
        );
      }
    );

    return unsubscribe;
  }, [registerCallEndListener, addMessage]);

  /* ---------- 世界事件消费 → 固定加到群聊 ---------- */

  const consumeEvent = useCallback(
    (ev: WorldEvent) => {
      const { immediate, quoteCandidate } =
        convertWorldEvent(ev);

      for (const msg of immediate) {
        addMessage(msg, { threadId: "group" });
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

  /* ---------- 生成单条回复（带 threadId） ---------- */

  const createReplyFromPicked = useCallback(
    async (
      picked: ReturnType<typeof pickCardWithRules>,
      threadId: ThreadId,
      latestCards: ReturnType<typeof loadCards>
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
          addMessage(
            {
              id: createMessageId(),
              sender: character,
              type: "textcard",
              timestamp: Date.now(),
              textCardSnapshot: snapshot,
            },
            { threadId }
          );
          return;
        }
      }

      let textOverride: string | undefined;
      let isSentence = false;

      if (card.type === "text") {
        let t = card.text;

        /* ★ 自由造句判定 */
        const sentenceCfg = loadSentenceSettings();
        if (
          sentenceCfg.enabled &&
          Math.random() < sentenceCfg.chance
        ) {
          const made = generateSentence(
            latestCards,
            character,
            sentenceCfg
          );
          if (made) {
            t = made;
            isSentence = true;
          }
        }

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
        /* ★ 标记造句 */
        if (isSentence) {
          result.message.sentence = true;
        }

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
        addMessage(result.message, { threadId });
      }

      if (standaloneEmoji) {
        await sleep(600);

        addMessage(
          {
            id: createMessageId(),
            sender: character,
            type: "text",
            text: standaloneEmoji,
            timestamp: Date.now(),
          },
          { threadId }
        );
      }
    },
    [addMessage]
  );

  /* ---------- 生成多条（手动 Sparkles） ---------- */

  const generateResponse = useCallback(
    async (threadIdOverride?: ThreadId) => {
      const tid =
        threadIdOverride ?? activeThreadIdRef.current;

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
          const picked = pickCardForThread(
            latestCards,
            tid
          );
          if (!picked) break;

          await createReplyFromPicked(
            picked,
            tid,
            latestCards
          );

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
    },
    [createReplyFromPicked]
  );

  /* ---------- 自动回复（由计时器触发） ---------- */

  const generateAutoReply = useCallback(
    async (threadIdOverride?: ThreadId) => {
      const tid =
        threadIdOverride ?? activeThreadIdRef.current;

      const latestCards = loadCards(defaultCards);
      const enabledCards = latestCards.filter(
        (card) => card.enabled
      );
      if (enabledCards.length === 0) return;

      setGeneratingCount((prev) => prev + 1);

      try {
        await sleep(randomInteger(1000, 4000));

        /* 来电只在群聊触发 */
        if (
          tid === "group" &&
          !activeCall &&
          Math.random() < 0.15
        ) {
          triggerIncomingCall();
          return;
        }

        /* 世界事件引用只在群聊 */
        if (tid === "group") {
          const quoteChance =
            settingsRef.current.chatWorldQuoteChance ??
            0.3;
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

            const picked =
              pickCardWithRules(latestCards);
            const text =
              picked?.card.text?.trim() ||
              "刚才看到你发的了。";

            addMessage(
              {
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
              },
              { threadId: "group" }
            );
            return;
          }
        }

        const picked = pickCardForThread(
          latestCards,
          tid
        );
        if (!picked) return;

        await createReplyFromPicked(
          picked,
          tid,
          latestCards
        );
      } finally {
        setGeneratingCount((prev) =>
          Math.max(0, prev - 1)
        );
      }
    },
    [
      activeCall,
      addMessage,
      createReplyFromPicked,
      triggerIncomingCall,
    ]
  );

  /* ---------- 通话开始时清空生成状态 ---------- */
  useEffect(() => {
    if (activeCall) {
      setGeneratingCount(0);
    }
  }, [activeCall]);

  /* ---------- 后台自动回复计时器（3 个 thread 各一个） ---------- */

  const cfgReply = settings.chatReply;

  useAutoReplyTimer(
    "group",
    threads.group.length,
    autoReplyEnabled,
    !!activeCall,
    cfgReply?.autoReplyMin,
    cfgReply?.autoReplyMax,
    generateAutoReply
  );

  useAutoReplyTimer(
    "levi",
    threads.levi.length,
    autoReplyEnabled,
    !!activeCall,
    cfgReply?.singleAutoReplyMin ?? 5,
    cfgReply?.singleAutoReplyMax ?? 30,
    generateAutoReply
  );

  useAutoReplyTimer(
    "erwin",
    threads.erwin.length,
    autoReplyEnabled,
    !!activeCall,
    cfgReply?.singleAutoReplyMin ?? 5,
    cfgReply?.singleAutoReplyMax ?? 30,     
    generateAutoReply
  );

  /* ---------- 用户发消息后的快速回复（当前 thread） ---------- */

  const scheduleAutoReplyAfterUserMessage =
    useCallback(() => {
      const cfg = settingsRef.current.chatReply;
      const minMs =
        (cfg?.userReplyDelayMin ?? 2) * 1000;
      const maxMs =
        (cfg?.userReplyDelayMax ?? 8) * 1000;

      const delay = randomInteger(minMs, maxMs);
      const tid = activeThreadIdRef.current;

      window.setTimeout(() => {
        void generateAutoReply(tid);
      }, delay);
    }, [generateAutoReply]);
      /* ---------- 消息转发 ---------- */

  const forwardMessages = useCallback(
    (
      targetThreadId: ThreadId,
      items: ForwardItem[],
      fromThreadId: ThreadId
    ) => {
      if (items.length === 0) return;
      const msg: ChatMessage = {
        id: createMessageId(),
        sender: "You",
        type: "forward",
        timestamp: Date.now(),
        forwardItems: items,
        forwardFrom: fromThreadId,
      };
      addMessage(msg, { threadId: targetThreadId });
    },
    [addMessage]
  );

  /* ---------- 会话列表用的「最后一条消息」 ---------- */

  const threadLastMessages = useMemo(() => {
    const result: Record<
      ThreadId,
      ChatMessage | null
    > = {
      group: null,
      levi: null,
      erwin: null,
    };
    for (const tid of THREAD_IDS) {
      const list = threads[tid];
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        if (!m.deleted) {
          result[tid] = m;
          break;
        }
      }
    }
    return result;
  }, [threads]);

  /* ---------- 切换 active thread ---------- */

  const setActiveThreadId = useCallback(
    (id: ThreadId) => {
      setActiveThreadIdState(id);
      activeThreadIdRef.current = id;
    },
    []
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        generatingCount,
        autoReplyEnabled,
        activeThreadId,
        setActiveThreadId,
        threadLastMessages,
        addMessage,
        updateMessages: (updater) =>
          setThreads((prev) => {
            const tid = activeThreadIdRef.current;
            return {
              ...prev,
              [tid]: updater(prev[tid]),
            };
          }),
        generateResponse,
        generateAutoReply,
        setAutoReplyEnabled,
        scheduleAutoReplyAfterUserMessage,
        forwardMessages,
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