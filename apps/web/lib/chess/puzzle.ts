import {LICHESS} from './lichess';
import {findUci, legalMoves, makeMove, outcome, parseFen, parseMoveText, startPosition, toFen, toUci, UCI, type Position} from './rules';

/**
 * Session AK (ADR-036 Q8, lane C): Lichess's daily puzzle, GET https://lichess.org/api/puzzle/daily (no key, `security:
 * []`, CORS `*`; checked 2026-10-31). Its answer carries the puzzle's FEN (or, in older answers, the game's moves up to
 * it as SAN, `initialPly` being the last one) and the solution as UCI moves: the person's move, the reply, and so on.
 * The solution is checked here, move by move; as on Lichess, any move that mates also solves it. Nothing is sent back.
 */
export const DAILY_PUZZLE_URL = `${LICHESS}/api/puzzle/daily`;
export type DailyPuzzle = {id: string; rating: number | null; themes: string[]; fen: string; lastMove: string | null; solution: string[]; gameId: string | null; color: 'white' | 'black'; url: string};
export class PuzzleError extends Error { constructor(message: string) { super(message); this.name = 'PuzzleError'; } }
const obj = (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
/** Reads and checks the answer: the start position, and a solution that is legal move after move from it. */
export function parseDailyPuzzle(data: unknown): DailyPuzzle {
  const root = obj(data), puzzle = obj(root?.puzzle), game = obj(root?.game);
  if (!puzzle || typeof puzzle.id !== 'string' || !/^[A-Za-z0-9]{3,12}$/.test(puzzle.id)) throw new PuzzleError('Lichess sent a puzzle this page cannot read.');
  const solution = Array.isArray(puzzle.solution) ? puzzle.solution : [];
  if (!solution.length || solution.length > 40 || !solution.every(m => typeof m === 'string' && UCI.test(m))) throw new PuzzleError('Lichess sent a puzzle this page cannot read.');
  let start: Position | null = typeof puzzle.fen === 'string' ? parseFen(puzzle.fen) : null;
  let lastMove: string | null = typeof puzzle.lastMove === 'string' && UCI.test(puzzle.lastMove) ? puzzle.lastMove : null;
  if (!start && typeof game?.pgn === 'string' && game.pgn.length < 8000) {
    let pos: Position | null = startPosition();
    for (const san of game.pgn.trim().split(/\s+/)) {
      const read = parseMoveText(pos, san);
      if ('error' in read) { pos = null; break; }
      lastMove = toUci(read.move); pos = makeMove(pos, read.move);
    }
    start = pos;
  }
  if (!start) throw new PuzzleError('Lichess sent a puzzle this page cannot read.');
  let pos = start;
  for (const uci of solution as string[]) { const m = findUci(pos, uci); if (!m) throw new PuzzleError('Lichess sent a puzzle whose answer this page cannot follow.'); pos = makeMove(pos, m); }
  return {
    id: puzzle.id, rating: typeof puzzle.rating === 'number' && Number.isInteger(puzzle.rating) ? puzzle.rating : null,
    themes: Array.isArray(puzzle.themes) ? puzzle.themes.filter((t): t is string => typeof t === 'string' && /^[A-Za-z0-9]{1,40}$/.test(t)).slice(0, 12) : [],
    fen: toFen(start), lastMove, solution: solution as string[], gameId: typeof game?.id === 'string' && /^[A-Za-z0-9]{8}$/.test(game.id) ? game.id : null,
    color: start.turn === 'w' ? 'white' : 'black', url: `${LICHESS}/training/${puzzle.id}`,
  };
}
export type PuzzleProgress = {played: string[]; mistakes: number; revealed: boolean; solved: boolean};
export const startProgress = (): PuzzleProgress => ({played: [], mistakes: 0, revealed: false, solved: false});
export function puzzlePosition(p: DailyPuzzle, progress: PuzzleProgress): Position {
  let pos = parseFen(p.fen)!;
  for (const uci of progress.played) { const m = findUci(pos, uci); if (!m) break; pos = makeMove(pos, m); }
  return pos;
}
export type PuzzleVerdict = {verdict: 'correct' | 'solved' | 'wrong'; progress: PuzzleProgress; reply: string | null};
/** The person's move: the expected one (or any mate) goes on with the reply played; a wrong one is counted and undone. */
export function puzzleMove(p: DailyPuzzle, progress: PuzzleProgress, uci: string): PuzzleVerdict {
  if (progress.solved) return {verdict: 'solved', progress, reply: null};
  const pos = puzzlePosition(p, progress), move = findUci(pos, uci), step = progress.played.length;
  if (!move) return {verdict: 'wrong', progress: {...progress, mistakes: progress.mistakes + 1}, reply: null};
  const expected = p.solution[step], mates = outcome(makeMove(pos, move)) === 'checkmate';
  if (uci !== expected && !mates) return {verdict: 'wrong', progress: {...progress, mistakes: progress.mistakes + 1}, reply: null};
  const reply = !mates ? p.solution[step + 1] ?? null : null, played = [...progress.played, uci, ...(reply ? [reply] : [])];
  const solved = mates || played.length >= p.solution.length;
  return {verdict: solved ? 'solved' : 'correct', progress: {...progress, played, solved}, reply};
}
/** "Show the answer": plays the next expected move (and its reply); a puzzle finished this way is not counted as solved by the person. */
export function revealNext(p: DailyPuzzle, progress: PuzzleProgress): PuzzleProgress {
  if (progress.solved) return progress;
  const step = progress.played.length, next = p.solution.slice(step, step + 2), played = [...progress.played, ...next];
  return {...progress, played, revealed: true, solved: played.length >= p.solution.length};
}
export const puzzleTurnLegal = (p: DailyPuzzle, progress: PuzzleProgress) => legalMoves(puzzlePosition(p, progress));
/** Fetches today's puzzle (no token, no cookie, no referrer). */
export async function fetchDailyPuzzle(fetcher: typeof fetch = fetch): Promise<DailyPuzzle> {
  let response: Response;
  try { response = await fetcher(DAILY_PUZZLE_URL, {method: 'GET', headers: {Accept: 'application/json'}, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache', mode: 'cors', signal: AbortSignal.timeout(15_000)}); }
  catch { throw new PuzzleError('Lichess could not be reached. Try again later.'); }
  if (response.status === 429) throw new PuzzleError('Lichess asked to wait. Try again in a minute.');
  if (!response.ok) throw new PuzzleError(`Lichess answered with an error (${response.status}). Try again later.`);
  const text = await response.text().catch(() => '');
  if (text.length > 64 * 1024) throw new PuzzleError('Lichess sent more than this page reads.');
  let data: unknown; try { data = JSON.parse(text); } catch { throw new PuzzleError('Lichess sent a puzzle this page cannot read.'); }
  return parseDailyPuzzle(data);
}
