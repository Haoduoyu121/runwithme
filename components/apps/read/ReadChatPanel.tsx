"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Send, Settings, X } from "lucide-react";

import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import ReadChatCardStudio from "./ReadChatCardStudio";

import {
  addReadChatMessage,
  createReadChatMessageId,
  loadReadChat,
  type ReadChatMessage,
  type ReadChatSender,
} from "@/lib/readChatStorage";

import {
  pickReadChatCard,
  type ReadChatCardCharacter,
} from "@/lib/readChatCards";

type ReadChatPanelProps = {
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  pageIndex: number;
  partners: ("levi" | "erwin")[];
  onClose: () => void;
};

/* ★ 缩短延迟，用户能立刻看到回复 */
const REPLY_MIN_MS = 2000;
const REPLY_MAX_MS = 6000;
const TYPING_MIN_MS = 700;
const TYPING_MAX_MS = 1500;

const PROACTIVE_MIN_MS = 45000;
const PROACTIVE_MAX_MS = 90000;
const PROACTIVE_CHANCE = 0.4;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function partnerToSender(
  p: "levi" | "erwin"
): "Levi" | "Erwin" {
  return p === "levi" ? "Levi" : "Erwin";
}

function partnerToCard(
  p: "levi" | "erwin"
): ReadChatCardCharacter {
  return p === "levi" ? "Levi" : "Erwin";
}

