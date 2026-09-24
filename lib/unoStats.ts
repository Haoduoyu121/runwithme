const KEY = "runwithme_uno_stats_v1";

export type UnoStats = {
  wins: Record<string, number>;
  losses: Record<string, number>;
  total: number;
};

const EMPTY: UnoStats = { wins: {}, losses: {}, total: 0 };

export function loadUnoStats(): UnoStats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      wins: raw.wins || {},
      losses: raw.losses || {},
      total: raw.total || 0,
    };
  } catch {
    return EMPTY;
  }
}

export function saveUnoStats(s: UnoStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function recordUno(
  s: UnoStats,
  winner: "you" | "levi" | "erwin"
): UnoStats {
  const next: UnoStats = {
    wins: { ...s.wins },
    losses: { ...s.losses },
    total: s.total + 1,
  };
  next.wins[winner] = (next.wins[winner] || 0) + 1;
  for (const k of ["you", "levi", "erwin"]) {
    if (k !== winner) {
      next.losses[k] = (next.losses[k] || 0) + 1;
    }
  }
  saveUnoStats(next);
  return next;
}