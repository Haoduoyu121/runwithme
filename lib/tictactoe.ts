export type Cell = 0 | 1 | 2 | 3;
export type Board3 = Cell[][];

export function emptyBoard3(size: 3 | 4): Board3 {
  return Array.from({ length: size }, () =>
    Array<Cell>(size).fill(0)
  );
}

export function boardSize(mode: TTTMode): 3 | 4 {
  return mode === "three" ? 4 : 3;
}

export type TTTMode =
  | "you-levi"
  | "you-erwin"
  | "watch"
  | "three";

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** 连成 3 个即赢（横竖斜） */
export function checkWin3(
  board: Board3,
  r: number,
  c: number
): { winner: Cell; line: [number, number][] } | null {
  const s = board[r][c];
  if (!s) return null;
  const N = board.length;
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [[r, c]];
    for (let k = 1; k < 3; k++) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (
        nr < 0 || nr >= N ||
        nc < 0 || nc >= N ||
        board[nr][nc] !== s
      )
        break;
      line.push([nr, nc]);
    }
    for (let k = 1; k < 3; k++) {
      const nr = r - dr * k;
      const nc = c - dc * k;
      if (
        nr < 0 || nr >= N ||
        nc < 0 || nc >= N ||
        board[nr][nc] !== s
      )
        break;
      line.unshift([nr, nc]);
    }
    if (line.length >= 3) return { winner: s, line };
  }
  return null;
}

export function isFull3(board: Board3): boolean {
  for (const row of board) {
    for (const c of row) if (c === 0) return false;
  }
  return true;
}

function emptyCells(board: Board3): [number, number][] {
  const N = board.length;
  const out: [number, number][] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] === 0) out.push([r, c]);
    }
  }
  return out;
}

/* ---------- AI ---------- */

export function pickMoveTTT(
  board: Board3,
  me: Cell,
  opponents: Cell[]
): [number, number] {
  const N = board.length;
  const empty = emptyCells(board);
  if (empty.length === 0) return [0, 0];

  /* 1. 自己能赢 → 下 */
  for (const [r, c] of empty) {
    const b = board.map((row) => [...row]) as Board3;
    b[r][c] = me;
    if (checkWin3(b, r, c)) return [r, c];
  }

  /* 2. 对手能赢 → 堵 */
  for (const opp of opponents) {
    for (const [r, c] of empty) {
      const b = board.map((row) => [...row]) as Board3;
      b[r][c] = opp;
      if (checkWin3(b, r, c)) return [r, c];
    }
  }

  /* 3. 优先中心区 */
  const mid = Math.floor(N / 2);
  const centerCands = empty.filter(
    ([r, c]) =>
      Math.abs(r - mid) <= 1 && Math.abs(c - mid) <= 1
  );
  if (centerCands.length > 0) {
    return centerCands[
      Math.floor(Math.random() * centerCands.length)
    ];
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

export function pickRandomTTT(
  board: Board3
): [number, number] {
  const empty = emptyCells(board);
  if (empty.length === 0) return [0, 0];
  return empty[Math.floor(Math.random() * empty.length)];
}