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
  Settings,
  X,
  Send,
} from "lucide-react";
import {
  BOARD_SIZE,
  emptyBoard,
  checkWin,
  isFull,
  pickMoveStyled,
  pickRandom,
  STYLE_LABELS,
  STYLE_DESC,
  type Board,
  type Stone,
  type AiStyle,
} from "@/lib/gomoku";
import type { GameChatContext } from "@/data/gameChatPool";
import {
  loadGameChatPool,
  pickLine,
  type StoredPool,
} from "@/lib/gameChatStorage";
import {
  PLAYER_PROFILE,
  pickRefuseLine,
  loadStyles,
  saveStyles,
  DEFAULT_STYLES,
  type PlayerId,
  type PlayerStyle,
} from "@/lib/gomokuPlayers";
import {
  loadStats,
  recordResult,
  type GomoStats,
} from "@/lib/gomokuStats";
import { useCharacterAvatars } from "@/lib/useCharacterAvatars";
import RewardPromptBar from "./arcade/RewardPromptBar";

type Props = { onBack: () => void };

type Mode = "you-levi" | "you-erwin" | "watch";
type Screen = "invite" | "waiting" | "refused" | "game" | "ended";

type ChatMsg = {
  id: string;
  who: PlayerId;
  text: string;
  ts: number;
};

const MODE_OPPONENT: Record<Mode, PlayerId[]> = {
  "you-levi": ["levi"],
  "you-erwin": ["erwin"],
  watch: ["levi", "erwin"],
};

const TURN_MS = 30000;
const USER_CHAT_MAX = 60;

function genId(): string {
  return "c-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

function ctxForPlayer(
  who: "levi" | "erwin",
  board: Board,
  me: Stone
): GameChatContext {
  /* 统计双方已落子数 */
  let mine = 0;
  let theirs = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const s = board[r][c];
      if (s === 0) continue;
      if (s === me) mine++;
      else theirs++;
    }
  }
  if (mine === 0 && theirs === 0) return "opening";
  if (theirs - mine >= 3) return "trailing";
  if (mine - theirs >= 3) return "leading";
  return "mid";
}

