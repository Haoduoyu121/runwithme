"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  RotateCcw,
  Hand,
  MessageCircle,
  Flag,
  X,
  Send,
} from "lucide-react";
import {
  emptyBoard3,
  boardSize,
  checkWin3,
  isFull3,
  pickMoveTTT,
  pickRandomTTT,
  type Board3,
  type Cell,
  type TTTMode,
} from "@/lib/tictactoe";
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
  loadTTTStats,
  recordTTT,
  type TTTStats,
} from "@/lib/tictactoeStats";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import RewardPromptBar from "./arcade/RewardPromptBar";

type Props = { onBack: () => void };
type Screen = "invite" | "waiting" | "refused" | "game" | "ended";

type ChatMsg = {
  id: string;
  who: PlayerId;
  text: string;
  ts: number;
};

/** 模式 → 3 个玩家槽位（black/white/green）。三人模式才用 green */
type Slots = {
  black: PlayerId;
  white: PlayerId;
  green?: PlayerId;
};

function modeSlots(m: TTTMode): Slots {
  if (m === "you-levi") return { black: "you", white: "levi" };
  if (m === "you-erwin") return { black: "you", white: "erwin" };
  if (m === "watch") return { black: "levi", white: "erwin" };
  return { black: "you", white: "levi", green: "erwin" };
}

const MODE_LABEL: Record<TTTMode, string> = {
  "you-levi": "我 vs Levi",
  "you-erwin": "我 vs Erwin",
  watch: "Levi vs Erwin",
  three: "三人局",
};

const TURN_MS = 30000;
const USER_CHAT_MAX = 60;

