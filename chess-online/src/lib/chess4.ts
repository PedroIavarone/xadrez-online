export type PlayerColor4 = 'red' | 'blue' | 'green' | 'yellow';
export type PieceType4 = 'r' | 'n' | 'b' | 'q' | 'k' | 'p';

export interface Piece4 {
  type: PieceType4;
  color: PlayerColor4;
}

export type Board4 = (Piece4 | null)[][];

export interface GameState4 {
  board: Board4;
  turn: PlayerColor4;
  eliminated: PlayerColor4[];
  lastMove: { from: [number, number]; to: [number, number] } | null;
}

export const TURN_ORDER: PlayerColor4[] = ['red', 'blue', 'yellow', 'green'];

// 14x14 board; corners (3x3) are invalid
export function isValidSquare(row: number, col: number): boolean {
  if (row < 0 || row > 13 || col < 0 || col > 13) return false;
  if (row < 3 && col < 3) return false;
  if (row < 3 && col > 10) return false;
  if (row > 10 && col < 3) return false;
  if (row > 10 && col > 10) return false;
  return true;
}

// Standard piece order from each player's left-to-right
const PIECE_ORDER_NORMAL: PieceType4[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
const PIECE_ORDER_MIRROR: PieceType4[] = ['r', 'n', 'b', 'k', 'q', 'b', 'n', 'r'];

export function createInitialBoard(): Board4 {
  const board: Board4 = Array(14).fill(null).map(() => Array(14).fill(null));

  // Red (top): back rank row 0, pawns row 1 (cols 3-10)
  for (let i = 0; i < 8; i++) {
    board[0][3 + i] = { type: PIECE_ORDER_NORMAL[i], color: 'red' };
    board[1][3 + i] = { type: 'p', color: 'red' };
  }

  // Yellow (bottom): back rank row 13, pawns row 12 (cols 3-10), mirrored
  for (let i = 0; i < 8; i++) {
    board[13][3 + i] = { type: PIECE_ORDER_MIRROR[i], color: 'yellow' };
    board[12][3 + i] = { type: 'p', color: 'yellow' };
  }

  // Blue (left): back rank col 0, pawns col 1 (rows 3-10)
  for (let i = 0; i < 8; i++) {
    board[3 + i][0] = { type: PIECE_ORDER_NORMAL[i], color: 'blue' };
    board[3 + i][1] = { type: 'p', color: 'blue' };
  }

  // Green (right): back rank col 13, pawns col 12 (rows 3-10), mirrored
  for (let i = 0; i < 8; i++) {
    board[3 + i][13] = { type: PIECE_ORDER_MIRROR[i], color: 'green' };
    board[3 + i][12] = { type: 'p', color: 'green' };
  }

  return board;
}

function getPawnForward(color: PlayerColor4): [number, number] {
  switch (color) {
    case 'red':    return [1, 0];   // moves down
    case 'yellow': return [-1, 0];  // moves up
    case 'blue':   return [0, 1];   // moves right
    case 'green':  return [0, -1];  // moves left
  }
}

function isOnStartSquare(row: number, col: number, color: PlayerColor4): boolean {
  switch (color) {
    case 'red':    return row === 1;
    case 'yellow': return row === 12;
    case 'blue':   return col === 1;
    case 'green':  return col === 12;
  }
}

export function getValidMoves(board: Board4, row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const { color, type } = piece;
  const moves: [number, number][] = [];

  const slide = (dr: number, dc: number) => {
    let r = row + dr, c = col + dc;
    while (isValidSquare(r, c)) {
      const t = board[r][c];
      if (t) {
        if (t.color !== color) moves.push([r, c]);
        break;
      }
      moves.push([r, c]);
      r += dr; c += dc;
    }
  };

  const step = (r: number, c: number) => {
    if (!isValidSquare(r, c)) return;
    const t = board[r][c];
    if (!t || t.color !== color) moves.push([r, c]);
  };

  switch (type) {
    case 'r':
      slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
      break;
    case 'b':
      slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
      break;
    case 'q':
      slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
      slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
      break;
    case 'k':
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])
        step(row + dr, col + dc);
      break;
    case 'n':
      for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])
        step(row + dr, col + dc);
      break;
    case 'p': {
      const [dr, dc] = getPawnForward(color);
      const fr = row + dr, fc = col + dc;
      // Forward
      if (isValidSquare(fr, fc) && !board[fr][fc]) {
        moves.push([fr, fc]);
        // Double from start
        if (isOnStartSquare(row, col, color)) {
          const fr2 = row + 2 * dr, fc2 = col + 2 * dc;
          if (isValidSquare(fr2, fc2) && !board[fr2][fc2]) moves.push([fr2, fc2]);
        }
      }
      // Diagonal captures (perpendicular to forward direction)
      const caps: [number, number][] = dc === 0
        ? [[fr, col + 1], [fr, col - 1]]
        : [[row + 1, fc], [row - 1, fc]];
      for (const [cr, cc] of caps) {
        if (isValidSquare(cr, cc) && board[cr][cc] && board[cr][cc]!.color !== color)
          moves.push([cr, cc]);
      }
      break;
    }
  }
  return moves;
}

export function makeMove4(
  state: GameState4,
  from: [number, number],
  to: [number, number],
): GameState4 {
  const board = state.board.map(row => [...row]);
  const [fr, fc] = from;
  const [tr, tc] = to;

  const piece = board[fr][fc];
  if (!piece) return state;

  const captured = board[tr][tc];
  const newEliminated = [...state.eliminated];
  if (captured?.type === 'k') newEliminated.push(captured.color);

  // Auto-promote pawn to queen
  let moved: Piece4 = { ...piece };
  if (piece.type === 'p') {
    const promoted =
      (piece.color === 'red'    && tr >= 11) ||
      (piece.color === 'yellow' && tr <= 2)  ||
      (piece.color === 'blue'   && tc >= 11) ||
      (piece.color === 'green'  && tc <= 2);
    if (promoted) moved = { type: 'q', color: piece.color };
  }

  board[tr][tc] = moved;
  board[fr][fc] = null;

  // Next turn, skipping eliminated players
  const idx = TURN_ORDER.indexOf(state.turn);
  let nextTurn = state.turn;
  for (let i = 1; i <= 4; i++) {
    const c = TURN_ORDER[(idx + i) % 4];
    if (!newEliminated.includes(c)) { nextTurn = c; break; }
  }

  return { board, turn: nextTurn, eliminated: newEliminated, lastMove: { from, to } };
}

export function getWinner4(state: GameState4): PlayerColor4 | null {
  const remaining = TURN_ORDER.filter(c => !state.eliminated.includes(c));
  return remaining.length === 1 ? remaining[0] : null;
}

export function createInitialState4(): GameState4 {
  return { board: createInitialBoard(), turn: 'red', eliminated: [], lastMove: null };
}
