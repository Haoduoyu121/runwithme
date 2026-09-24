"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  RotateCcw,
  MessageCircle,
  Flag,
  X,
  Send,
} from "lucide-react";
import {
  buildDeck,
  shuffle,
  canPlay,
  cardLabel,
  pickCardAI,
  pickColorAI,
  drawFromDeck,
  UNO_COLORS,
  COLOR_LABELS,
  type UnoCard,
  type UnoColor,
} from "@/lib/uno";
import type { GameChatContext } from "@/data/gameChatPool";
import {
  loadGameChatPool,
  pickLine,
  type StoredPool,
} from "@/lib/gameChatStorage";
import {
  PLAYER_PROFILE,
  pickRefuseLine,
  type PlayerId,
} from "@/lib/gomokuPlayers";
import {
  loadUnoStats,
  recordUno,
  type UnoStats,
} from "@/lib/unoStats";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import RewardPromptBar from "./arcade/RewardPromptBar";

type Props = { onBack: () => void };
type Mode = "you-levi" | "you-erwin" | "watch" | "three";
type Screen = "invite" | "waiting" | "refused" | "game" | "ended";

type ChatMsg = {
  id: string;
  who: PlayerId;
  text: string;
  ts: number;
};

const MODE_PLAYERS: Record<Mode, PlayerId[]> = {
  "you-levi": ["you", "levi"],
  "you-erwin": ["you", "erwin"],
  watch: ["levi", "erwin"],
  three: ["you", "levi", "erwin"],
};

const MODE_LABEL: Record<Mode, string> = {
  "you-levi": "我 vs Levi",
  "you-erwin": "我 vs Erwin",
  watch: "Levi vs Erwin",
  three: "三人局",
};

const TURN_MS = 30000;
const USER_CHAT_MAX = 60;

