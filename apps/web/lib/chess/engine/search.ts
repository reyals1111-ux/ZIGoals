import {BISHOP, Board, F_CAPTURE, F_PROMO, KING, WHITE, moveFlags, moveFrom, movePromo, moveTo, moveUci, onBoard} from './board';
import type {LevelLimits} from './levels';
export {ENGINE_LEVELS, limitsOf, type EngineLevel, type LevelLimits} from './levels';

/**
 * Session AV lane 2 (roadmap, BL-10): the engine's search and its simple evaluation. Iterative deepening alpha-beta
 * (negamax) with a transposition table, the best move of the last search tried first, captures ordered by the most
 * valuable victim, killer and history moves for the quiet ones, a quiescence search of captures and promotions so it does
 * not stop in the middle of an exchange, one ply more when in check, and draws by repetition and the fifty-move rule seen
 * inside the search. The evaluation is material and piece-square tables (the king's blended from the middlegame to the
 * endgame) and a bishop pair. Three levels by how deep and how long it may look; deterministic for a depth limit.
 */
export const MATE = 30_000;
const VALUE = [0, 100, 320, 330, 500, 900, 0];
// Piece-square tables from White's side, rank 8 first (the common printed layout); index (7 - rank) * 8 + file.
const T = (rows: string) => Int16Array.from(rows.trim().split(/[\s,]+/).map(Number));
const PST = [new Int16Array(64),
  T(`0 0 0 0 0 0 0 0, 50 50 50 50 50 50 50 50, 10 10 20 30 30 20 10 10, 5 5 10 25 25 10 5 5, 0 0 0 20 20 0 0 0, 5 -5 -10 0 0 -10 -5 5, 5 10 10 -20 -20 10 10 5, 0 0 0 0 0 0 0 0`),
  T(`-50 -40 -30 -30 -30 -30 -40 -50, -40 -20 0 0 0 0 -20 -40, -30 0 10 15 15 10 0 -30, -30 5 15 20 20 15 5 -30, -30 0 15 20 20 15 0 -30, -30 5 10 15 15 10 5 -30, -40 -20 0 5 5 0 -20 -40, -50 -40 -30 -30 -30 -30 -40 -50`),
  T(`-20 -10 -10 -10 -10 -10 -10 -20, -10 0 0 0 0 0 0 -10, -10 0 5 10 10 5 0 -10, -10 5 5 10 10 5 5 -10, -10 0 10 10 10 10 0 -10, -10 10 10 10 10 10 10 -10, -10 5 0 0 0 0 5 -10, -20 -10 -10 -10 -10 -10 -10 -20`),
  T(`0 0 0 0 0 0 0 0, 5 10 10 10 10 10 10 5, -5 0 0 0 0 0 0 -5, -5 0 0 0 0 0 0 -5, -5 0 0 0 0 0 0 -5, -5 0 0 0 0 0 0 -5, -5 0 0 0 0 0 0 -5, 0 0 0 5 5 0 0 0`),
  T(`-20 -10 -10 -5 -5 -10 -10 -20, -10 0 0 0 0 0 0 -10, -10 0 5 5 5 5 0 -10, -5 0 5 5 5 5 0 -5, 0 0 5 5 5 5 0 -5, -10 5 5 5 5 5 0 -10, -10 0 5 0 0 0 0 -10, -20 -10 -10 -5 -5 -10 -10 -20`),
  T(`-30 -40 -40 -50 -50 -40 -40 -30, -30 -40 -40 -50 -50 -40 -40 -30, -30 -40 -40 -50 -50 -40 -40 -30, -30 -40 -40 -50 -50 -40 -40 -30, -20 -30 -30 -40 -40 -30 -30 -20, -10 -20 -20 -20 -20 -20 -20 -10, 20 20 0 0 0 0 20 20, 20 30 10 0 0 10 30 20`),
];
const KING_END = T(`-50 -40 -30 -20 -20 -30 -40 -50, -30 -20 -10 0 0 -10 -20 -30, -30 -10 20 30 30 20 -10 -30, -30 -10 30 40 40 30 -10 -30, -30 -10 30 40 40 30 -10 -30, -30 -10 20 30 30 20 -10 -30, -30 -30 0 0 0 0 -30 -30, -50 -30 -30 -30 -30 -30 -30 -50`);
const PHASE = [0, 0, 1, 1, 2, 4, 0];
/** The position's score for the side to move, in centipawns. Pure. */
export function evaluate(b: Board): number {
  let mg = 0, eg = 0, phase = 0; const bishops = [0, 0], kingIdx = [0, 0];
  for (let s = 0; s < 128; s++) {
    if (!onBoard(s)) { s += 7; continue; }
    const p = b.sq[s]!; if (!p) continue;
    const type = p > 0 ? p : -p, white = p > 0, rank = s >> 4, file = s & 7, idx = (white ? 7 - rank : rank) * 8 + file, sign = white ? 1 : -1;
    phase += PHASE[type]!;
    if (type === BISHOP) bishops[white ? 0 : 1]!++;
    if (type === KING) { kingIdx[white ? 0 : 1] = idx; continue; }
    const v = (VALUE[type]! + PST[type]![idx]!) * sign; mg += v; eg += v;
  }
  mg += PST[KING]![kingIdx[0]!]! - PST[KING]![kingIdx[1]!]!; eg += KING_END[kingIdx[0]!]! - KING_END[kingIdx[1]!]!;
  const pair = (bishops[0]! >= 2 ? 30 : 0) - (bishops[1]! >= 2 ? 30 : 0);
  const p = Math.min(phase, 24), score = Math.round((mg * p + eg * (24 - p)) / 24) + pair;
  return b.side === WHITE ? score : -score;
}

