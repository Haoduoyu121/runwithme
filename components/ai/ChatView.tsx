"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  MoreHorizontal,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import {
  loadConfig,
  streamChat,
  type ChatMessage,
} from "@/lib/ai/apiClient";
import {
  loadChat,
  saveChat,
  deleteChat,
  type StoredMessage,
} from "@/lib/ai/chatStore";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

type Card = {
  id: string;
  name: string;
  avatar?: string;
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
  const parts: string[] = [];
  if (card.system_prompt)
    parts.push(card.system_prompt);
  else
    parts.push(
      "你是一个沉浸式角色扮演引擎。严格保持角色语气，用中文回答。不要跳出角色，不要解释。回复长度适中，有画面感。"
    );
  if (card.description)
    parts.push(`[角色描述]\n${card.description}`);
  if (card.personality)
    parts.push(`[性格]\n${card.personality}`);
  if (card.scenario) parts.push(`[场景]\n${card.scenario}`);
  if (card.mes_example)
    parts.push(`[示例对话]\n${card.mes_example}`);
  return parts.filter(Boolean).join("\n\n");
}

export default function ChatView({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(
    null
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(
    null
  );
  const [editDraft, setEditDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  /* ---------- 加载卡片 + 历史 ---------- */

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setMessages([]);
    setErr("");

    (async () => {
      let c: Card | null = null;

      if (cardId === "__demo__") {
        c = DEMO_CARD;
      } else if (cardId) {
        try {
          const r = await fetch(`${API_BASE}/api/ai/cards`);
          const data = await r.json();
          const found = (data.cards || []).find(
            (x: { id: string }) => x.id === cardId
          );
          if (found) {
            const p = found.payload || {};
            c = {
              id: found.id,
              name: found.name,
              avatar: found.avatar || undefined,
              description: p.description || "",
              personality: p.personality || "",
              scenario: p.scenario || "",
              first_mes: p.first_mes || "",
              mes_example: p.mes_example || "",
              system_prompt: p.system_prompt || "",
            };
          }
        } catch {
          /* ignore */
        }
      }

      if (cancelled) return;
      setCard(c);

      if (!c) {
        setErr("找不到这张角色卡");
        setLoaded(true);
        return;
      }

      const stored = await loadChat(cardId);
      if (cancelled) return;
      if (stored.length > 0) {
        setMessages(stored);
      } else if (c.first_mes) {
        setMessages([
          { role: "assistant", content: c.first_mes },
        ]);
      } else {
        setMessages([]);
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  /* ---------- 保存 ---------- */

  useEffect(() => {
    if (!loaded) return;
    if (streaming) return;
    if (messages.length === 0) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void saveChat(cardId, messages);
    }, 400);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [messages, streaming, loaded, cardId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    function onClick() {
      setOpenMenuIdx(null);
    }
    if (openMenuIdx !== null) {
      window.addEventListener("click", onClick);
      return () =>
        window.removeEventListener("click", onClick);
    }
  }, [openMenuIdx]);

  /* ---------- 流式 ---------- */

  async function runStream(
    history: StoredMessage[],
    cardOverride?: Card
  ) {
    const c = cardOverride || card;
    if (!c) return;
    const cfg = loadConfig();
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
      setErr("请先到 /ai/settings 配置 API");
      return;
    }
    setErr("");
    setStreaming(true);
    abortRef.current = false;

    const sys: ChatMessage = {
      role: "system",
      content: buildSystemPrompt(c),
    };
    const payload = [sys, ...history];

    setMessages([
      ...history,
      { role: "assistant", content: "" },
    ]);

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
      if (!acc) {
        setMessages(history);
        setErr("AI 返回了空内容，请重试。");
      }
    } catch (e) {
      setErr(
        "请求失败：" +
          (e instanceof Error ? e.message : String(e))
      );
      setMessages(history);
    } finally {
      setStreaming(false);
    }
  }

  async function send() {
    if (!card || !input.trim() || streaming) return;
    const userMsg: StoredMessage = {
      role: "user",
      content: input.trim(),
    };
    const next = [...messages, userMsg];
    setInput("");
    setOpenMenuIdx(null);
    await runStream(next);
  }

  async function regenerate() {
    if (!card || streaming) return;
    let lastA = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastA = i;
        break;
      }
    }
    if (lastA < 0) return;
    const trimmed = messages.slice(0, lastA);
    setOpenMenuIdx(null);
    await runStream(trimmed);
  }

  function startEdit(i: number) {
    setEditingIdx(i);
    setEditDraft(messages[i].content);
    setOpenMenuIdx(null);
  }

  function commitEdit() {
    if (editingIdx === null) return;
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditingIdx(null);
      return;
    }
    setMessages((prev) => {
      const copy = [...prev];
      copy[editingIdx] = {
        ...copy[editingIdx],
        content: trimmed,
      };
      return copy;
    });
    setEditingIdx(null);
  }

  function deleteMsg(i: number) {
    if (!window.confirm("删除这条消息？")) return;
    setMessages((prev) =>
      prev.filter((_, idx) => idx !== i)
    );
    setOpenMenuIdx(null);
  }

  async function clearAll() {
    if (
      !window.confirm(
        "清空这个角色的所有对话？\n\n此操作不可撤销。"
      )
    )
      return;
    await deleteChat(cardId);
    if (card) {
      setMessages(
        card.first_mes
          ? [{ role: "assistant", content: card.first_mes }]
          : []
      );
    }
  }

  /* ---------- 渲染 ---------- */

  if (!card) {
    return (
      <div className="ai-home">
        <div className="ai-empty">
          {err || (loaded ? "未找到角色卡" : "加载中…")}
        </div>
      </div>
    );
  }

  const isLastAssistant = (i: number) => {
    for (let j = messages.length - 1; j >= 0; j--) {
      if (messages[j].role === "assistant") return j === i;
    }
    return false;
  };

  return (
    <div className="ai-chat-view">
      <div className="ai-chat-messages" ref={scrollRef}>
        <div className="ai-chat-card-head">
          {card.avatar && (
            <div
              className="ai-chat-card-avatar"
              style={{
                background: `url(${card.avatar}) center/cover`,
              }}
            />
          )}
          <div className="ai-chat-card-name">{card.name}</div>
          {card.scenario && (
            <div className="ai-chat-card-scenario">
              {card.scenario}
            </div>
          )}
          <button
            className="ai-chat-clear"
            onClick={clearAll}
            disabled={streaming}
          >
            清空对话
          </button>
        </div>

        {messages.map((m, i) => {
          if (m.role === "system") return null;
          const isUser = m.role === "user";
          const isEditing = editingIdx === i;

          return (
            <div
              key={i}
              className={
                isUser
                  ? "ai-msg ai-msg-user"
                  : "ai-msg ai-msg-assistant"
              }
            >
              <div className="ai-msg-content">
                {isEditing ? (
                  <div className="ai-msg-edit">
                    <textarea
                      className="ai-input ai-msg-edit-textarea"
                      value={editDraft}
                      onChange={(e) =>
                        setEditDraft(e.target.value)
                      }
                      rows={4}
                      autoFocus
                    />
                    <div className="ai-msg-edit-actions">
                      <button
                        className="ai-btn"
                        style={{
                          height: 32,
                          padding: "0 12px",
                          fontSize: 12,
                        }}
                        onClick={() => setEditingIdx(null)}
                      >
                        <X
                          size={12}
                          strokeWidth={2.4}
                          style={{
                            verticalAlign: "-2px",
                            marginRight: 4,
                          }}
                        />
                        取消
                      </button>
                      <button
                        className="ai-btn primary"
                        style={{
                          height: 32,
                          padding: "0 12px",
                          fontSize: 12,
                        }}
                        onClick={commitEdit}
                      >
                        <Check
                          size={12}
                          strokeWidth={2.4}
                          style={{
                            verticalAlign: "-2px",
                            marginRight: 4,
                          }}
                        />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="ai-msg-text">
                      {m.content || (
                        <span className="ai-msg-typing">
                          <Sparkles
                            size={13}
                            strokeWidth={2}
                          />{" "}
                          正在思考…
                        </span>
                      )}
                    </div>

                    {!streaming && m.content && (
                      <button
                        className="ai-msg-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuIdx(
                            openMenuIdx === i ? null : i
                          );
                        }}
                        aria-label="操作"
                      >
                        <MoreHorizontal
                          size={14}
                          strokeWidth={2.2}
                        />
                      </button>
                    )}

                    {openMenuIdx === i && (
                      <div
                        className="ai-msg-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isUser && isLastAssistant(i) && (
                          <button
                            className="ai-msg-menu-item"
                            onClick={regenerate}
                          >
                            <RefreshCw
                              size={12}
                              strokeWidth={2.2}
                            />
                            重新生成
                          </button>
                        )}
                        <button
                          className="ai-msg-menu-item"
                          onClick={() => startEdit(i)}
                        >
                          <Pencil
                            size={12}
                            strokeWidth={2.2}
                          />
                          编辑
                        </button>
                        <button
                          className="ai-msg-menu-item ai-msg-menu-danger"
                          onClick={() => deleteMsg(i)}
                        >
                          <Trash2
                            size={12}
                            strokeWidth={2.2}
                          />
                          删除
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

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