function genId(): string {
  return "c-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

type GameState = {
  deck: UnoCard[];
  discard: UnoCard[];
  hands: Record<string, UnoCard[]>;
  currentColor: UnoColor;
  currentIdx: number;
  direction: 1 | -1;
  winner: PlayerId | null;
  /* 累积的待摸牌 */
  pendingDraw: number;
  /* 待摸牌的来源（draw2 / wild4） */
  pendingBy: PlayerId | null;
};

export default function UnoApp({ onBack }: Props) {
  const avatars = useCharacterAvatars();

  const [screen, setScreen] = useState<Screen>("invite");
  const [pendingMode, setPendingMode] = useState<Mode>("you-levi");
  const [mode, setMode] = useState<Mode>("you-levi");

  const [state, setState] = useState<GameState | null>(null);

  const [stats, setStats] = useState<UnoStats>(() => loadUnoStats());

  const [turnDeadline, setTurnDeadline] = useState(0);
  const [remain, setRemain] = useState(30);
  const aiTimerRef = useRef<number | null>(null);
  const aiActionRef = useRef(false);

  const [pendingWild, setPendingWild] = useState<UnoCard | null>(
    null
  );

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatPool, setChatPool] = useState<StoredPool | null>(null);
  const lastAiLineRef = useRef("");

  const stateRef = useRef<GameState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setChatPool(loadGameChatPool());
  }, []);

  const players = useMemo(() => MODE_PLAYERS[mode], [mode]);
  const slots = useMemo(() => {
    return {
      you: players.includes("you") ? "you" : null,
      levi: players.includes("levi") ? "levi" : null,
      erwin: players.includes("erwin") ? "erwin" : null,
    };
  }, [players]);

  const currentPlayer = useMemo(() => {
    if (!state) return null;
    return players[state.currentIdx] || null;
  }, [state, players]);

  /* ---------- 邀请 ---------- */

  function invite(m: Mode) {
    setPendingMode(m);
    setScreen("waiting");
    const opps = MODE_PLAYERS[m].filter(
      (p): p is "levi" | "erwin" => p !== "you"
    );
    let refused: "levi" | "erwin" | null = null;
    for (const o of opps) {
      if (Math.random() > PLAYER_PROFILE[o].acceptRate) {
        refused = o;
        break;
      }
    }
    const waitMs = 1200 + Math.random() * 800;
    window.setTimeout(() => {
      if (refused) {
        setScreen("refused");
        setChat([
          {
            id: genId(),
            who: refused,
            text: pickRefuseLine(refused),
            ts: Date.now(),
          },
        ]);
      } else {
        setMode(m);
        startGame(m);
      }
    }, waitMs);
  }

  function startGame(m: Mode) {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;
    setTurnDeadline(0);
    setRemain(30);
    setPendingWild(null);

    const ps = MODE_PLAYERS[m];
    const deck = shuffle(buildDeck());
    const hands: Record<string, UnoCard[]> = {};
    let cursor = 0;

    for (const p of ps) {
      hands[p] = deck.slice(cursor, cursor + 7);
      cursor += 7;
    }
    let rest = deck.slice(cursor);
    /* 找到第一张非万能牌作为起始弃牌 */
    let firstIdx = rest.findIndex((c) => c.color !== "wild");
    if (firstIdx < 0) firstIdx = 0;
    const firstCard = rest[firstIdx];
    rest = [
      ...rest.slice(0, firstIdx),
      ...rest.slice(firstIdx + 1),
    ];

    const initialColor: UnoColor =
      firstCard.color === "wild"
        ? UNO_COLORS[Math.floor(Math.random() * 4)]
        : firstCard.color;

    setState({
      deck: rest,
      discard: [firstCard],
      hands,
      currentColor: initialColor,
      currentIdx: 0,
      direction: 1,
      winner: null,
      pendingDraw: 0,
      pendingBy: null,
    });
    setChat([]);
    setScreen("game");
    setMode(m);
  }

  /* ---------- 主循环：AI 回合 ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (!state) return;
    if (state.winner) return;

    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }

    const cur = players[state.currentIdx];
    if (!cur) return;
    if (cur === "you") {
      /* 用户回合 */
      const now = Date.now();
      setTurnDeadline(now + TURN_MS);
      setRemain(Math.ceil(TURN_MS / 1000));
      return;
    }

    /* AI 回合 */
    const aiThinkMs = 1200 + Math.random() * 3500;
    aiActionRef.current = true;

    aiTimerRef.current = window.setTimeout(() => {
      aiTimerRef.current = null;
      aiActionRef.current = false;
      aiTakeTurn(cur);
    }, aiThinkMs);

    return () => {
      if (aiTimerRef.current !== null) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      aiActionRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.currentIdx, state?.winner, screen, mode]);

  /* ---------- 用户倒计时 ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (!state) return;
    if (state.winner) return;
    const cur = players[state.currentIdx];
    if (cur !== "you") return;
    if (turnDeadline === 0) return;

    const t = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((turnDeadline - Date.now()) / 1000)
      );
      setRemain(left);
      if (left <= 0) {
        /* 超时 → 自动摸一张 */
        userDrawAuto();
      }
    }, 300);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnDeadline, screen, state?.currentIdx, state?.winner]);

  /* ---------- 核心：出牌逻辑 ---------- */

  function applyPlay(
    s: GameState,
    playerId: PlayerId,
    card: UnoCard,
    chosenColor: UnoColor
  ): GameState {
    const hands = { ...s.hands };
    hands[playerId] = hands[playerId].filter((c) => c.id !== card.id);

    let newDirection = s.direction;
    let skipNext = false;
    let pendingDraw = 0;
    let pendingBy: PlayerId | null = null;

    const nextColor: UnoColor =
      card.color === "wild" ? chosenColor : card.color;

    if (card.type === "reverse") {
      newDirection = (s.direction === 1 ? -1 : 1) as 1 | -1;
      /* 两人局时反转 = 跳过 */
      if (players.length === 2) skipNext = true;
    } else if (card.type === "skip") {
      skipNext = true;
    } else if (card.type === "draw2") {
      pendingDraw = 2;
      pendingBy = playerId;
      skipNext = true;
    } else if (card.type === "wild4") {
      pendingDraw = 4;
      pendingBy = playerId;
      skipNext = true;
    }

    const nextState: GameState = {
      ...s,
      deck: s.deck,
      discard: [...s.discard, card],
      hands,
      currentColor: nextColor,
      direction: newDirection,
      pendingDraw,
      pendingBy,
      winner: hands[playerId].length === 0 ? playerId : null,
    };

    if (nextState.winner) return nextState;

    /* 找下一位玩家 */
    let nextIdx = s.currentIdx;
    const step = (i: number) =>
      (i + newDirection + players.length) % players.length;
    nextIdx = step(nextIdx);
    if (skipNext && !pendingDraw) {
      nextIdx = step(nextIdx);
    }

    /* 处理摸牌：直接让下一家摸完并跳过 */
    if (pendingDraw > 0) {
      const victim = players[nextIdx];
      const r = drawFromDeck(
        nextState.deck,
        nextState.discard,
        pendingDraw
      );
      hands[victim] = [...hands[victim], ...r.cards];
      nextState.deck = r.deck;
      nextState.discard = r.discard;
      nextState.hands = hands;
      /* 从被跳过的人再往后一位 */
      nextIdx = step(nextIdx);
      nextState.pendingDraw = 0;
      nextState.pendingBy = null;
    }

    nextState.currentIdx = nextIdx;
    return nextState;
  }

  /* ---------- AI 出牌 ---------- */

  function aiTakeTurn(who: PlayerId) {
    const s = stateRef.current;
    if (!s) return;
    const top = s.discard[s.discard.length - 1];
    const hand = s.hands[who];
    const card = pickCardAI(hand, top, s.currentColor);

    if (!card) {
      /* 摸一张 */
      const r = drawFromDeck(s.deck, s.discard, 1);
      const hands = { ...s.hands };
      hands[who] = [...hands[who], ...r.cards];
      const next: GameState = {
        ...s,
        deck: r.deck,
        discard: r.discard,
        hands,
        currentIdx: (s.currentIdx + s.direction + players.length) % players.length,
      };
      /* 摸到能出的就出（简化：不下） */
      setState(next);
      if (Math.random() < 0.25) {
        const line = pickLine(
          chatPool ?? loadGameChatPool(),
          who as "levi" | "erwin",
          "mid",
          lastAiLineRef.current
        );
        lastAiLineRef.current = line;
        pushChat(who, line);
      }
      return;
    }

    /* 出牌 */
    let chosenColor: UnoColor = s.currentColor;
    if (card.color === "wild") {
      chosenColor = pickColorAI(hand.filter((c) => c.id !== card.id));
    }
    const next = applyPlay(s, who, card, chosenColor);
    setState(next);

    if (next.winner) {
      setStats(recordUno(stats, next.winner));
      setScreen("ended");
      return;
    }

    /* 偶尔聊天 */
    if (Math.random() < 0.22) {
      const line = pickLine(
        chatPool ?? loadGameChatPool(),
        who as "levi" | "erwin",
        "mid",
        lastAiLineRef.current
      );
      lastAiLineRef.current = line;
      pushChat(who, line);
    }
  }

  /* ---------- 用户操作 ---------- */

  function userPlay(card: UnoCard) {
    if (!state) return;
    if (state.winner) return;
    if (players[state.currentIdx] !== "you") return;
    const top = state.discard[state.discard.length - 1];
    if (!canPlay(card, top, state.currentColor)) return;

    if (card.color === "wild") {
      /* 弹出选色 */
      setPendingWild(card);
      return;
    }

    const next = applyPlay(state, "you", card, state.currentColor);
    setState(next);
    if (next.winner) {
      setStats(recordUno(stats, next.winner));
      setScreen("ended");
    }
  }

  function userChooseColor(color: UnoColor) {
    if (!state || !pendingWild) return;
    const next = applyPlay(state, "you", pendingWild, color);
    setPendingWild(null);
    setState(next);
    if (next.winner) {
      setStats(recordUno(stats, next.winner));
      setScreen("ended");
    }
  }

  function userDrawAuto() {
    const s = stateRef.current;
    if (!s) return;
    if (players[s.currentIdx] !== "you") return;
    const r = drawFromDeck(s.deck, s.discard, 1);
    const hands = { ...s.hands };
    hands["you"] = [...hands["you"], ...r.cards];
    const next: GameState = {
      ...s,
      deck: r.deck,
      discard: r.discard,
      hands,
      currentIdx:
        (s.currentIdx + s.direction + players.length) % players.length,
    };
    setState(next);
  }

  function userDrawAndPass() {
    userDrawAuto();
  }

  /* ---------- 聊天 ---------- */

  function pushChat(who: PlayerId, text: string) {
    if (!text.trim()) return;
    const msg: ChatMsg = { id: genId(), who, text, ts: Date.now() };
    setChat((prev) => [...prev.slice(-49), msg]);
  }

  function userSendChat() {
    const text = chatDraft.trim().slice(0, USER_CHAT_MAX);
    if (!text) return;
    pushChat("you", text);
    setChatDraft("");

    const opps = players.filter(
      (p): p is "levi" | "erwin" => p !== "you"
    );
    if (opps.length === 0) return;
    const opp = opps[Math.floor(Math.random() * opps.length)];
    if (Math.random() < 0.6) {
      const delay = 1000 + Math.random() * 2000;
      window.setTimeout(() => {
        const line = pickLine(
          chatPool ?? loadGameChatPool(),
          opp,
          "mid",
          lastAiLineRef.current
        );
        lastAiLineRef.current = line;
        pushChat(opp, line);
      }, delay);
    }
  }

  /* ---------- 认输 ---------- */

  function resign() {
    if (!window.confirm("确定认输？")) return;
    const others = players.filter((p) => p !== "you");
    if (others.length === 0) return;
    const winner = others[0];
    setStats(recordUno(stats, winner));
    if (state) setState({ ...state, winner });
    setScreen("ended");
  }

  /* ---------- 渲染 ---------- */

  if (screen === "invite") {
    return (
      <InviteScreen
        avatars={avatars}
        onInvite={invite}
        onBack={onBack}
      />
    );
  }

  if (screen === "waiting") {
    return (
      <WaitingScreen
        mode={pendingMode}
        avatars={avatars}
        onCancel={() => setScreen("invite")}
      />
    );
  }

  if (screen === "refused") {
    return (
      <RefusedScreen
        msg={chat[0]?.text || "……"}
        who={chat[0]?.who || "levi"}
        avatars={avatars}
        onRetry={() => setScreen("invite")}
      />
    );
  }

  if (!state) {
    return <div className="gm-app gm-center">加载中…</div>;
  }

  const topCard = state.discard[state.discard.length - 1];
  const isMyTurn = players[state.currentIdx] === "you";

  return (
    <div className="gm-app gm-app-scroll uno-app">
      <header className="gm-topbar">
        <button
          className="gh-icon-btn"
          onClick={() => {
            if (screen === "ended") onBack();
            else if (window.confirm("离开当前对局？")) onBack();
          }}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="gm-title">UNO</div>
        <button
          className="gh-icon-btn"
          onClick={() => {
            if (window.confirm("重开一局？")) startGame(mode);
          }}
          aria-label="重开"
        >
          <RotateCcw size={18} strokeWidth={2.2} />
        </button>
      </header>

      {/* 对手行 */}
      <div className="uno-opponents">
        {players
          .filter((p) => p !== "you")
          .map((p) => {
            const isCur =
              players[state.currentIdx] === p && !state.winner;
            const avatar =
              p === "levi" ? avatars.levi : p === "erwin" ? avatars.erwin : null;
            return (
              <div
                key={p}
                className={"uno-opp" + (isCur ? " is-turn" : "")}
              >
                <div className="uno-opp-avatar">
                  {avatar ? (
                    <img src={avatar} alt={p} />
                  ) : (
                    <div className="uno-opp-avatar-fallback">
                      {p === "levi" ? "L" : "E"}
                    </div>
                  )}
                </div>
                <div className="uno-opp-name">
                  {p === "levi" ? "Levi" : "Erwin"}
                </div>
                <div className="uno-opp-count">
                  {state.hands[p]?.length ?? 0} 张
                </div>
                {isCur && (
                  <div className="uno-opp-countdown">{remain}s</div>
                )}
              </div>
            );
          })}
      </div>

      {/* 桌面 */}
      <div className="uno-table">
        <div className="uno-table-center">
          <div className="uno-pile">
            <div className="uno-pile-label">
              牌堆 {state.deck.length}
            </div>
            <button
              className="uno-card uno-card-back"
              onClick={userDrawAndPass}
              disabled={!isMyTurn}
              aria-label="摸一张"
            >
              <span>UNO</span>
            </button>
          </div>

          <div className="uno-pile">
            <div className="uno-pile-label">当前</div>
            <UnoCardView card={topCard} noClick />
            <div
              className={
                "uno-color-dot uno-color-" + state.currentColor
              }
              title={"当前色：" + COLOR_LABELS[state.currentColor]}
            />
          </div>
        </div>

        <div className="uno-direction">
          {state.direction === 1 ? "↻" : "↺"}
        </div>
      </div>

      <div className="gm-inline-chat">
        {chat.length > 0 && (
          <div className="gm-inline-chat-last">
            <span className="gm-inline-chat-who">
              {chat[chat.length - 1].who === "you"
                ? "你"
                : chat[chat.length - 1].who === "levi"
                  ? "Levi"
                  : "Erwin"}
            </span>
            <span className="gm-inline-chat-text">
              {chat[chat.length - 1].text}
            </span>
          </div>
        )}
      </div>

      {/* 我的信息 + 手牌 */}
      <div className="uno-me">
        <div className="uno-me-info">
          <span className="uno-me-name">你</span>
          <span className="uno-me-count">
            {state.hands["you"]?.length ?? 0} 张
          </span>
          {isMyTurn && (
            <span className="uno-me-countdown">{remain}s</span>
          )}
        </div>
        <div className="uno-hand">
          {state.hands["you"]?.map((c) => {
            const playable = isMyTurn && canPlay(c, topCard, state.currentColor);
            return (
              <UnoCardView
                key={c.id}
                card={c}
                disabled={!playable}
                highlight={playable}
                onClick={() => playable && userPlay(c)}
              />
            );
          })}
        </div>
      </div>

      <div className="gm-actions">
        <button
          className="gm-action"
          onClick={() => setShowChat(true)}
        >
          <MessageCircle size={15} strokeWidth={2.4} />
          聊天
        </button>
        <button
          className="gm-action"
          onClick={userDrawAndPass}
          disabled={!isMyTurn}
        >
          摸一张
        </button>
        <button
          className="gm-action gm-action-danger"
          onClick={resign}
          disabled={!!state.winner || !slots.you}
        >
          <Flag size={15} strokeWidth={2.4} />
          认输
        </button>
      </div>

      {/* 变色选择 */}
      {pendingWild && (
        <div className="gm-dialog-backdrop">
          <div className="gm-dialog">
            <div className="gm-dialog-title">选择颜色</div>
            <div className="uno-color-picker">
              {UNO_COLORS.map((c) => (
                <button
                  key={c}
                  className={"uno-color-btn uno-color-" + c}
                  onClick={() => userChooseColor(c)}
                >
                  {COLOR_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 聊天面板 */}
      {showChat && (
        <div
          className="gm-panel-backdrop"
          onClick={() => setShowChat(false)}
        >
          <div
            className="gm-panel gm-panel-chat"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gm-panel-head">
              <span>聊天</span>
              <button
                className="gh-icon-btn"
                onClick={() => setShowChat(false)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="gm-panel-body">
              {chat.length === 0 && (
                <div className="gm-panel-empty">还没开始说话</div>
              )}
              {chat.map((m) => (
                <div
                  key={m.id}
                  className={
                    "gm-chat-line" +
                    (m.who === "you" ? " is-me" : "")
                  }
                >
                  <div className="gm-chat-avatar">
                    {m.who === "you" ? (
                      <div className="gm-chat-avatar-fallback">你</div>
                    ) : (() => {
                      const url =
                        m.who === "levi"
                          ? avatars.levi
                          : avatars.erwin;
                      return url ? (
                        <img src={url} alt={m.who} />
                      ) : (
                        <div className="gm-chat-avatar-fallback">
                          {m.who === "levi" ? "L" : "E"}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="gm-chat-bubble">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="gm-panel-foot gm-chat-input">
              <input
                className="gm-chat-text"
                placeholder="说点什么…"
                value={chatDraft}
                maxLength={USER_CHAT_MAX}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    userSendChat();
                  }
                }}
              />
              <button
                className="gm-chat-send"
                onClick={userSendChat}
                disabled={!chatDraft.trim()}
                aria-label="发送"
              >
                <Send size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "ended" && state.winner && (
        <div className="gm-dialog-backdrop">
          <div className="gm-dialog">
            <div className="gm-dialog-title">
              {state.winner === "you"
                ? "你赢了！"
                : `${state.winner === "levi" ? "Levi" : "Erwin"} 赢了`}
            </div>
            <RewardPromptBar
              result={
                state.winner === "you"
                  ? "win"
                  : players.includes("you")
                    ? "lose"
                    : "watch"
              }
            />
            <div className="gm-dialog-actions">
              <button className="gm-dialog-btn" onClick={onBack}>
                返回
              </button>
              <button
                className="gm-dialog-btn primary"
                onClick={() => startGame(mode)}
              >
                再来一局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   UnoCardView
   ========================================================= */

function UnoCardView({
  card,
  onClick,
  disabled,
  highlight,
  noClick,
}: {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
  noClick?: boolean;
}) {
  const cls =
    "uno-card" +
    (card.color === "wild" ? " uno-card-wild" : " uno-card-" + card.color) +
    (disabled ? " is-disabled" : "") +
    (highlight ? " is-highlight" : "") +
    (noClick ? " is-static" : "");
  return (
    <button className={cls} onClick={onClick} disabled={disabled && !noClick}>
      <span className="uno-card-corner uno-card-corner-tl">
        {cardLabel(card)}
      </span>
      <span className="uno-card-center">{cardLabel(card)}</span>
      <span className="uno-card-corner uno-card-corner-br">
        {cardLabel(card)}
      </span>
    </button>
  );
}

/* =========================================================
   Invite / Waiting / Refused
   ========================================================= */

function InviteScreen({
  avatars,
  onInvite,
  onBack,
}: {
  avatars: { levi?: string | null; erwin?: string | null };
  onInvite: (m: Mode) => void;
  onBack: () => void;
}) {
  return (
    <div className="gm-app">
      <header className="gm-topbar">
        <button
          className="gh-icon-btn"
          onClick={onBack}
          aria-label="返回"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="gm-title">UNO</div>
        <div style={{ width: 36 }} />
      </header>

      <div className="gm-invite-head">
        <div className="gm-invite-title">和谁玩</div>
        <div className="gm-invite-sub">他们可能会答应，也可能拒绝</div>
      </div>

      <div className="gm-invite-list">
        <InviteRow
          name="Levi"
          avatar={avatars.levi}
          fallback="L"
          desc="1v1"
          onClick={() => onInvite("you-levi")}
        />
        <InviteRow
          name="Erwin"
          avatar={avatars.erwin}
          fallback="E"
          desc="1v1"
          onClick={() => onInvite("you-erwin")}
        />
        <InviteRow
          name="看 Levi vs Erwin"
          avatar={null}
          fallback="✦"
          desc="你旁观"
          onClick={() => onInvite("watch")}
        />
        <InviteRow
          name="三人局"
          avatar={null}
          fallback="◈"
          desc="你 + Levi + Erwin"
          onClick={() => onInvite("three")}
        />
      </div>
    </div>
  );
}

function InviteRow({
  name,
  avatar,
  fallback,
  desc,
  onClick,
}: {
  name: string;
  avatar?: string | null;
  fallback: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button className="gm-invite-row" onClick={onClick}>
      <div className="gm-invite-avatar">
        {avatar ? <img src={avatar} alt={name} /> : <span>{fallback}</span>}
      </div>
      <div className="gm-invite-info">
        <div className="gm-invite-name">{name}</div>
        <div className="gm-invite-desc">{desc}</div>
      </div>
    </button>
  );
}

function WaitingScreen({
  mode,
  avatars,
  onCancel,
}: {
  mode: Mode;
  avatars: { levi?: string | null; erwin?: string | null };
  onCancel: () => void;
}) {
  const opps = MODE_PLAYERS[mode].filter(
    (p): p is "levi" | "erwin" => p !== "you"
  );
  return (
    <div className="gm-app gm-center">
      <div className="gm-waiting">
        <div className="gm-waiting-avatars">
          {opps.map((o) => (
            <div key={o} className="gm-waiting-avatar">
              {o === "levi" && avatars.levi ? (
                <img src={avatars.levi} alt="Levi" />
              ) : o === "erwin" && avatars.erwin ? (
                <img src={avatars.erwin} alt="Erwin" />
              ) : (
                <span>{o === "levi" ? "L" : "E"}</span>
              )}
            </div>
          ))}
        </div>
        <div className="gm-waiting-text">等待回应…</div>
        <button className="gm-dialog-btn" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

function RefusedScreen({
  msg,
  who,
  avatars,
  onRetry,
}: {
  msg: string;
  who: PlayerId;
  avatars: { levi?: string | null; erwin?: string | null };
  onRetry: () => void;
}) {
  const name = PLAYER_PROFILE[who].name;
  const avatar =
    who === "levi" ? avatars.levi : who === "erwin" ? avatars.erwin : null;
  return (
    <div className="gm-app gm-center">
      <div className="gm-refused">
        <div className="gm-refused-avatar">
          {avatar ? (
            <img src={avatar} alt={name} />
          ) : (
            <span>{who === "levi" ? "L" : "E"}</span>
          )}
        </div>
        <div className="gm-refused-name">{name}</div>
        <div className="gm-refused-msg">「{msg}」</div>
        <button className="gm-dialog-btn primary" onClick={onRetry}>
          换个人邀请
        </button>
      </div>
    </div>
  );
}