"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import {
  loadConfig,
  streamChat,
  type ChatMessage,
} from "@/lib/ai/apiClient";

type Card = {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  system_prompt: string;
};

const DEMO_CARD: Card = {
  id: "__demo__",
  name: "试用角色",
  description: "一个安静、观察力强的角色。说话简短，喜欢反问。",
  personality: "冷静、敏锐、不多话",
  scenario: "你在一间旧书店遇见了他。",
  first_mes:
    "他坐在窗边，手里翻着一本旧书。看到你，只是抬了抬眼：「来了。」",
  mes_example: "",
  system_prompt:
    "你是一个沉浸式角色扮演引擎。严格保持角色语气，用中文回答。不要跳出角色，不要解释。回复长度适中，有画面感。",
};

function buildSystemPrompt(card: Card): string {
  const parts = [card.system_prompt];
  if (card.description) parts.push(`[角色描述]\n${card.description}`);
  if (card.personality) parts.push(`[性格]\n${card.personality}`);
  if (card.scenario) parts.push(`[场景]\n${card.scenario}`);
  if (card.mes_example) parts.push(`[示例对话]\n${card.mes_example}`);
  return parts.filter(Boolean).join("\n\n");
}

export default function ChatView({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef(false);

  /* 加载角色卡 */
  useEffect(() => {
    if (cardId === "__demo__") {
      setCard(DEMO_CARD);
      setMessages([
        { role: "assistant", content: DEMO_CARD.first_mes },
      ]);
      return;
    }
    /* 真实卡片（下一批接） */
    setCard(null);
    setErr("真实角色卡下一批接入。先用「试用角色」。");
  }, [cardId]);

  /* 自动滚到底 */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function send() {
    if (!card || !input.trim() || streaming) return;
    const cfg = loadConfig();
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
      setErr("请先到 /ai/settings 配置 API");
      return;
    }
    setErr("");
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    /* 拼请求：system + 历史 + 新一轮 */
    const sys: ChatMessage = {
      role: "system",
      content: buildSystemPrompt(card),
    };
    const payload = [sys, ...next];

    /* 先占位一条空 assistant */
    setMessages([...next, { role: "assistant", content: "" }]);
    abortRef.current = false;

    try {
      let acc = "";
      for await (const chunk of streamChat(cfg, payload)) {
        if (abortRef.current) break;
        acc += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: acc,
          };
          return copy;
        });
      }
    } catch (e) {
      setErr(
        "请求失败：" +
          (e instanceof Error ? e.message : String(e))
      );
      /* 删掉空占位 */
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!card) {
    return (
      <div className="ai-home">
        <div className="ai-empty">{err || "加载中…"}</div>
      </div>
    );
  }

  return (
    <div className="ai-chat-view">
      <div className="ai-chat-messages" ref={scrollRef}>
        <div className="ai-chat-card-head">
          <div className="ai-chat-card-name">{card.name}</div>
          <div className="ai-chat-card-scenario">
            {card.scenario}
          </div>
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ai-msg ai-msg-user"
                : "ai-msg ai-msg-assistant"
            }
          >
            <div className="ai-msg-content">
              {m.content || (
                <span className="ai-msg-typing">
                  <Sparkles size={13} strokeWidth={2} />{" "}
                  正在思考…
                </span>
              )}
            </div>
          </div>
        ))}

        {err && <div className="ai-chat-error">{err}</div>}
      </div>

      <div className="ai-chat-input-bar">
        <input
          className="ai-input"
          placeholder="说点什么…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={streaming}
        />
        <button
          className="ai-btn primary ai-chat-send"
          onClick={() => void send()}
          disabled={streaming || !input.trim()}
          aria-label="发送"
        >
          <Send size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}