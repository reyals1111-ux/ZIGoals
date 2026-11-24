import {addLocalDays} from '../local-date';
import {MAX_CYCLE_LENGTH, periodStarts} from './engine';
import {cycleSchema, periodDays, type Cycle, type Flow} from './store';

/**
 * Session AV lane 2 (r5-body; Clue's Analysis, its cycle overviews and "exclude a cycle"; LEDGER #379, #381, #382): the
 * person's past cycles as a look back — each cycle's first day, its length and its period's length, the averages and how
 * much they vary, and one cycle day by day beside the same days of earlier cycles. Never a forecast: nothing here says
 * what a coming day will bring, no phase, no fertile window. A cycle left out of the averages stays listed; a gap of over
 * 90 days is a pause in logging, never a cycle. Pure; the cycle log's own line (`CYCLE_LINE`) stays above it.
 */
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
export type PastCycle = {
  /** The first day of its period. */
  start: string;
  /** Days from this start to the next one; for the cycle still going, the days so far (today included). */
  length: number;
  /** The days from the first to the last logged flow day of its period (a one-day gap inside counts). */
  periodLength: number;
  /** false for the cycle still going (no next period logged yet). */
  complete: boolean;
  /** Over 90 days to the next start: a pause in logging, not a cycle. Review B5H-5: never the cycle still going. */
  pause: boolean;
  leftOut: boolean;
  /** The period may still be going (its last logged day is today or yesterday). */
  periodSoFar: boolean;
};
type Rec = Pick<Cycle, 'days' | 'leftOut'>;
/** Every logged cycle, newest first. */
export function cycleHistory(rec: Rec, today: string): PastCycle[] {
  const starts = periodStarts(rec).filter(s => s <= today), flow = periodDays(rec).filter(d => d <= today), left = new Set(rec.leftOut ?? []);
  return starts.map((start, i) => {
    const next = starts[i + 1], ends = next ?? addLocalDays(today, 1);
    let last = start;
    for (const d of flow) { if (d < start) continue; if (d >= ends || between(last, d) > 2) break; last = d; }
    const length = between(start, next ?? addLocalDays(today, 1));
    return {start, length, periodLength: between(start, last) + 1, complete: !!next, pause: !!next && length > MAX_CYCLE_LENGTH, leftOut: left.has(start), periodSoFar: !next && last >= addLocalDays(today, -1)};
  }).reverse();
}
export type Spread = {average: number; shortest: number; longest: number; count: number};
const spread = (v: readonly number[]): Spread | null => v.length ? {average: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10, shortest: Math.min(...v), longest: Math.max(...v), count: v.length} : null;
/** The averages: complete cycles that are not a pause and not left out; periods that are over and not left out. */
export function cycleStats(history: readonly PastCycle[]): {cycle: Spread | null; period: Spread | null; leftOut: number} {
  return {
    cycle: spread(history.filter(c => c.complete && !c.pause && !c.leftOut).map(c => c.length)),
    period: spread(history.filter(c => !c.leftOut && !c.periodSoFar).map(c => c.periodLength)),
    leftOut: history.filter(c => c.leftOut).length,
  };
}
/** Leaves one cycle (by its first day) out of the averages and the estimate, or puts it back. */
export function setLeftOut(rec: Cycle, start: string, out: boolean): Cycle {
  const list = (rec.leftOut ?? []).filter(s => s !== start);
  return cycleSchema.parse({...rec, leftOut: out ? [...list, start].sort().slice(-200) : list});
}

export type GlanceDay = {n: number; date: string; flow: Flow | null; words: string[]; note: boolean};
export type GlanceRow = {start: string; length: number; complete: boolean; days: GlanceDay[]};
export const GLANCE_ROWS = 6, GLANCE_MAX_DAYS = 60;
/**
 * A cycle at a glance: the chosen cycle day by day (flow, the words logged, whether a note was kept), then the same cycle
 * days of up to five earlier cycles below it. Pauses are not cycles and are left out. Only days that happened: a cycle
 * still going ends today.
 */
export function cycleGlance(rec: Rec, today: string, start?: string): GlanceRow[] {
  const cycles = cycleHistory(rec, today).filter(c => !c.pause), at = Math.max(0, start ? cycles.findIndex(c => c.start === start) : 0);
  return cycles.slice(at, at + GLANCE_ROWS).map(c => ({start: c.start, length: c.length, complete: c.complete, days: Array.from({length: Math.min(c.length, GLANCE_MAX_DAYS)}, (_, i) => {
    const date = addLocalDays(c.start, i), d = rec.days[date];
    return {n: i + 1, date, flow: d?.flow ?? null, words: d?.symptoms ?? [], note: !!d?.note};
  })}));
}
