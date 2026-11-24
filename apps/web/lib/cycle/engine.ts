import {addLocalDays} from '../local-date';
import {CYCLE_NOTE_MAX, MAX_CYCLE_DAYS, MAX_SYMPTOMS, cycleSchema, periodDays, type Cycle, type Flow} from './store';

/**
 * Session AK (BUILD list 2 #16): the pure steps of the cycle log. A period is a run of logged flow days (a gap of one
 * unlogged day inside it still counts as the same period); a cycle is the days from one period's first day to the next's.
 * The next-period line is "an estimate from your past cycles": it shows only after three complete cycles, and it is a
 * range — from the shortest to the longest of the last six cycles — never a promised date. A gap longer than 90 days (a
 * pause in logging) is not counted as a cycle. Information, not advice, not a contraceptive and not a diagnosis.
 */
export const CYCLE_LINE = 'Information for you, not a contraceptive or a diagnosis.';
export const MIN_CYCLES = 3, ESTIMATE_FROM = 6, MAX_CYCLE_LENGTH = 90;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const between = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Session AV lane 2 (review B5H-1): the words said when a day already has its 12 words. */
export const TOO_MANY_WORDS = `Choose up to ${MAX_SYMPTOMS} words for one day: untick one first.`;
export type DayInput = {flow?: Flow | null; symptoms?: readonly string[]; note?: string};
/** Changes one day (a field left out is kept; `flow: null` clears it). A day left with nothing is removed. */
export function setCycleDay(rec: Cycle, date: string, input: DayInput, today: string): Cycle {
  if (!DAY.test(date) || date > today) throw new Error('Choose today or an earlier day.');
  const current = {...(rec.days[date] ?? {})};
  if (input.flow !== undefined) { if (input.flow === null) delete current.flow; else current.flow = input.flow; }
  // Session AV lane 2 (review B5H-1): a day keeps up to 12 words (the day's `symptoms` is capped at 12 without a catch in
  // every older build, so a longer list would make their whole record unreadable): a 13th is refused, never dropped.
  if (input.symptoms !== undefined) { const list = [...new Set(input.symptoms)]; if (list.length > MAX_SYMPTOMS) throw new Error(TOO_MANY_WORDS); if (list.length) current.symptoms = list; else delete current.symptoms; }
  if (input.note !== undefined) { const note = input.note.replace(/\s+/g, ' ').trim().slice(0, CYCLE_NOTE_MAX); if (note) current.note = note; else delete current.note; }
  const days = {...rec.days};
  if (current.flow || current.symptoms?.length || current.note) days[date] = current; else delete days[date];
  if (Object.keys(days).length > MAX_CYCLE_DAYS) {
    const keep = new Set(Object.keys(days).sort().slice(-MAX_CYCLE_DAYS));
    for (const d of Object.keys(days)) if (!keep.has(d)) delete days[d];
  }
  // Session AV lane 2 (review B5H-6): a cycle left out stays left out when its period's first day moves.
  const leftOut = rec.leftOut?.length ? carryLeftOut(rec, {days}) : undefined;
  return cycleSchema.parse({...rec, days, ...(leftOut ? {leftOut} : {})});
}
/** Each logged period as its first and last flow day (a one-day gap inside it still counts), oldest first. */
function periodRuns(rec: Pick<Cycle, 'days'>): {start: string; end: string}[] {
  const runs: {start: string; end: string}[] = [];
  for (const d of periodDays(rec)) { const last = runs.at(-1); if (last && between(last.end, d) <= 2) last.end = d; else runs.push({start: d, end: d}); }
  return runs;
}
/**
 * Session AV lane 2 (review B5H-6): the left-out starts after a change of days — a start that moved (an earlier flow day
 * logged, or the first one cleared) follows its period to the new first day; a period cleared entirely takes its cycle
 * with it. A start this build cannot place is kept as it was.
 */
export function carryLeftOut(before: Pick<Cycle, 'days' | 'leftOut'>, after: Pick<Cycle, 'days'>): string[] {
  const old = periodRuns(before), now = periodRuns(after), starts = new Set(now.map(r => r.start));
  return [...new Set((before.leftOut ?? []).flatMap(s => {
    if (starts.has(s)) return [s];
    const was = old.find(r => r.start === s);
    if (!was) return [s];
    const moved = now.find(r => r.start <= was.end && r.end >= was.start);
    return moved ? [moved.start] : [];
  }))].sort();
}
export const setCycleOn = (rec: Cycle, on: boolean): Cycle => cycleSchema.parse({...rec, on});
/** Session AV lane 2 (r3-plan, LEDGER #262): show the cycle day and period days on the day plan, or not. */
export const setCycleOnPlan = (rec: Cycle, show: boolean): Cycle => { const next: Record<string, unknown> = {...rec}; if (show) next.plan = true; else delete next.plan; return cycleSchema.parse(next); };
/** Deletes every entry (the person's confirmed choice); the on/off choice stays. */
export const clearCycleDays = (rec: Cycle): Cycle => cycleSchema.parse({...rec, days: {}});

/** The first day of each logged period, oldest first. */
export function periodStarts(rec: Pick<Cycle, 'days'>): string[] {
  const days = periodDays(rec), starts: string[] = [];
  let last: string | null = null;
  for (const d of days) { if (!last || between(last, d) > 2) starts.push(d); last = d; }
  return starts;
}
/**
 * Complete cycle lengths in days (start to next start), oldest first; a pause in logging (over 90 days) is left out.
 * Session AV lane 2 (r5-body, LEDGER #382): so is a cycle the person left out of the averages (by its first day).
 */
export const cycleLengths = (rec: Pick<Cycle, 'days'> & {leftOut?: readonly string[]}): number[] => periodStarts(rec).flatMap((s, i, all) => i && !rec.leftOut?.includes(all[i - 1]!) ? [between(all[i - 1]!, s)] : []).filter(n => n > 0 && n <= MAX_CYCLE_LENGTH);

export type CycleEstimate =
  /** Session AV lane 2 (r5-body, LEDGER #383): "No period" is chosen, so no next-period line is worked out. */
  | {kind: 'off'; cycles: number}
  | {kind: 'not-yet'; cycles: number; need: number}
  | {kind: 'range'; from: string; to: string; cycles: number; shortest: number; longest: number; passed: boolean};
/** The next-period estimate: a range from past cycles, only after three complete ones. */
export function nextPeriodEstimate(rec: Pick<Cycle, 'days'> & {leftOut?: readonly string[]; noPeriod?: true}, today: string): CycleEstimate {
  const lengths = cycleLengths(rec), starts = periodStarts(rec);
  if (rec.noPeriod) return {kind: 'off', cycles: lengths.length};
  if (lengths.length < MIN_CYCLES) return {kind: 'not-yet', cycles: lengths.length, need: MIN_CYCLES};
  const recent = lengths.slice(-ESTIMATE_FROM), shortest = Math.min(...recent), longest = Math.max(...recent), last = starts.at(-1)!;
  const from = addLocalDays(last, shortest), to = addLocalDays(last, longest);
  return {kind: 'range', from, to, cycles: lengths.length, shortest, longest, passed: today > to};
}
/** Which day of the current cycle today is (1 = the first day of the last logged period), or null with none logged. */
export function cycleDay(rec: Pick<Cycle, 'days'>, today: string): number | null {
  const last = periodStarts(rec).filter(s => s <= today).at(-1);
  if (!last) return null;
  const n = between(last, today) + 1;
  return n <= MAX_CYCLE_LENGTH ? n : null;
}
