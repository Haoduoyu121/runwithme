"use client";

import { useEffect, useRef, useState } from "react";

import { createMessageId } from "@/data/chat";

import type { MusicChatMessage } from "@/lib/musicChatStorage";
import { generateMusicReply } from "@/lib/musicChatReply";

type MusicChatPanelProps = {
  messages: MusicChatMessage[];
  onAddMessage: (msg: MusicChatMessage) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  partnerName: string;
  disabled: boolean;
};

const USER_REPLY_MIN_MS = 20 * 1000;
const USER_REPLY_MAX_MS = 60 * 1000;

export default function MusicChatPanel({
  messages,
  onAddMessage,
  onClose,
  onOpenSettings,
  partnerName,
  disabled,
}: MusicChatPanelProps) {
  const [input, setInput] = useState("");
  const [waitingReply, setWaitingReply] = useState(false);
  const [pendingTimer, setPendingTimer] =
    useState<number | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length, waitingReply]);

  useEffect(() => {
    return () => {
      if (pendingTimer) {
        window.clearTimeout(pendingTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || disabled) return;

    onAddMessage({
      id: createMessageId(),
      sender: "You",
      type: "text",
      text,
      timestamp: Date.now(),
    });
    setInput("");
    setWaitingReply(true);

    const delay =
      USER_REPLY_MIN_MS +
      Math.random() * (USER_REPLY_MAX_MS - USER_REPLY_MIN_MS);

    const timer = window.setTimeout(() => {
      const reply = generateMusicReply();
      if (reply) {
        onAddMessage({
          id: createMessageId(),
          sender: reply.sender,
          type: "text",
          text: reply.text,
          timestamp: Date.now(),
        });
      }
      setWaitingReply(false);
      setPendingTimer(null);
    }, delay);

    setPendingTimer(timer);
  }

  return (
    <div className="music-chat-panel">
      <div className="music-chat-header">
        <div className="music-chat-title">
          一起听 · {partnerName}
        </div>

        <button
          className="music-chat-icon-btn"
          onClick={onOpenSettings}
          title="卡片设置"
          aria-label="卡片设置"
        >
          ⚙
        </button>

        <button
          className="music-chat-icon-btn"
          onClick={onClose}
          title="关闭"
          aria-label="关闭"
        >
          ×
        </button>
      </div>

      {disabled ? (
        <div className="music-chat-disabled">
          先邀请一个人一起听吧
        </div>
      ) : (
        <>
          <div className="music-chat-messages">
            {messages.length === 0 ? (
              <div className="music-chat-empty">
                还没有消息，聊点什么吧
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`music-chat-msg music-chat-msg-${
                    m.sender === "You" ? "you" : "other"
                  }`}
                >
                  {m.sender !== "You" && (
                    <div className="music-chat-msg-name">
                      {m.sender}
                    </div>
                  )}
                  <div className="music-chat-msg-bubble">
                    {m.text}
                  </div>
                </div>
              ))
            )}

            {waitingReply && (
              <div className="music-chat-msg music-chat-msg-other">
                <div className="music-chat-msg-bubble music-chat-msg-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div className="music-chat-input-row">
            <input
              className="music-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="聊点什么…"
              maxLength={200}
            />
            <button
              className="music-chat-send"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="发送"
            >
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  );
}