type Entry = {depth: number; score: number; flag: 0 | 1 | 2; move: number};
const EXACT = 0, LOWER = 1, UPPER = 2, TT_MAX = 400_000;
export type SearchResult = {move: number; uci: string; depth: number; score: number; nodes: number; ms: number};
/**
 * The best move for the side to move within the limits (a depth, a time in ms, and optionally a node count for tests).
 * Returns the move of the deepest search that finished (a search cut by the clock keeps the last finished one), or
 * move 0 when there is no legal move. `now` is the clock (performance.now in the worker).
 */
export function search(b: Board, limits: LevelLimits & {nodes?: number}, now: () => number = () => performance.now()): SearchResult {
  const started = now(), tt = new Map<number, Entry>(), killers: number[][] = [], history = new Int32Array(128 * 128);
  let nodes = 0, stopped = false;
  const out = (): boolean => {
    if (stopped) return true;
    if ((limits.nodes !== undefined && nodes >= limits.nodes) || ((nodes & 1023) === 0 && now() - started >= limits.ms)) stopped = true;
    return stopped;
  };
  const scoreMove = (m: number, ttMove: number, ply: number): number => {
    if (m === ttMove) return 1_000_000;
    const flags = moveFlags(m);
    if (flags & (F_CAPTURE | F_PROMO)) { const victim = flags & F_CAPTURE ? Math.abs(b.captured(m)) : 0; return 100_000 + VALUE[victim]! * 10 - VALUE[Math.abs(b.sq[moveFrom(m)]!)]! / 10 + (flags & F_PROMO ? VALUE[movePromo(m)]! : 0); }
    const k = killers[ply];
    if (k && (k[0] === m || k[1] === m)) return 90_000;
    return history[moveFrom(m) * 128 + moveTo(m)]!;
  };
  const ordered = (moves: number[], ttMove: number, ply: number) => moves.map(m => [m, scoreMove(m, ttMove, ply)] as const).sort((x, y) => y[1] - x[1] || x[0] - y[0]).map(([m]) => m);
  function quiesce(alpha: number, beta: number, ply: number): number {
    nodes++;
    if (out()) return 0;
    const stand = evaluate(b);
    if (stand >= beta || ply >= 48) return stand;
    if (stand > alpha) alpha = stand;
    for (const m of ordered(b.generate(true), 0, ply)) {
      if (!b.make(m)) continue;
      const score = -quiesce(-beta, -alpha, ply + 1);
      b.unmake();
      if (stopped) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }
  function negamax(depth: number, alpha: number, beta: number, ply: number): number {
    nodes++;
    if (out()) return 0;
    if (ply > 0 && (b.halfmove >= 100 || b.repetitions() >= 2)) return 0; // a draw within the search, or by the rules
    const check = b.inCheck();
    if (check) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    const key = b.key(), hit = tt.get(key), alpha0 = alpha;
    if (hit && hit.depth >= depth && ply > 0) {
      const s = hit.score > MATE - 500 ? hit.score - ply : hit.score < -MATE + 500 ? hit.score + ply : hit.score;
      if (hit.flag === EXACT || (hit.flag === LOWER && s >= beta) || (hit.flag === UPPER && s <= alpha)) return s;
    }
    let best = -Infinity, bestMove = 0, legal = 0;
    for (const m of ordered(b.generate(), hit?.move ?? 0, ply)) {
      if (!b.make(m)) continue;
      legal++;
      const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
      b.unmake();
      if (stopped) return 0;
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!(moveFlags(m) & (F_CAPTURE | F_PROMO))) { const k = killers[ply] ??= [0, 0]; if (k[0] !== m) { k[1] = k[0]!; k[0] = m; } history[moveFrom(m) * 128 + moveTo(m)]! += depth * depth; }
        break;
      }
    }
    if (!legal) return check ? -MATE + ply : 0;
    if (tt.size >= TT_MAX) tt.clear();
    const stored = best > MATE - 500 ? best + ply : best < -MATE + 500 ? best - ply : best;
    tt.set(key, {depth, score: stored, flag: best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT, move: bestMove});
    return best;
  }
  // Iterative deepening at the root: each finished depth orders the next; a depth cut short keeps the last finished move.
  const moves = b.legal();
  if (!moves.length) return {move: 0, uci: '', depth: 0, score: b.inCheck() ? -MATE : 0, nodes: 0, ms: 0};
  let bestMove = ordered(moves, 0, 0)[0]!, bestScore = -Infinity, done = 0;
  for (let depth = 1; depth <= Math.max(1, limits.depth); depth++) {
    let alpha = -Infinity, iterBest = 0, iterScore = -Infinity;
    for (const m of ordered(moves, bestMove, 0)) {
      b.make(m);
      const score = -negamax(depth - 1, -Infinity, -alpha, 1);
      b.unmake();
      if (stopped) break;
      if (score > iterScore) { iterScore = score; iterBest = m; }
      if (score > alpha) alpha = score;
    }
    if (stopped) { if (!done && iterBest) { bestMove = iterBest; bestScore = iterScore; } break; }
    bestMove = iterBest; bestScore = iterScore; done = depth;
    if (Math.abs(bestScore) > MATE - 500) break; // a forced mate found: looking deeper changes nothing
  }
  return {move: bestMove, uci: moveUci(bestMove), depth: done, score: bestScore === -Infinity ? 0 : bestScore + 0 /* never -0 */, nodes, ms: Math.round(now() - started)};
}