export default function ReadChatPanel({
  bookId,
  bookTitle,
  chapterIndex,
  pageIndex,
  partners,
  onClose,
}: ReadChatPanelProps) {
  const avatars = useCharacterAvatars();

  const [messages, setMessages] = useState<
    ReadChatMessage[]
  >([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState<
    "Levi" | "Erwin" | null
  >(null);
  const [showCardStudio, setShowCardStudio] =
    useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const replyTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const proactiveTimerRef = useRef<number | null>(null);

  /* ★ 用 ref 保存最新的 messages，供闭包读取 */
  const messagesRef = useRef<ReadChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* ★ 用 ref 保存 partners，避免闭包过期 */
  const partnersRef = useRef(partners);
  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);

  /* ---------- 初始加载 ---------- */

  useEffect(() => {
    const loaded = loadReadChat(bookId);
    messagesRef.current = loaded;
    setMessages(loaded);
  }, [bookId]);

  /* ---------- 自动滚到底 ---------- */

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, typing]);

  /* ---------- 卸载清理 ---------- */

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
      if (proactiveTimerRef.current !== null) {
        window.clearTimeout(proactiveTimerRef.current);
      }
    };
  }, []);

  /* ---------- 主动发消息 ---------- */

  useEffect(() => {
    if (partners.length === 0) return;

    let stopped = false;

    function scheduleNext() {
      if (stopped) return;
      const delay = randomInt(
        PROACTIVE_MIN_MS,
        PROACTIVE_MAX_MS
      );
      proactiveTimerRef.current = window.setTimeout(() => {
        if (stopped) return;
        if (Math.random() < PROACTIVE_CHANCE) {
          const list = partnersRef.current;
          if (list.length > 0) {
            const partner =
              list[Math.floor(Math.random() * list.length)];
            dropMessage(partnerToSender(partner));
          }
        }
        scheduleNext();
      }, delay);
    }

    scheduleNext();

    return () => {
      stopped = true;
      if (proactiveTimerRef.current !== null) {
        window.clearTimeout(proactiveTimerRef.current);
        proactiveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, partners.join(",")]);

  /* ---------- 工具 ---------- */

  const dropMessage = useCallback(
    (sender: ReadChatSender) => {
      // 用 ref 拿到最新 messages，避免闭包陷阱
      const recent = messagesRef.current
        .slice(-6)
        .map((m) => m.text);

      const partnerCards = partnersRef.current.map(
        partnerToCard
      );

      const card = pickReadChatCard(
        partnerCards,
        sender === "You" ? [] : recent
      );

      if (!card) {
        console.warn(
          "[ReadChat] 无法从卡池取到卡片，partners:",
          partnerCards
        );
        return;
      }

      const msg: ReadChatMessage = {
        id: createReadChatMessageId(),
        bookId,
        sender,
        text: card.text,
        timestamp: Date.now(),
        chapterIndex,
        pageIndex,
      };

      const next = addReadChatMessage(msg);
      messagesRef.current = next;
      setMessages(next);
    },
    [bookId, chapterIndex, pageIndex]
  );

  const scheduleReply = useCallback(() => {
    const list = partnersRef.current;
    if (list.length === 0) return;

    const partner =
      list[Math.floor(Math.random() * list.length)];
    const sender = partnerToSender(partner);

    const delay = randomInt(REPLY_MIN_MS, REPLY_MAX_MS);

    replyTimerRef.current = window.setTimeout(() => {
      setTyping(sender);

      const typeDelay = randomInt(
        TYPING_MIN_MS,
        TYPING_MAX_MS
      );
      typingTimerRef.current = window.setTimeout(() => {
        setTyping(null);
        dropMessage(sender);
      }, typeDelay);
    }, delay);
  }, [dropMessage]);

  /* ---------- 用户发送 ---------- */

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    const msg: ReadChatMessage = {
      id: createReadChatMessageId(),
      bookId,
      sender: "You",
      text,
      timestamp: Date.now(),
      chapterIndex,
      pageIndex,
    };

    const next = addReadChatMessage(msg);
    messagesRef.current = next;
    setMessages(next);
    setInput("");
    scheduleReply();
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function avatarFor(sender: ReadChatSender): string | null {
    if (sender === "You") return avatars.you;
    if (sender === "Levi") return avatars.levi;
    if (sender === "Erwin") return avatars.erwin;
    return null;
  }

  function senderClass(sender: ReadChatSender): string {
    if (sender === "You") return "you";
    if (sender === "Levi") return "levi";
    return "erwin";
  }

  const groups = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const isFirst =
        !prev ||
        prev.sender !== m.sender ||
        m.timestamp - prev.timestamp > 3 * 60 * 1000;
      return { msg: m, isFirst };
    });
  }, [messages]);

  return (
    <div
      className="read-chat-backdrop"
      onClick={onClose}
    >
      <div
        className="read-chat-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="read-chat-header">
          <div className="read-chat-header-info">
            <div className="read-chat-header-title">
              一起读
            </div>
            <div className="read-chat-header-loc">
              当前：第 {chapterIndex + 1} 章 · 第{" "}
              {pageIndex + 1} 页
            </div>
          </div>
          <button
            className="read-chat-settings"
            onClick={() => setShowCardStudio(true)}
            aria-label="卡池设置"
          >
            <Settings size={15} strokeWidth={2.2} />
          </button>
          <button
            className="read-chat-close"
            onClick={onClose}
            aria-label="收起"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="read-chat-list" ref={listRef}>
          {messages.length === 0 && (
            <div className="read-chat-empty">
              和{" "}
              {partners
                .map((p) =>
                  p === "levi" ? "Levi" : "Erwin"
                )
                .join(" & ")}{" "}
              一起读《{bookTitle}》
            </div>
          )}

          {groups.map(({ msg, isFirst }) => (
            <div
              key={msg.id}
              className={
                msg.sender === "You"
                  ? "read-chat-row is-you"
                  : "read-chat-row is-other"
              }
            >
              {msg.sender !== "You" && isFirst && (
                <div
                  className={`read-chat-avatar read-chat-avatar-${senderClass(
                    msg.sender
                  )}${
                    avatarFor(msg.sender)
                      ? " has-image"
                      : ""
                  }`}
                >
                  {avatarFor(msg.sender) ? (
                    <img
                      src={avatarFor(msg.sender)!}
                      alt={msg.sender}
                    />
                  ) : (
                    <span>
                      {msg.sender === "Levi" ? "L" : "E"}
                    </span>
                  )}
                </div>
              )}
              {msg.sender !== "You" && !isFirst && (
                <div className="read-chat-avatar-placeholder" />
              )}
              <div className="read-chat-bubble-wrap">
                {isFirst && msg.sender !== "You" && (
                  <div className="read-chat-name">
                    {msg.sender}
                  </div>
                )}
                <div className="read-chat-bubble">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}

          {typing && (
            <div className="read-chat-row is-other">
              <div
                className={`read-chat-avatar read-chat-avatar-${senderClass(
                  typing
                )}${
                  avatarFor(typing) ? " has-image" : ""
                }`}
              >
                {avatarFor(typing) ? (
                  <img
                    src={avatarFor(typing)!}
                    alt={typing}
                  />
                ) : (
                  <span>
                    {typing === "Levi" ? "L" : "E"}
                  </span>
                )}
              </div>
              <div className="read-chat-bubble-wrap">
                <div className="read-chat-bubble read-chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="read-chat-composer">
          <input
            className="read-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="说点什么…"
          />
          <button
            className="read-chat-send"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="发送"
          >
            <Send size={16} strokeWidth={2.4} />
          </button>
        </div>

        {showCardStudio && (
          <ReadChatCardStudio
            onClose={() => setShowCardStudio(false)}
          />
        )}
      </div>
    </div>
  );
}