/**
 * Session AL (Part 15, C-BN-22 / P-BN-87 / GAP-152): a dated log of the daily puzzles played on this device, so Chess can
 * say how the puzzle days went ("solved on 5 of the last 30 days"). One entry per puzzle, its first finish: solved by the
 * person, or finished with the answer shown. Playing it again later never changes it. This device only, never synced
 * (`zigoals:chess-puzzle-log:v1`); a public puzzle's id and rating, no personal text. A record that does not read counts
 * as empty, and its unknown fields are kept on the next write (additive format).
 */
export const PUZZLE_LOG_KEY = 'zigoals:chess-puzzle-log:v1';
export const PUZZLE_LOG_MAX = 400;
export type PuzzleResult = 'solved' | 'shown';
export type PuzzleLogEntry = {day: string; id: string; rating: number | null; result: PuzzleResult; mistakes: number};
export type PuzzleLog = {version: 1; entries: PuzzleLogEntry[]} & Record<string, unknown>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const DAY = /^\d{4}-\d{2}-\d{2}$/, ID = /^[A-Za-z0-9]{3,12}$/;
export const emptyPuzzleLog = (): PuzzleLog => ({version: 1, entries: []});

function entryOf(v: unknown): PuzzleLogEntry | null {
  if (!v || typeof v !== 'object') return null;
  const e = v as Record<string, unknown>;
  if (typeof e.day !== 'string' || !DAY.test(e.day) || typeof e.id !== 'string' || !ID.test(e.id) || (e.result !== 'solved' && e.result !== 'shown')) return null;
  const rating = typeof e.rating === 'number' && Number.isInteger(e.rating) && e.rating > 0 && e.rating < 5000 ? e.rating : null;
  const mistakes = typeof e.mistakes === 'number' && Number.isFinite(e.mistakes) && e.mistakes >= 0 ? Math.min(999, Math.floor(e.mistakes)) : 0;
  return {day: e.day, id: e.id, rating, result: e.result, mistakes};
}
export function readPuzzleLog(storage: Store | null): PuzzleLog {
  try {
    const raw = storage?.getItem(PUZZLE_LOG_KEY); if (!raw) return emptyPuzzleLog();
    const r = JSON.parse(raw) as Record<string, unknown>;
    if (!r || r.version !== 1 || !Array.isArray(r.entries)) return emptyPuzzleLog();
    return {...r, version: 1, entries: r.entries.map(entryOf).filter((e): e is PuzzleLogEntry => e !== null).slice(-PUZZLE_LOG_MAX)};
  } catch { return emptyPuzzleLog(); }
}
/** Adds a puzzle's first finish; a puzzle already in the log is left as it was (the same log object comes back). */
export function withPuzzle(log: PuzzleLog, entry: PuzzleLogEntry): PuzzleLog {
  const e = entryOf(entry);
  if (!e || log.entries.some(x => x.id === e.id)) return log;
  return {...log, entries: [...log.entries, e].sort((a, b) => a.day.localeCompare(b.day)).slice(-PUZZLE_LOG_MAX)};
}
/** Saves the log; false when storage refused (the finish then lives for this visit only). */
export function savePuzzleLog(storage: Store | null, log: PuzzleLog): boolean {
  try { if (!storage) return false; storage.setItem(PUZZLE_LOG_KEY, JSON.stringify(log)); return true; } catch { return false; }
}
const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export type PuzzleLogSummary = {solved: number; shown: number; played: number; run: number; recent: PuzzleLogEntry[]};
/**
 * The last 30 days up to `today`: days with a puzzle solved, finished with the answer shown, and played at all; the run of
 * days in a row with a puzzle solved, ending today (or yesterday, while today's is still open); the last seven entries.
 */
export function puzzleLogSummary(log: PuzzleLog, today: string): PuzzleLogSummary {
  const from = addDays(today, -29), inWindow = log.entries.filter(e => e.day >= from && e.day <= today);
  const solvedDays = new Set(log.entries.filter(e => e.result === 'solved').map(e => e.day));
  const windowSolved = new Set(inWindow.filter(e => e.result === 'solved').map(e => e.day));
  const windowShown = new Set(inWindow.filter(e => e.result === 'shown' && !windowSolved.has(e.day)).map(e => e.day));
  let day = solvedDays.has(today) ? today : addDays(today, -1), run = 0;
  while (solvedDays.has(day)) { run++; day = addDays(day, -1); }
  return {solved: windowSolved.size, shown: windowShown.size, played: new Set(inWindow.map(e => e.day)).size, run, recent: log.entries.filter(e => e.day <= today).slice(-7).reverse()};
}
