import {colorOf, inCheck, kingSquare, legalMoves, makeMove, toFen, toUci, type Color, type Move, type PieceChar, type Position} from './rules';

/**
 * Session AL fourth pass (BN-182, D-228, C-BN-24): a small computer opponent on this device, hand-written on the app's own
 * move generator (lib/chess/rules.ts): no engine, no dependency, nothing sent. An alpha-beta search to a fixed depth by
 * level, on material and a few placement tables, with captures searched a little further so it does not hang pieces
 * just past its horizon. Deterministic: the same position and level always give the same move. It plays to be a fair
 * practice partner, not a strong one, and says so.
 */
export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: readonly [Level, string, string][] = [
  ['easy', 'Easy', 'looks one move ahead'],
  ['medium', 'Medium', 'looks two moves ahead'],
  ['hard', 'Harder', 'looks three moves ahead'],
];
const DEPTH: Record<Level, number> = {easy: 1, medium: 2, hard: 3};
const VALUE: Record<string, number> = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0};
// Placement bonuses from White's side (a1 = 0 … h8 = 63); Black reads them mirrored. Small, so material decides.
const CENTRE = [0, 1, 2, 3, 3, 2, 1, 0];
const pst = (type: string, sq: number, color: Color): number => {
  const f = sq & 7, r = color === 'w' ? sq >> 3 : 7 - (sq >> 3), c = CENTRE[f]! + CENTRE[r]!;
  if (type === 'p') return r * 6 + (f >= 2 && f <= 5 ? r * 2 : 0);
  if (type === 'n') return c * 6 - 12;
  if (type === 'b') return c * 3;
  if (type === 'q') return c * 1;
  if (type === 'k') return r === 0 ? (f === 6 || f === 2 ? 20 : f === 4 ? 0 : 6) : -r * 10;
  return r === 6 ? 15 : 0;
};
/** The position's score for the side to move (centipawns). */
export function evaluate(pos: Position): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    const color = colorOf(p), type = p.toLowerCase(), v = VALUE[type]! + pst(type, sq, color);
    score += color === pos.turn ? v : -v;
  }
  return score;
}
const MATE = 100_000;
const order = (moves: Move[]) => moves.map(m => [m, (m.captured ? 10 * VALUE[m.captured.toLowerCase()]! - VALUE[m.piece.toLowerCase()]! / 10 : 0) + (m.promotion ? 800 : 0)] as const)
  .sort((a, b) => b[1] - a[1] || toUci(a[0]).localeCompare(toUci(b[0]))).map(([m]) => m);
function quiet(pos: Position, alpha: number, beta: number, depth: number): number {
  const stand = evaluate(pos);
  if (depth === 0 || stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  for (const m of order(legalMoves(pos).filter(x => x.captured || x.promotion))) {
    const score = -quiet(makeMove(pos, m), -beta, -alpha, depth - 1);
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
function search(pos: Position, depth: number, alpha: number, beta: number, ply: number): number {
  const moves = legalMoves(pos);
  if (!moves.length) return inCheck(pos) ? -MATE + ply : 0;
  if (pos.halfmove >= 100) return 0;
  if (depth === 0) return quiet(pos, alpha, beta, 3);
  for (const m of order(moves)) {
    const score = -search(makeMove(pos, m), depth - 1, -beta, -alpha, ply + 1);
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
/** The computer's move in `pos` at `level`, or null when the game is over. */
export function computerMove(pos: Position, level: Level): Move | null {
  const moves = order(legalMoves(pos));
  if (!moves.length) return null;
  let best = moves[0]!, bestScore = -Infinity;
  for (const m of moves) {
    const score = -search(makeMove(pos, m), DEPTH[level] - 1, -Infinity, -bestScore, 1);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

/** How a game on this device stands: still on, or over and why (checkmate, stalemate and the draws the rules know). */
export type GameEnd = {over: false} | {over: true; winner: Color | null; why: 'checkmate' | 'stalemate' | 'fifty-move' | 'repetition' | 'material' | 'resigned'};
const placement = (pos: Position) => toFen(pos).split(' ').slice(0, 4).join(' ');
function onlyKingsAndMinor(board: readonly (PieceChar | null)[]): boolean {
  const rest = board.filter((p): p is PieceChar => !!p && p.toLowerCase() !== 'k');
  return rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0]!.toLowerCase()));
}
export function gameEnd(pos: Position, history: readonly Position[]): GameEnd {
  const moves = legalMoves(pos);
  if (!moves.length) return inCheck(pos) ? {over: true, winner: pos.turn === 'w' ? 'b' : 'w', why: 'checkmate'} : {over: true, winner: null, why: 'stalemate'};
  if (pos.halfmove >= 100) return {over: true, winner: null, why: 'fifty-move'};
  if (onlyKingsAndMinor(pos.board)) return {over: true, winner: null, why: 'material'};
  const now = placement(pos);
  if ([...history, pos].filter(p => placement(p) === now).length >= 3) return {over: true, winner: null, why: 'repetition'};
  return {over: false};
}
export const END_WORDS: Record<Exclude<GameEnd, {over: false}>['why'], string> = {
  checkmate: 'Checkmate', stalemate: 'Stalemate: a draw', 'fifty-move': 'A draw: fifty moves without a capture or a pawn move',
  repetition: 'A draw: the same position three times', material: 'A draw: neither side can checkmate', resigned: 'Resigned',
};
/** The king's square of the side in check, for the board's check mark. */
export const checkSquare = (pos: Position) => inCheck(pos) ? kingSquare(pos.board, pos.turn) : null;