function genId(): string {
  return "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

function stoneColor(c: Cell): "black" | "white" | "green" {
  if (c === 1) return "black";
  if (c === 2) return "white";
  return "green";
}

function playerOfCell(slots: Slots, c: Cell): PlayerId | null {
  if (c === 1) return slots.black;
  if (c === 2) return slots.white;
  if (c === 3 && slots.green) return slots.green;
  return null;
}

function cellOfPlayer(slots: Slots, who: PlayerId): Cell {
  if (slots.black === who) return 1;
  if (slots.white === who) return 2;
  if (slots.green === who) return 3;
  return 0;
}

function ctxFor(
  board: Board3,
  me: Cell,
  opponents: Cell[]
): GameChatContext {
  let mine = 0;
  let theirs = 0;
  for (const row of board) {
    for (const c of row) {
      if (c === 0) continue;
      if (c === me) mine++;
      else if (opponents.includes(c)) theirs++;
    }
  }
  if (mine === 0 && theirs === 0) return "opening";
  if (theirs - mine >= 2) return "trailing";
  if (mine - theirs >= 2) return "leading";
  return "mid";
}

export default function TicTacToeApp({ onBack }: Props) {
  const avatars = useCharacterAvatars();

  const [screen, setScreen] = useState<Screen>("invite");
  const [pendingMode, setPendingMode] = useState<TTTMode>("you-levi");
  const [mode, setMode] = useState<TTTMode>("you-levi");

  const [board, setBoard] = useState<Board3>(() => emptyBoard3(3));
  const [turn, setTurn] = useState<Cell>(1);
  const [winner, setWinner] = useState<{
    who: PlayerId | null;
    line: [number, number][];
  } | null>(null);
  const [stats, setStats] = useState<TTTStats>(() => loadTTTStats());

  const [turnDeadline, setTurnDeadline] = useState(0);
  const [remain, setRemain] = useState(30);
  const aiTimerRef = useRef<number | null>(null);
  const aiActionRef = useRef(false);

  const [undoDialog, setUndoDialog] = useState<{
    requester: PlayerId;
    target: PlayerId;
    awaiting: "ai" | "user" | "result";
    result?: "accept" | "refuse";
  } | null>(null);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatPool, setChatPool] = useState<StoredPool | null>(null);

  const historyRef = useRef<Board3[]>([]);
  const boardRef = useRef<Board3>(board);
  const turnRef = useRef<Cell>(turn);
  const lastAiLineRef = useRef("");

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    setChatPool(loadGameChatPool());
  }, []);

  const slots = useMemo(() => modeSlots(mode), [mode]);
  const size = boardSize(mode);

  const allPlayers = useMemo(() => {
    const arr: PlayerId[] = [slots.black, slots.white];
    if (slots.green) arr.push(slots.green);
    return arr;
  }, [slots]);

  /* ---------- 邀请 ---------- */

  function invite(m: TTTMode) {
    setPendingMode(m);
    setScreen("waiting");
    const s = modeSlots(m);
    const opps: ("levi" | "erwin")[] = [];
    if (s.black !== "you") opps.push(s.black as "levi" | "erwin");
    if (s.white !== "you") opps.push(s.white as "levi" | "erwin");
    if (s.green && s.green !== "you") opps.push(s.green as "levi" | "erwin");

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

  function startGame(m: TTTMode) {
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;
    setTurnDeadline(0);
    setRemain(30);

    const s = boardSize(m);
    setBoard(emptyBoard3(s));
    setTurn(1);
    setWinner(null);
    setChat([]);
    historyRef.current = [emptyBoard3(s)];
    setScreen("game");
    setMode(m);
  }

  /* ---------- 落子 ---------- */

  const placeStone = useCallback(
    (b: Board3, r: number, c: number, s: Cell): Board3 => {
      const next = b.map((row) => [...row]) as Board3;
      next[r][c] = s;
      return next;
    },
    []
  );

  const finishMove = useCallback(
    (next: Board3, r: number, c: number, mover: PlayerId) => {
      setBoard(next);
      historyRef.current.push(next);
      const w = checkWin3(next, r, c);
      if (w) {
        const who = playerOfCell(slots, w.winner);
        setWinner({ who, line: w.line });
        setScreen("ended");
        setStats(recordTTT(stats, who));
        /* 台词 */
        for (const p of allPlayers) {
          if (p === "you") continue;
          const line = pickLine(
            chatPool ?? loadGameChatPool(),
            p as "levi" | "erwin",
            p === who ? "won" : "lost",
            lastAiLineRef.current
          );
          lastAiLineRef.current = line;
          pushChat(p, line);
          break;
        }
        return true;
      }
      if (isFull3(next)) {
        setWinner({ who: null, line: [] });
        setScreen("ended");
        setStats(recordTTT(stats, null));
        return true;
      }
      /* 三人局轮换 1 → 2 → 3 → 1；双人 1 ↔ 2 */
      if (slots.green) {
        setTurn((t) => ((t % 3) + 1) as Cell);
      } else {
        setTurn((t) => (t === 1 ? 2 : 1));
      }
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, allPlayers, stats]
  );

  /* ---------- 每回合开始 ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (winner) return;

    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;

    const now = Date.now();
    const deadline = now + TURN_MS;
    setTurnDeadline(deadline);
    setRemain(Math.ceil(TURN_MS / 1000));

    const curWho = playerOfCell(slots, turn);
    if (!curWho || curWho === "you") return;

    const aiThinkMs = 2000 + Math.random() * 26000;
    aiActionRef.current = true;

    aiTimerRef.current = window.setTimeout(() => {
      aiTimerRef.current = null;
      aiActionRef.current = false;
      const snapBoard = boardRef.current;
      const snapTurn = turnRef.current;
      const opponents = allPlayers
        .filter((p) => p !== curWho)
        .map((p) => cellOfPlayer(slots, p))
        .filter((x) => x !== 0) as Cell[];
      const [r, c] = pickMoveTTT(snapBoard, snapTurn, opponents);
      const next = placeStone(snapBoard, r, c, snapTurn);
      finishMove(next, r, c, curWho);

      if (Math.random() < 0.28) {
        const ctx = ctxFor(next, snapTurn, opponents);
        const line = pickLine(
          chatPool ?? loadGameChatPool(),
          curWho as "levi" | "erwin",
          ctx,
          lastAiLineRef.current
        );
        lastAiLineRef.current = line;
        pushChat(curWho, line);
      }
    }, aiThinkMs);

    return () => {
      if (aiTimerRef.current !== null) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
      aiActionRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, screen, winner, slots, mode]);

  /* ---------- 倒计时 ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (winner) return;
    if (turnDeadline === 0) return;

    const t = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((turnDeadline - Date.now()) / 1000)
      );
      setRemain(left);
      if (left <= 0) {
        const curWho = playerOfCell(slots, turnRef.current);
        if (curWho === "you" && !aiActionRef.current) {
          aiActionRef.current = true;
          const snapBoard = boardRef.current;
          const snapTurn = turnRef.current;
          const [r, c] = pickRandomTTT(snapBoard);
          const next = placeStone(snapBoard, r, c, snapTurn);
          aiActionRef.current = false;
          finishMove(next, r, c, "you");
        }
      }
    }, 250);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnDeadline, screen, winner, slots]);

  /* ---------- 用户点击 ---------- */

  function handleClick(r: number, c: number) {
    if (screen !== "game") return;
    if (winner) return;
    if (board[r][c] !== 0) return;
    const curWho = playerOfCell(slots, turn);
    if (curWho !== "you") return;
    if (aiActionRef.current) return;

    aiActionRef.current = true;
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    const next = placeStone(board, r, c, turn);
    aiActionRef.current = false;
    finishMove(next, r, c, "you");
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

    const opps = allPlayers.filter(
      (p): p is "levi" | "erwin" => p !== "you"
    );
    if (opps.length === 0) return;
    const opp = opps[Math.floor(Math.random() * opps.length)];

    if (Math.random() < 0.6) {
      const delay = 1000 + Math.random() * 2000;
      window.setTimeout(() => {
        const curBoard = boardRef.current;
        const myCell = cellOfPlayer(slots, opp);
        const opCells = allPlayers
          .filter((p) => p !== opp)
          .map((p) => cellOfPlayer(slots, p))
          .filter((x) => x !== 0) as Cell[];
        const ctx = ctxFor(curBoard, myCell, opCells);
        const line = pickLine(
          chatPool ?? loadGameChatPool(),
          opp,
          ctx,
          lastAiLineRef.current
        );
        lastAiLineRef.current = line;
        pushChat(opp, line);
      }, delay);
    }
  }

  /* ---------- 悔棋 ---------- */

  function requestUndo(from: PlayerId, target: PlayerId) {
    if (historyRef.current.length < 3) return;
    setUndoDialog({
      requester: from,
      target,
      awaiting: from === "you" ? "ai" : "user",
    });
    if (from === "you") {
      window.setTimeout(() => {
        const rate = PLAYER_PROFILE[target].undoAcceptRate;
        const accept = Math.random() < rate;
        setUndoDialog((d) =>
          d
            ? {
                ...d,
                awaiting: "result",
                result: accept ? "accept" : "refuse",
              }
            : null
        );
        pushChat(
          target,
          pickLine(
            chatPool ?? loadGameChatPool(),
            target as "levi" | "erwin",
            "undo"
          )
        );
        window.setTimeout(() => {
          if (accept) performUndo();
          setUndoDialog(null);
        }, 1400);
      }, 1500);
    }
  }

  function userAnswerUndo(accept: boolean) {
    if (!undoDialog) return;
    setUndoDialog({
      ...undoDialog,
      awaiting: "result",
      result: accept ? "accept" : "refuse",
    });
    pushChat("you", accept ? "可以。" : "不行。");
    window.setTimeout(() => {
      if (accept) performUndo();
      setUndoDialog(null);
    }, 1200);
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;
  }

  function performUndo() {
    const hist = historyRef.current;
    if (hist.length < 2) return;
    /* 退 1 步 → 回到上一个玩家的回合 */
    const back = hist.slice(0, Math.max(1, hist.length - 1));
    historyRef.current = back;
    const b = back[back.length - 1];
    setBoard(b);
    setWinner(null);
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;

    /* 回退到上一个执子玩家 */
    if (slots.green) {
      setTurn((t) => ((t + 1) % 3 === 0 ? 3 : (t + 2) % 3 + 1) as Cell);
    } else {
      setTurn((t) => (t === 1 ? 2 : 1));
    }
    setScreen("game");
  }

  function userRequestUndo() {
    if (screen !== "game") return;
    if (winner) return;
    if (historyRef.current.length < 3) return;
    pushChat("you", "我可以悔一步吗？");
    const targets = allPlayers.filter((p) => p !== "you");
    if (targets.length === 0) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    requestUndo("you", target);
  }

  function resign() {
    if (!window.confirm("确定认输？")) return;
    const others = allPlayers.filter((p) => p !== "you");
    const other = others[0];
    setWinner({ who: other, line: [] });
    setScreen("ended");
    setStats(recordTTT(stats, other));
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

  const winSet = new Set<string>();
  if (winner?.line) {
    for (const [r, c] of winner.line) winSet.add(`${r},${c}`);
  }
  const currentWho = playerOfCell(slots, turn);

  return (
    <div className="gm-app gm-app-scroll">
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
        <div className="gm-title">井字棋</div>
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

      <div className="gm-players">
        <PlayerCard3
          who={slots.black}
          cell={1}
          isTurn={turn === 1 && !winner}
          remain={turn === 1 ? remain : null}
          avatars={avatars}
        />
        <div className="gm-vs">·</div>
        <PlayerCard3
          who={slots.white}
          cell={2}
          isTurn={turn === 2 && !winner}
          remain={turn === 2 ? remain : null}
          avatars={avatars}
        />
        {slots.green && (
          <>
            <div className="gm-vs">·</div>
            <PlayerCard3
              who={slots.green}
              cell={3}
              isTurn={turn === 3 && !winner}
              remain={turn === 3 ? remain : null}
              avatars={avatars}
            />
          </>
        )}
      </div>

      <div className="gm-board-wrap">
        <div
          className="ttt-board"
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            maxWidth: size === 4 ? 380 : 320,
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const k = `${r},${c}`;
              const isWin = winSet.has(k);
              return (
                <button
                  key={k}
                  className={"ttt-cell" + (isWin ? " is-win" : "")}
                  onClick={() => handleClick(r, c)}
                >
                  {cell !== 0 && (
                    <span
                      className={
                        "ttt-mark ttt-mark-" +
                        stoneColor(cell) +
                        (isWin ? " is-win" : "")
                      }
                    >
                      {cell === 1 ? "●" : cell === 2 ? "○" : "◈"}
                    </span>
                  )}
                </button>
              );
            })
          )}
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

      <div className="gm-actions">
        <button
          className="gm-action"
          onClick={userRequestUndo}
          disabled={!!winner || historyRef.current.length < 3}
        >
          <Hand size={15} strokeWidth={2.4} />
          悔棋
        </button>
        <button
          className="gm-action"
          onClick={() => setShowChat(true)}
        >
          <MessageCircle size={15} strokeWidth={2.4} />
          聊天
        </button>
        <button
          className="gm-action gm-action-danger"
          onClick={resign}
          disabled={!!winner || slots.black !== "you" && slots.white !== "you"}
        >
          <Flag size={15} strokeWidth={2.4} />
          认输
        </button>
      </div>

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

      {undoDialog && (
        <div className="gm-dialog-backdrop">
          <div className="gm-dialog">
            <div className="gm-dialog-title">
              {undoDialog.awaiting === "user"
                ? `${undoDialog.requester === "levi" ? "Levi" : "Erwin"} 请求悔棋`
                : undoDialog.awaiting === "ai"
                  ? `${undoDialog.target === "levi" ? "Levi" : "Erwin"} 正在考虑…`
                  : undoDialog.result === "accept"
                    ? "对方同意了"
                    : "对方拒绝了"}
            </div>
            {undoDialog.awaiting === "user" && (
              <div className="gm-dialog-actions">
                <button
                  className="gm-dialog-btn"
                  onClick={() => userAnswerUndo(false)}
                >
                  拒绝
                </button>
                <button
                  className="gm-dialog-btn primary"
                  onClick={() => userAnswerUndo(true)}
                >
                  同意
                </button>
              </div>
            )}
            {(undoDialog.awaiting === "ai" ||
              undoDialog.awaiting === "result") && (
              <div className="gm-dialog-loading">···</div>
            )}
          </div>
        </div>
      )}

      {screen === "ended" && winner && (
        <div className="gm-dialog-backdrop">
          <div className="gm-dialog">
            <div className="gm-dialog-title">
              {winner.who === null
                ? "平局"
                : winner.who === "you"
                  ? "你赢了！"
                  : `${winner.who === "levi" ? "Levi" : "Erwin"} 赢了`}
            </div>
            <RewardPromptBar
              result={
                winner.who === null
                  ? "draw"
                  : winner.who === "you"
                    ? "win"
                    : allPlayers.includes("you")
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

/* ========================================================= */

function PlayerCard3({
  who,
  cell,
  isTurn,
  remain,
  avatars,
}: {
  who: PlayerId;
  cell: 1 | 2 | 3;
  isTurn: boolean;
  remain: number | null;
  avatars: { levi?: string | null; erwin?: string | null };
}) {
  const name = PLAYER_PROFILE[who].name;
  const avatar =
    who === "you" ? null : who === "levi" ? avatars.levi : avatars.erwin;
  const urgent = remain !== null && remain <= 5;
  const mark = cell === 1 ? "●" : cell === 2 ? "○" : "◈";
  const colorCls =
    cell === 1 ? "black" : cell === 2 ? "white" : "green";
  return (
    <div className={"gm-player" + (isTurn ? " is-turn" : "")}>
      <div className="gm-player-avatar">
        {who === "you" ? (
          <div className="gm-player-avatar-fallback">你</div>
        ) : avatar ? (
          <img src={avatar} alt={name} />
        ) : (
          <div className="gm-player-avatar-fallback">
            {who === "levi" ? "L" : "E"}
          </div>
        )}
      </div>
      <div className="gm-player-name">{name}</div>
      <div className={"ttt-mark-mini ttt-mark-" + colorCls}>{mark}</div>
      <div className="gm-player-status">
        {isTurn && remain !== null ? (
          <span
            className={
              "gm-player-countdown" + (urgent ? " is-urgent" : "")
            }
          >
            {remain}s
          </span>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}

function InviteScreen({
  avatars,
  onInvite,
  onBack,
}: {
  avatars: { levi?: string | null; erwin?: string | null };
  onInvite: (m: TTTMode) => void;
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
        <div className="gm-title">井字棋</div>
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
          desc="3×3 对决"
          onClick={() => onInvite("you-levi")}
        />
        <InviteRow
          name="Erwin"
          avatar={avatars.erwin}
          fallback="E"
          desc="3×3 对决"
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
          desc="你 + Levi + Erwin · 4×4 棋盘"
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
  mode: TTTMode;
  avatars: { levi?: string | null; erwin?: string | null };
  onCancel: () => void;
}) {
  const s = modeSlots(mode);
  const opps: ("levi" | "erwin")[] = [];
  if (s.black !== "you") opps.push(s.black as "levi" | "erwin");
  if (s.white !== "you") opps.push(s.white as "levi" | "erwin");
  if (s.green && s.green !== "you") opps.push(s.green as "levi" | "erwin");
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