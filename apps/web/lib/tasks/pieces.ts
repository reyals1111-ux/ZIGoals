import type {Task} from './schema';

/**
 * Session AV lane 2 (r4-plan, LEDGER #303; Motion's chunks): a long task placed in pieces of at least its `chunk` minutes.
 * The time spent on it counts against the whole: what is left is its minutes less the minutes spent (15 at least while it
 * is open). Pure and tiny, so the Agenda and the day planner can read a piece's length without the planner's code.
 */
export const DEFAULT_BLOCK = 30, LEAST_LEFT = 15;
/** The minutes left of a task: its minutes (30 when it has none) less those spent, at least 15. */
export const minutesLeft = (t: Pick<Task, 'minutes' | 'spent'>): number => Math.max(LEAST_LEFT, (t.minutes ?? DEFAULT_BLOCK) - (t.spent ?? 0));
/** Whether the task is placed in pieces: it has minutes and a piece length shorter than what is left of it. */
export const inPieces = (t: Pick<Task, 'chunk' | 'minutes' | 'spent'>): boolean => !!t.chunk && !!t.minutes && minutesLeft(t) > t.chunk;
/** How long the task's block on a day is: its next piece for a task in pieces, else its minutes (30 when it has none). */
export const blockLength = (t: Pick<Task, 'chunk' | 'minutes' | 'spent'>): number => inPieces(t) ? t.chunk! : t.minutes ?? DEFAULT_BLOCK;
/** The pieces of what is left (each `chunk` long, the last one the rest) and how many were done before ("part 2 of 4"). */
export function piecesOf(t: Pick<Task, 'chunk' | 'minutes' | 'spent'>): {pieces: number[]; done: number} {
  if (!inPieces(t)) return {pieces: [t.minutes ?? DEFAULT_BLOCK], done: 0};
  const chunk = t.chunk!, pieces: number[] = [];
  for (let rest = minutesLeft(t); rest > 0 && pieces.length < 96; rest -= chunk) pieces.push(Math.min(chunk, rest));
  return {pieces, done: Math.min(Math.floor((t.spent ?? 0) / chunk), 96)};
}
/** A task in pieces whose kept time has passed: its next piece is planned again (its own block is no longer fixed). */
export const planAgain = (t: Task, today: string, clock: string): boolean => inPieces(t) && !!t.time && !!t.due && (t.due < today || (t.due === today && t.time < clock));
