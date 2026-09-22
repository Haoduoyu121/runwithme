"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  MoreHorizontal,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Check,
  BookmarkPlus,
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
  createMessage,
  newHighlightId,
  type StoredMessage,
} from "@/lib/ai/chatStore";
import {
  HighlightActionMenu,
  HighlightNoteEditor,
} from "@/components/apps/read/HighlightOverlays";
import { useCollection } from "@/lib/CollectionContext";
import WorldbookPanel from "./WorldbookPanel";
import PresetPanel from "./PresetPanel";
import {
  loadWorldbooks,
  flattenBooks,
  collectTriggered,
  formatEntries,
  type Worldbook,
  type WorldbookEntry,
  type TriggeredByPos,
} from "@/lib/ai/worldbook";
import {
  loadPresets,
  getActivePresetId,
  applyTemplate,
  buildPresetSystemPrompt,
  pickApiParams,
  type AiPreset,
} from "@/lib/ai/presets";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://api.yulewin.cn";

const GLOBAL_WB_ID = "__global__";

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

const DEFAULT_SYS =
  "你是一个沉浸式角色扮演引擎。严格保持角色语气，用中文回答。不要跳出角色，不要解释。回复长度适中，有画面感。";

function buildSystemPrompt(
  card: Card,
  preset: AiPreset | null,
  wb: TriggeredByPos
): string {
  const vars = { char: card.name, user: "你" };
  const parts: string[] = [];

  /* 预设主提示（按所有启用 prompt 顺序拼接） */
  const presetBlock = preset
    ? buildPresetSystemPrompt(preset, vars)
    : "";
  if (presetBlock) parts.push(presetBlock);
  else if (card.system_prompt) parts.push(card.system_prompt);
  else parts.push(DEFAULT_SYS);

  /* 位置 0：角色描述前 */
  const wbBeforeChar = formatEntries(wb.beforeChar);
  if (wbBeforeChar) parts.push(wbBeforeChar);

  if (card.description)
    parts.push(`[角色描述]\n${card.description}`);

  /* 位置 1：角色描述后 */
  const wbAfterChar = formatEntries(wb.afterChar);
  if (wbAfterChar) parts.push(wbAfterChar);

  if (card.personality)
    parts.push(`[性格]\n${card.personality}`);
  if (card.scenario) parts.push(`[场景]\n${card.scenario}`);

  /* 位置 2：作者注前 */
  const wbBeforeAn = formatEntries(wb.beforeAn);
  if (wbBeforeAn) parts.push(wbBeforeAn);

  if (preset?.post_history)
    parts.push(applyTemplate(preset.post_history, vars));

  /* 位置 3：作者注后 */
  const wbAfterAn = formatEntries(wb.afterAn);
  if (wbAfterAn) parts.push(wbAfterAn);

  /* 位置 5：示例对话前 */
  const wbBeforeEm = formatEntries(wb.beforeEm);
  if (wbBeforeEm) parts.push(wbBeforeEm);

  if (card.mes_example)
    parts.push(`[示例对话]\n${card.mes_example}`);

  /* 位置 6：示例对话后 */
  const wbAfterEm = formatEntries(wb.afterEm);
  if (wbAfterEm) parts.push(wbAfterEm);

  return parts.filter(Boolean).join("\n\n");
}

