export const BOARD_SIZE = 15;
export type Stone = 0 | 1 | 2;
export type Board = Stone[][];

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Stone>(BOARD_SIZE).fill(0)
  );
}

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function checkWin(
  board: Board,
  r: number,
  c: number
): { winner: Stone; line: [number, number][] } | null {
  const s = board[r][c];
  if (!s) return null;
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [[r, c]];
    for (let k = 1; k < 5; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (
        nr < 0 || nr >= BOARD_SIZE ||
        nc < 0 || nc >= BOARD_SIZE ||
        board[nr][nc] !== s
      )
        break;
      line.push([nr, nc]);
    }
    for (let k = 1; k < 5; k++) {
      const nr = r - dr * k;
      const nc = c - dc * k;
      if (
        nr < 0 || nr >= BOARD_SIZE ||
        nc < 0 || nc >= BOARD_SIZE ||
        board[nr][nc] !== s
      )
        break;
      line.unshift([nr, nc]);
    }
    if (line.length >= 5) return { winner: s, line };
  }
  return null;
}

export function isFull(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

/* ---------- 棋力评分 ---------- */

const SCORES = {
  five: 1000000,
  fourOpen: 100000,
  fourBlock: 10000,
  threeOpen: 8000,
  threeBlock: 800,
  twoOpen: 500,
  twoBlock: 50,
  one: 5,
};

function scoreAt(
  board: Board,
  r: number,
  c: number,
  s: Stone
): number {
  if (board[r][c] !== 0) return -1;
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let count = 1;
    let openA = false;
    let openB = false;
    for (let k = 1; k < 5; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
      if (board[nr][nc] === s) count++;
      else {
        if (board[nr][nc] === 0) openA = true;
        break;
      }
    }
    for (let k = 1; k < 5; k++) {
      const nr = r - dr * k;
      const nc = c - dc * k;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
      if (board[nr][nc] === s) count++;
      else {
        if (board[nr][nc] === 0) openB = true;
        break;
      }
    }
    const open = (openA ? 1 : 0) + (openB ? 1 : 0);
    if (count >= 5) total += SCORES.five;
    else if (count === 4) {
      if (open === 2) total += SCORES.fourOpen;
      else if (open === 1) total += SCORES.fourBlock;
    } else if (count === 3) {
      if (open === 2) total += SCORES.threeOpen;
      else if (open === 1) total += SCORES.threeBlock;
    } else if (count === 2) {
      if (open === 2) total += SCORES.twoOpen;
      else if (open === 1) total += SCORES.twoBlock;
    } else if (count === 1) {
      total += SCORES.one;
    }
  }
  return total;
}

function candidates(board: Board): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  let has = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) continue;
      has = true;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= BOARD_SIZE) continue;
          if (nc < 0 || nc >= BOARD_SIZE) continue;
          if (board[nr][nc] !== 0) continue;
          const k = `${nr},${nc}`;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push([nr, nc]);
        }
      }
    }
  }
  if (!has) {
    const mid = Math.floor(BOARD_SIZE / 2);
    out.push([mid, mid]);
  }
  return out;
}

/* ---------- 风格 ---------- */

export type AiStyle = "aggressive" | "defensive" | "balanced" | "chaotic";

export const STYLE_PARAMS: Record<
  AiStyle,
  { attack: number; defense: number; randomRate: number }
> = {
  aggressive: { attack: 1.6, defense: 0.55, randomRate: 0.04 },
  defensive: { attack: 0.7, defense: 1.5, randomRate: 0.04 },
  balanced: { attack: 1.05, defense: 1.0, randomRate: 0.08 },
  chaotic: { attack: 0.85, defense: 0.65, randomRate: 0.45 },
};

export const STYLE_LABELS: Record<AiStyle, string> = {
  aggressive: "激进",
  defensive: "稳健",
  balanced: "均衡",
  chaotic: "随性",
};

export const STYLE_DESC: Record<AiStyle, string> = {
  aggressive: "多进攻，少防守",
  defensive: "稳扎稳打，多封堵",
  balanced: "攻守均衡",
  chaotic: "经常乱下，出其不意",
};

/** 默认（无风格） */
export function pickMove(board: Board, me: Stone): [number, number] {
  return pickMoveStyled(board, me, "balanced");
}

export function pickMoveStyled(
  board: Board,
  me: Stone,
  style: AiStyle
): [number, number] {
  const p = STYLE_PARAMS[style];
  const opp: Stone = me === 1 ? 2 : 1;
  const cands = candidates(board);
  if (cands.length === 0) return [7, 7];

  /* 一定概率乱下 */
  if (Math.random() < p.randomRate) {
    return cands[Math.floor(Math.random() * cands.length)];
  }

  let best: [number, number] = cands[0];
  let bestScore = -Infinity;
  for (const [r, c] of cands) {
    const myScore = scoreAt(board, r, c, me);
    const oppScore = scoreAt(board, r, c, opp);
    const total = myScore * p.attack + oppScore * p.defense;
    if (total > bestScore) {
      bestScore = total;
      best = [r, c];
    }
  }
  return best;
}

/** 随机合法点（用于用户超时） */
export function pickRandom(
  board: Board,
  me: Stone
): [number, number] {
  const cands = candidates(board);
  if (cands.length === 0) return [7, 7];
  return cands[Math.floor(Math.random() * cands.length)];
  void me;
}