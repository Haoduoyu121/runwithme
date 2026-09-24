const KEY = "runwithme_tictactoe_stats_v1";

export type TTTStats = {
  wins: Record<string, number>;
  losses: Record<string, number>;
  draws: Record<string, number>;
  total: number;
};

const EMPTY: TTTStats = {
  wins: {},
  losses: {},
  draws: {},
  total: 0,
};

export function loadTTTStats(): TTTStats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      wins: raw.wins || {},
      losses: raw.losses || {},
      draws: raw.draws || {},
      total: raw.total || 0,
    };
  } catch {
    return EMPTY;
  }
}

export function saveTTTStats(s: TTTStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function recordTTT(
  s: TTTStats,
  winner: "you" | "levi" | "erwin" | null
): TTTStats {
  const next: TTTStats = {
    wins: { ...s.wins },
    losses: { ...s.losses },
    draws: { ...s.draws },
    total: s.total + 1,
  };
  if (winner === null) {
    for (const k of ["you", "levi", "erwin"]) {
      next.draws[k] = (next.draws[k] || 0) + 1;
    }
  } else {
    next.wins[winner] = (next.wins[winner] || 0) + 1;
    for (const k of ["you", "levi", "erwin"]) {
      if (k !== winner) {
        next.losses[k] = (next.losses[k] || 0) + 1;
      }
    }
  }
  saveTTTStats(next);
  return next;
}