function textOffsetIn(
  root: HTMLElement,
  node: Node,
  offsetInNode: number
): number {
  let total = 0;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur === node) return total + offsetInNode;
    total += cur.textContent?.length ?? 0;
    cur = walker.nextNode();
  }
  return -1;
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

  const [selection, setSelection] = useState<{
    msgIndex: number;
    rect: DOMRect;
    start: number;
    end: number;
    text: string;
  } | null>(null);

  const [editingNote, setEditingNote] = useState<{
    msgIndex: number;
    hlId: string | null;
    quote: string;
    initial: string;
  } | null>(null);

  const [activeHl, setActiveHl] = useState<{
    msgIndex: number;
    hlId: string;
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  /* 世界书：全局 + 卡片（多本） */
  const [showWorldbook, setShowWorldbook] = useState(false);
  const [globalBooks, setGlobalBooks] = useState<Worldbook[]>([]);
  const [cardBooks, setCardBooks] = useState<Worldbook[]>([]);

  /* 预设 */
  const [showPreset, setShowPreset] = useState(false);
  const [preset, setPreset] = useState<AiPreset | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const { add: addToCollection } = useCollection();

  const worldbook = useMemo(
    () => [
      ...flattenBooks(globalBooks),
      ...flattenBooks(cardBooks),
    ],
    [globalBooks, cardBooks]
  );

  function refreshPreset() {
    const list = loadPresets();
    const id = getActivePresetId();
    setPreset(list.find((p) => p.id === id) || null);
  }

  async function refreshWorldbook() {
    try {
      const [g, c] = await Promise.all([
        loadWorldbooks(GLOBAL_WB_ID),
        cardId !== GLOBAL_WB_ID
          ? loadWorldbooks(cardId)
          : Promise.resolve([] as Worldbook[]),
      ]);
      setGlobalBooks(g);
      setCardBooks(c);
    } catch {
      /* ignore */
    }
  }

  /* ---------- 加载 ---------- */

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

      await refreshWorldbook();
      if (cancelled) return;

      const stored = await loadChat(cardId);
      if (cancelled) return;
      if (stored.length > 0) {
        setMessages(stored);
      } else if (c.first_mes) {
        setMessages([
          createMessage("assistant", c.first_mes),
        ]);
      }
      setLoaded(true);
      refreshPreset();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ---------- 选区检测 ---------- */

  useEffect(() => {
    function check() {
      window.setTimeout(checkSelection, 50);
    }
    document.addEventListener("pointerup", check);
    document.addEventListener("touchend", check);
    return () => {
      document.removeEventListener("pointerup", check);
      document.removeEventListener("touchend", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  function checkSelection() {
    const ae = document.activeElement as HTMLElement | null;
    if (
      ae &&
      (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")
    )
      return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);

    let node: Node | null = range.commonAncestorContainer;
    let host: HTMLElement | null = null;
    while (node) {
      if (
        node instanceof HTMLElement &&
        node.dataset &&
        node.dataset.msgId
      ) {
        host = node;
        break;
      }
      node = node.parentNode;
    }
    if (!host) {
      setSelection(null);
      return;
    }

    const msgId = host.dataset.msgId!;
    const msgIndex = messages.findIndex(
      (m) => m.id === msgId
    );
    if (msgIndex < 0) {
      setSelection(null);
      return;
    }

    const start = textOffsetIn(
      host,
      range.startContainer,
      range.startOffset
    );
    const end = textOffsetIn(
      host,
      range.endContainer,
      range.endOffset
    );
    if (start < 0 || end <= start) {
      setSelection(null);
      return;
    }
    const text = messages[msgIndex].content.slice(start, end);
    if (!text.trim()) {
      setSelection(null);
      return;
    }

    setSelection({
      msgIndex,
      rect: range.getBoundingClientRect(),
      start,
      end,
      text,
    });
  }

  function closeSelection() {
    setSelection(null);
    const s = window.getSelection();
    if (s) s.removeAllRanges();
  }

  function handleCreateHighlight() {
    if (!selection) return;
    const { msgIndex, start, end, text } = selection;
    setMessages((prev) => {
      const copy = [...prev];
      const m = { ...copy[msgIndex] };
      m.highlights = [
        ...(m.highlights || []),
        {
          id: newHighlightId(),
          start,
          end,
          text,
          kind: "highlight" as const,
          createdAt: Date.now(),
        },
      ];
      copy[msgIndex] = m;
      return copy;
    });
    closeSelection();
  }

  function handleCreateNote() {
    if (!selection) return;
    const { msgIndex, start, end, text } = selection;
    const id = newHighlightId();
    setMessages((prev) => {
      const copy = [...prev];
      const m = { ...copy[msgIndex] };
      m.highlights = [
        ...(m.highlights || []),
        {
          id,
          start,
          end,
          text,
          kind: "note" as const,
          note: "",
          createdAt: Date.now(),
        },
      ];
      copy[msgIndex] = m;
      return copy;
    });
    setEditingNote({
      msgIndex,
      hlId: id,
      quote: text,
      initial: "",
    });
    closeSelection();
  }

  function handleSaveNote(text: string) {
    if (!editingNote) return;
    const trimmed = text.trim();
    setMessages((prev) => {
      const copy = [...prev];
      const m = { ...copy[editingNote.msgIndex] };
      if (!trimmed) {
        m.highlights = (m.highlights || []).filter(
          (h) => h.id !== editingNote.hlId
        );
      } else {
        m.highlights = (m.highlights || []).map((h) =>
          h.id === editingNote.hlId
            ? { ...h, note: trimmed, kind: "note" as const }
            : h
        );
      }
      copy[editingNote.msgIndex] = m;
      return copy;
    });
    setEditingNote(null);
  }

  function handleDeleteHighlight() {
    if (!activeHl) return;
    setMessages((prev) => {
      const copy = [...prev];
      const m = { ...copy[activeHl.msgIndex] };
      m.highlights = (m.highlights || []).filter(
        (h) => h.id !== activeHl.hlId
      );
      copy[activeHl.msgIndex] = m;
      return copy;
    });
    setActiveHl(null);
  }

  function handleCollect() {
    if (!activeHl || !card) return;
    const m = messages[activeHl.msgIndex];
    const h = (m?.highlights || []).find(
      (x) => x.id === activeHl.hlId
    );
    if (!h) return;

    addToCollection({
      owner: "levi",
      source: "read",
      sourceId: `ai:${cardId}:${h.id}`,
      content: h.text,
      note: h.note || "",
      sender: null,
      originalAt: h.createdAt,
      meta: {
        from: "ai",
        cardId,
        cardName: card.name,
        msgIndex: activeHl.msgIndex,
      },
    });

    setToast("已收藏到 Collection");
    window.setTimeout(() => setToast(null), 2400);
    setActiveHl(null);
  }

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

    const triggered = collectTriggered(worldbook, history);
    const sysContent = buildSystemPrompt(c, preset, triggered);

    const sys: ChatMessage = {
      role: "system",
      content: sysContent,
    };

    const historyMsgs: ChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    /* 位置 4（@深度）：合成一条 system 插到 history 里 */
    const atDepthText = formatEntries(triggered.atDepth);
    if (atDepthText) {
      const minDepth = Math.min(
        ...triggered.atDepth.map((e) => e.depth)
      );
      const insertAt = Math.max(
        0,
        historyMsgs.length - 1 - minDepth
      );
      historyMsgs.splice(insertAt, 0, {
        role: "system",
        content: atDepthText,
      });
    }

    const payload: ChatMessage[] = [sys, ...historyMsgs];

    const params = pickApiParams(preset);

    const placeholder = createMessage("assistant", "");
    setMessages([...history, placeholder]);

    try {
      let acc = "";
      for await (const chunk of streamChat(cfg, payload, params)) {
        if (abortRef.current) break;
        acc += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
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
    const userMsg = createMessage("user", input.trim());
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
        highlights: [],
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
          ? [createMessage("assistant", card.first_mes)]
          : []
      );
    }
  }

  function renderContent(m: StoredMessage): React.ReactNode {
    if (!m.content) {
      return (
        <span className="ai-msg-typing">
          <Sparkles size={13} strokeWidth={2} /> 正在思考…
        </span>
      );
    }
    const hls = (m.highlights || [])
      .slice()
      .sort((a, b) => a.start - b.start);
    if (hls.length === 0) return m.content;

    const out: React.ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    for (const h of hls) {
      const s = Math.max(cursor, h.start);
      const e = Math.min(m.content.length, h.end);
      if (e <= s) continue;
      if (s > cursor) out.push(m.content.slice(cursor, s));
      out.push(
        <mark
          key={`hl-${h.id}-${key++}`}
          className={
            h.kind === "note" ? "ai-hl ai-hl-note" : "ai-hl"
          }
          data-hl-id={h.id}
          onClick={(ev) => {
            ev.stopPropagation();
            setActiveHl({
              msgIndex: messages.indexOf(m),
              hlId: h.id,
            });
          }}
        >
          {m.content.slice(s, e)}
        </mark>
      );
      cursor = e;
    }
    if (cursor < m.content.length)
      out.push(m.content.slice(cursor));
    return out;
  }

  const activeDetail = useMemo(() => {
    if (!activeHl) return null;
    const m = messages[activeHl.msgIndex];
    if (!m) return null;
    const h = (m.highlights || []).find(
      (x) => x.id === activeHl.hlId
    );
    if (!h) return null;
    return { ...h, msgIndex: activeHl.msgIndex };
  }, [activeHl, messages]);

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
          <div className="ai-chat-toolbar">
            <button
              className="ai-chat-clear"
              onClick={() => setShowPreset(true)}
            >
              ⚙ 预设{preset ? `：${preset.name}` : "（默认）"}
            </button>
            <button
              className="ai-chat-clear"
              onClick={() => setShowWorldbook(true)}
            >
              📖 世界书（
              {globalBooks.length + cardBooks.length} 本 /{" "}
              {worldbook.length} 条）
            </button>
            <button
              className="ai-chat-clear"
              onClick={clearAll}
              disabled={streaming}
            >
              清空对话
            </button>
          </div>
        </div>

        {messages.map((m, i) => {
          if (m.role === "system") return null;
          const isUser = m.role === "user";
          const isEditing = editingIdx === i;

          return (
            <div
              key={m.id}
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
                    <div
                      className="ai-msg-text"
                      data-msg-id={m.id}
                    >
                      {renderContent(m)}
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

      {selection && (
        <HighlightActionMenu
          rect={selection.rect}
          onHighlight={handleCreateHighlight}
          onNote={handleCreateNote}
          onClose={closeSelection}
        />
      )}

      {editingNote && (
        <HighlightNoteEditor
          initial={editingNote.initial}
          quote={editingNote.quote}
          onSave={handleSaveNote}
          onCancel={() => setEditingNote(null)}
        />
      )}

      {activeDetail && (
        <div
          className="hl-note-backdrop"
          onClick={() => setActiveHl(null)}
        >
          <div
            className="hl-note-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hl-note-header">
              <h3>
                {activeDetail.kind === "note"
                  ? "笔记"
                  : "高亮"}
              </h3>
              <button
                onClick={() => setActiveHl(null)}
                aria-label="关闭"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
            <div className="hl-note-quote hl-note-quote-full">
              {activeDetail.text}
            </div>
            {activeDetail.note && (
              <div className="hl-detail-note">
                {activeDetail.note}
              </div>
            )}
            <div className="hl-note-footer">
              <button
                className="hl-note-btn danger"
                onClick={handleDeleteHighlight}
              >
                <Trash2 size={13} strokeWidth={2.4} />
                删除
              </button>
              <button
                className="hl-note-btn"
                onClick={() => {
                  setEditingNote({
                    msgIndex: activeDetail.msgIndex,
                    hlId: activeDetail.id,
                    quote: activeDetail.text,
                    initial: activeDetail.note || "",
                  });
                  setActiveHl(null);
                }}
              >
                {activeDetail.note ? "改笔记" : "写笔记"}
              </button>
              <button
                className="hl-note-btn"
                onClick={handleCollect}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <BookmarkPlus size={13} strokeWidth={2.4} />
                收藏
              </button>
            </div>
          </div>
        </div>
      )}

      {showWorldbook && (
        <WorldbookPanel
          cardId={cardId}
          onClose={async () => {
            setShowWorldbook(false);
            await refreshWorldbook();
          }}
        />
      )}

      {showPreset && (
        <PresetPanel
          onClose={() => setShowPreset(false)}
          onChanged={refreshPreset}
        />
      )}

      {toast && <div className="ai-chat-toast">{toast}</div>}
    </div>
  );
}