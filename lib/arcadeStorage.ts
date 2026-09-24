/* RunWithme Arcade 统一战绩 + 奖惩卡池 */

import {
  loadStats as loadGomokuStats,
  saveStats as saveGomokuStats,
  type GomoStats,
} from "./gomokuStats";
import {
  loadTTTStats,
  saveTTTStats,
  type TTTStats,
} from "./tictactoeStats";
import {
  loadUnoStats,
  saveUnoStats,
  type UnoStats,
} from "./unoStats";

/* ==================== 战绩聚合 ==================== */

export type ArcadePlayer = "you" | "levi" | "erwin";

export type GameStatsRow = {
  who: ArcadePlayer;
  wins: number;
  losses: number;
  draws: number;
};

export type ArcadeGameStats = {
  key: "gomoku" | "tictactoe" | "uno";
  label: string;
  icon: string;
  total: number;
  rows: GameStatsRow[];
};

function statsFromGomo(s: GomoStats): {
  total: number;
  rows: GameStatsRow[];
} {
  return {
    total: s.total,
    rows: (["you", "levi", "erwin"] as ArcadePlayer[]).map((p) => ({
      who: p,
      wins: s.wins[p] || 0,
      losses: s.losses[p] || 0,
      draws: s.draws[p] || 0,
    })),
  };
}

function statsFromTTT(s: TTTStats): {
  total: number;
  rows: GameStatsRow[];
} {
  return {
    total: s.total,
    rows: (["you", "levi", "erwin"] as ArcadePlayer[]).map((p) => ({
      who: p,
      wins: s.wins[p] || 0,
      losses: s.losses[p] || 0,
      draws: s.draws[p] || 0,
    })),
  };
}

function statsFromUno(s: UnoStats): {
  total: number;
  rows: GameStatsRow[];
} {
  return {
    total: s.total,
    rows: (["you", "levi", "erwin"] as ArcadePlayer[]).map((p) => ({
      who: p,
      wins: s.wins[p] || 0,
      losses: s.losses[p] || 0,
      draws: 0,
    })),
  };
}

export function loadArcadeStats(): ArcadeGameStats[] {
  const g = statsFromGomo(loadGomokuStats());
  const t = statsFromTTT(loadTTTStats());
  const u = statsFromUno(loadUnoStats());
  return [
    {
      key: "gomoku",
      label: "五子棋",
      icon: "◉",
      total: g.total,
      rows: g.rows,
    },
    {
      key: "tictactoe",
      label: "井字棋",
      icon: "#",
      total: t.total,
      rows: t.rows,
    },
    {
      key: "uno",
      label: "UNO",
      icon: "U",
      total: u.total,
      rows: u.rows,
    },
  ];
}

/** 手动编辑某格，回写对应游戏的 stats */
export function updateArcadeStat(
  game: "gomoku" | "tictactoe" | "uno",
  who: ArcadePlayer,
  field: "wins" | "losses" | "draws",
  value: number
): void {
  const v = Math.max(0, Math.floor(value));
  if (game === "gomoku") {
    const s = loadGomokuStats();
    const next: GomoStats = {
      wins: { ...s.wins, [who]: field === "wins" ? v : s.wins[who] || 0 },
      losses: {
        ...s.losses,
        [who]: field === "losses" ? v : s.losses[who] || 0,
      },
      draws: {
        ...s.draws,
        [who]: field === "draws" ? v : s.draws[who] || 0,
      },
      total: s.total,
    };
    saveGomokuStats(next);
    return;
  }
  if (game === "tictactoe") {
    const s = loadTTTStats();
    const next: TTTStats = {
      wins: { ...s.wins, [who]: field === "wins" ? v : s.wins[who] || 0 },
      losses: {
        ...s.losses,
        [who]: field === "losses" ? v : s.losses[who] || 0,
      },
      draws: {
        ...s.draws,
        [who]: field === "draws" ? v : s.draws[who] || 0,
      },
      total: s.total,
    };
    saveTTTStats(next);
    return;
  }
  if (game === "uno") {
    const s = loadUnoStats();
    const next: UnoStats = {
      wins: { ...s.wins, [who]: field === "wins" ? v : s.wins[who] || 0 },
      losses: {
        ...s.losses,
        [who]: field === "losses" ? v : s.losses[who] || 0,
      },
      total: s.total,
    };
    saveUnoStats(next);
    return;
  }
}

export function resetAllArcadeStats(): void {
  saveGomokuStats({ wins: {}, losses: {}, draws: {}, total: 0 });
  saveTTTStats({ wins: {}, losses: {}, draws: {}, total: 0 });
  saveUnoStats({ wins: {}, losses: {}, total: 0 });
}

/* ==================== 奖惩卡池 ==================== */

const CARD_KEY = "runwithme_arcade_rewards_v1";

export type RewardCards = {
  rewards: string[];
  penalties: string[];
};

const DEFAULT_CARDS: RewardCards = {
  rewards: [
    "指定下一局游戏模式",
    "点一首歌让对方唱",
    "获得 10 分钟'打断不还嘴'特权",
    "让对方说一句好话",
    "让对方倒一杯水",
    "亲一下额头",
    "抱 10 秒",
    "明天的早餐由你点",
  ],
  penalties: [
    "学对方说话一整天",
    "倒立说三句恭维话",
    "明天禁止喝咖啡",
    "写 100 字检讨",
    "唱一首歌",
    "做 20 个俯卧撑",
    "为对方按摩 5 分钟",
    "说出三件对方不知道的事",
  ],
};

export function loadRewardCards(): RewardCards {
  if (typeof window === "undefined") return { ...DEFAULT_CARDS };
  try {
    const raw = JSON.parse(localStorage.getItem(CARD_KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_CARDS };
    return {
      rewards: Array.isArray(raw.rewards)
        ? raw.rewards.filter(
            (x: unknown): x is string =>
              typeof x === "string" && x.trim() !== ""
          )
        : DEFAULT_CARDS.rewards,
      penalties: Array.isArray(raw.penalties)
        ? raw.penalties.filter(
            (x: unknown): x is string =>
              typeof x === "string" && x.trim() !== ""
          )
        : DEFAULT_CARDS.penalties,
    };
  } catch {
    return { ...DEFAULT_CARDS };
  }
}

export function saveRewardCards(c: RewardCards): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CARD_KEY, JSON.stringify(c));
}

export function resetRewardCards(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CARD_KEY);
}

export function drawReward(): string {
  const c = loadRewardCards();
  if (c.rewards.length === 0) return "（奖励卡池是空的）";
  return c.rewards[Math.floor(Math.random() * c.rewards.length)];
}

export function drawPenalty(): string {
  const c = loadRewardCards();
  if (c.penalties.length === 0) return "（惩罚卡池是空的）";
  return c.penalties[Math.floor(Math.random() * c.penalties.length)];
}