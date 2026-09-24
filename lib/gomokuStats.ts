const KEY = "runwithme_gomoku_stats_v1";

export type GomoStats = {
  /* key: "levi" | "erwin" | "you" */
  wins: Record<string, number>;
  losses: Record<string, number>;
  draws: Record<string, number>;
  total: number;
};

const EMPTY: GomoStats = {
  wins: {},
  losses: {},
  draws: {},
  total: 0,
};

export function loadStats(): GomoStats {
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

export function saveStats(s: GomoStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function recordResult(
  s: GomoStats,
  winner: "you" | "levi" | "erwin" | null
): GomoStats {
  const next: GomoStats = {
    wins: { ...s.wins },
    losses: { ...s.losses },
    draws: { ...s.draws },
    total: s.total + 1,
  };
  if (winner === null) {
    next.draws.you = (next.draws.you || 0) + 1;
    next.draws.levi = (next.draws.levi || 0) + 1;
    next.draws.erwin = (next.draws.erwin || 0) + 1;
  } else {
    next.wins[winner] = (next.wins[winner] || 0) + 1;
    /* 另外两方记败 */
    const all = ["you", "levi", "erwin"];
    for (const k of all) {
      if (k !== winner) {
        next.losses[k] = (next.losses[k] || 0) + 1;
      }
    }
  }
  saveStats(next);
  return next;
}