export default function GomokuApp({ onBack }: Props) {
  const avatars = useCharacterAvatars();

  const [screen, setScreen] = useState<Screen>("invite");
  const [pendingMode, setPendingMode] = useState<Mode>("you-levi");
  const [mode, setMode] = useState<Mode>("you-levi");

  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<Stone>(1);
  const [winner, setWinner] = useState<{
    who: PlayerId | null;
    line: [number, number][];
  } | null>(null);
  const [stats, setStats] = useState<GomoStats>(() => loadStats());

  const [styles, setStyles] = useState<PlayerStyle>(DEFAULT_STYLES);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [chatPool, setChatPool] = useState<StoredPool | null>(null);

  /* 当前回合的截止时间戳 */
  const [turnDeadline, setTurnDeadline] = useState(0);
  const [remain, setRemain] = useState(30);
  const aiTimerRef = useRef<number | null>(null);
  const aiActionRef = useRef(false);

  /* 悔棋 */
  const [undoDialog, setUndoDialog] = useState<{
    requester: PlayerId;
    target: PlayerId;
    awaiting: "ai" | "user" | "result";
    result?: "accept" | "refuse";
  } | null>(null);

  /* 聊天 */
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const chatTimersRef = useRef<number[]>([]);

  const historyRef = useRef<Board[]>([]);
  const boardRef = useRef<Board>(board);
  const turnRef = useRef<Stone>(turn);
  const lastAiLineRef = useRef<string>("");

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  const players = useMemo(() => {
    const opp = MODE_OPPONENT[mode];
    if (mode === "watch") {
      return {
        black: "levi" as PlayerId,
        white: "erwin" as PlayerId,
      };
    }
    return {
      black: "you" as PlayerId,
      white: opp[0],
    };
  }, [mode]);

  useEffect(() => {
    setStyles(loadStyles());
    setChatPool(loadGameChatPool());
  }, []);

  /* ---------- 邀请 ---------- */

  function invite(m: Mode) {
    setPendingMode(m);
    setScreen("waiting");
    const opps = MODE_OPPONENT[m];
    let refused: "levi" | "erwin" | null = null;
    for (const o of opps as ("levi" | "erwin")[]) {
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

    setBoard(emptyBoard());
    setTurn(1);
    setWinner(null);
    setChat([]);
    historyRef.current = [emptyBoard()];
    setScreen("game");
    setMode(m);
  }

  /* ---------- 落子 ---------- */

  const placeStone = useCallback(
    (b: Board, r: number, c: number, s: Stone): Board => {
      const next = b.map((row) => [...row]) as Board;
      next[r][c] = s;
      return next;
    },
    []
  );

  const finishMove = useCallback(
    (next: Board, r: number, c: number) => {
      setBoard(next);
      historyRef.current.push(next);
      const w = checkWin(next, r, c);
      if (w) {
        const who: PlayerId | null =
          w.winner === 1 ? players.black : players.white;
        setWinner({ who, line: w.line });
        setScreen("ended");
        setStats(recordResult(stats, who));
        const other =
          who === players.black ? players.white : players.black;
        if (
          who &&
          other &&
          other !== "you" &&
          who !== "you"
        ) {
          pushChat(
            other,
            pickLine(
              chatPool ?? loadGameChatPool(),
              other as "levi" | "erwin",
              "lost"
            )
          );
        } else if (other !== "you") {
          pushChat(
            other as "levi" | "erwin",
            pickLine(
              chatPool ?? loadGameChatPool(),
              other as "levi" | "erwin",
              "won"
            )
          );
        }
        return true;
      }
      if (isFull(next)) {
        setWinner({ who: null, line: [] });
        setScreen("ended");
        setStats(recordResult(stats, null));
        return true;
      }
      setTurn((t) => (t === 1 ? 2 : 1));
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, stats]
  );

  /* ---------- 每回合开始：设置 deadline，如果是 AI，提前定好它落子时刻 ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (winner) return;

    /* 清掉上一轮 */
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;

    const now = Date.now();
    const deadline = now + TURN_MS;
    setTurnDeadline(deadline);
    setRemain(Math.ceil(TURN_MS / 1000));

    const curWho = turn === 1 ? players.black : players.white;
    if (curWho === "you") return;

    /* AI 在自己 30s 内随机提前落子：2s ~ 28s */
    const aiThinkMs = 2000 + Math.random() * 26000;
    aiActionRef.current = true;

    aiTimerRef.current = window.setTimeout(() => {
      aiTimerRef.current = null;
      aiActionRef.current = false;
      const snapBoard = boardRef.current;
      const snapTurn = turnRef.current;
      const style = styles[curWho as "levi" | "erwin"] || "balanced";
      const [r, c] = pickMoveStyled(snapBoard, snapTurn, style);
      const next = placeStone(snapBoard, r, c, snapTurn);
      finishMove(next, r, c);

      /* 偶尔说话 */
      if (Math.random() < 0.28) {
        const ctx = ctxForPlayer(
          curWho as "levi" | "erwin",
          next,
          snapTurn
        );
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
  }, [turn, screen, winner, players, mode]);

  /* ---------- 倒计时 tick ---------- */

  useEffect(() => {
    if (screen !== "game") return;
    if (winner) return;
    if (turnDeadline === 0) return;

    const t = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setRemain(left);

      /* 用户超时 → 系统帮下 */
      if (left <= 0) {
        const curWho = turnRef.current === 1
          ? players.black
          : players.white;
        if (curWho === "you" && !aiActionRef.current) {
          aiActionRef.current = true;
          const snapBoard = boardRef.current;
          const snapTurn = turnRef.current;
          const [r, c] = pickRandom(snapBoard, snapTurn);
          const next = placeStone(snapBoard, r, c, snapTurn);
          aiActionRef.current = false;
          finishMove(next, r, c);
        }
      }
    }, 250);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnDeadline, screen, winner, players]);

  /* ---------- 用户点击落子 ---------- */

  function handleClick(r: number, c: number) {
    if (screen !== "game") return;
    if (winner) return;
    if (board[r][c] !== 0) return;
    const curWho = turn === 1 ? players.black : players.white;
    if (curWho !== "you") return;
    if (aiActionRef.current) return;

    aiActionRef.current = true;
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    const next = placeStone(board, r, c, turn);
    aiActionRef.current = false;
    finishMove(next, r, c);

    /* 用户偶尔自嘲 */
    if (Math.random() < 0.15) {
      pushChat(
        "you",
        pickLine(
          chatPool ?? loadGameChatPool(),
          "levi",
          "smallTalk"
        )
      );
    }
  }

  /* ---------- 聊天 ---------- */

  function pushChat(who: PlayerId, text: string) {
    if (!text.trim()) return;
    const msg: ChatMsg = { id: genId(), who, text, ts: Date.now() };
    setChat((prev) => [...prev.slice(-49), msg]);
  }

  useEffect(() => {
    return () => {
      chatTimersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function userSendChat() {
    const text = chatDraft.trim().slice(0, USER_CHAT_MAX);
    if (!text) return;
    pushChat("you", text);
    setChatDraft("");

    /* 对方回应：80% 概率，延迟 1-3s */
    const opp: "levi" | "erwin" =
      mode === "you-levi"
        ? "levi"
        : mode === "you-erwin"
          ? "erwin"
          : Math.random() < 0.5
            ? "levi"
            : "erwin";
    if (Math.random() < 0.55) {
      const delay = 1000 + Math.random() * 2000;
      window.setTimeout(() => {
        const curBoard = boardRef.current;
        const myStone: Stone =
          players.black === opp ? 1 : players.white === opp ? 2 : 1;
        const ctx = ctxForPlayer(opp, curBoard, myStone);
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
    const back = hist.slice(0, Math.max(1, hist.length - 2));
    historyRef.current = back;
    const b = back[back.length - 1];
    setBoard(b);
    setTurn(1);
    setWinner(null);
    if (aiTimerRef.current !== null) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    aiActionRef.current = false;
    setScreen("game");
  }

  function userRequestUndo() {
    if (screen !== "game") return;
    if (winner) return;
    if (historyRef.current.length < 3) return;
    pushChat("you", "我可以悔一步吗？");
    const target =
      players.black === "you" ? players.white : players.black;
    requestUndo("you", target);
  }

  function resign() {
    if (!window.confirm("确定认输？")) return;
    const other =
      players.black === "you" ? players.white : players.black;
    setWinner({ who: other, line: [] });
    setScreen("ended");
    setStats(recordResult(stats, other));
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
  const currentWho: PlayerId =
    turn === 1 ? players.black : players.white;

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
        <div className="gm-title">五子棋</div>
        <button
          className="gh-icon-btn"
          onClick={() => setShowStylePanel(true)}
          aria-label="风格"
        >
          <Settings size={17} strokeWidth={2.2} />
        </button>
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
        <PlayerCard
          who={players.black}
          stone={1}
          isTurn={currentWho === players.black && !winner}
          remain={currentWho === players.black ? remain : null}
          avatars={avatars}
        />
        <div className="gm-vs">·</div>
        <PlayerCard
          who={players.white}
          stone={2}
          isTurn={currentWho === players.white && !winner}
          remain={currentWho === players.white ? remain : null}
          avatars={avatars}
        />
      </div>

      <div className="gm-board-wrap">
        <div
          className="gm-board"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {board.map((row, r) =>
            row.map((stone, c) => {
              const k = `${r},${c}`;
              const isWin = winSet.has(k);
              return (
                <button
                  key={k}
                  className={"gm-cell" + (isWin ? " is-win" : "")}
                  onClick={() => handleClick(r, c)}
                >
                  {stone !== 0 && (
                    <span
                      className={
                        "gm-stone gm-stone-" +
                        (stone === 1 ? "black" : "white") +
                        (isWin ? " is-win" : "")
                      }
                    />
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
          disabled={!!winner}
        >
          <Flag size={15} strokeWidth={2.4} />
          认输
        </button>
      </div>

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
                <div className="gm-panel-empty">
                  还没开始说话
                </div>
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

      {/* 风格面板 */}
      {showStylePanel && (
        <div
          className="gm-panel-backdrop"
          onClick={() => setShowStylePanel(false)}
        >
          <div
            className="gm-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gm-panel-head">
              <span>下棋风格</span>
              <button
                className="gh-icon-btn"
                onClick={() => setShowStylePanel(false)}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className="gm-panel-body">
              <StyleRow
                who="levi"
                current={styles.levi}
                onChange={(s) => {
                  const next = { ...styles, levi: s };
                  setStyles(next);
                  saveStyles(next);
                }}
              />
              <div style={{ height: 16 }} />
              <StyleRow
                who="erwin"
                current={styles.erwin}
                onChange={(s) => {
                  const next = { ...styles, erwin: s };
                  setStyles(next);
                  saveStyles(next);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 悔棋对话框 */}
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

      {/* 结算 */}
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
                    : players.black === "you" ||
                        players.white === "you"
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
   PlayerCard
   ========================================================= */

function PlayerCard({
  who,
  stone,
  isTurn,
  remain,
  avatars,
}: {
  who: PlayerId;
  stone: 1 | 2;
  isTurn: boolean;
  remain: number | null;
  avatars: { levi?: string | null; erwin?: string | null };
}) {
  const name = PLAYER_PROFILE[who].name;
  const avatar =
    who === "you"
      ? null
      : who === "levi"
        ? avatars.levi
        : avatars.erwin;
  const urgent = remain !== null && remain <= 5;
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
      <div className="gm-player-stone">
        <span
          className={
            "gm-stone-mini gm-stone-mini-" +
            (stone === 1 ? "black" : "white")
          }
        />
      </div>
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

function StyleRow({
  who,
  current,
  onChange,
}: {
  who: "levi" | "erwin";
  current: AiStyle;
  onChange: (s: AiStyle) => void;
}) {
  const name = who === "levi" ? "Levi" : "Erwin";
  const opts: AiStyle[] = [
    "aggressive",
    "defensive",
    "balanced",
    "chaotic",
  ];
  return (
    <div className="gm-style-group">
      <div className="gm-style-title">{name}</div>
      <div className="gm-style-opts">
        {opts.map((o) => (
          <button
            key={o}
            className={"gm-style-opt" + (current === o ? " is-on" : "")}
            onClick={() => onChange(o)}
          >
            <div className="gm-style-opt-name">{STYLE_LABELS[o]}</div>
            <div className="gm-style-opt-desc">{STYLE_DESC[o]}</div>
          </button>
        ))}
      </div>
    </div>
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
        <div className="gm-title">五子棋</div>
        <div style={{ width: 36 }} />
      </header>

      <div className="gm-invite-head">
        <div className="gm-invite-title">邀请谁</div>
        <div className="gm-invite-sub">他们可能会答应，也可能拒绝</div>
      </div>

      <div className="gm-invite-list">
        <InviteRow
          name="Levi"
          avatar={avatars.levi}
          fallback="L"
          desc="手很快 · 不太喜欢废话"
          onClick={() => onInvite("you-levi")}
        />
        <InviteRow
          name="Erwin"
          avatar={avatars.erwin}
          fallback="E"
          desc="慢条斯理 · 每一步都想很久"
          onClick={() => onInvite("you-erwin")}
        />
        <InviteRow
          name="看 Levi vs Erwin"
          avatar={null}
          fallback="✦"
          desc="让他们俩下，你在旁边看"
          onClick={() => onInvite("watch")}
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
  const opps = MODE_OPPONENT[mode];
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