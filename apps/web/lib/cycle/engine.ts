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

export type DayInput = {flow?: Flow | null; symptoms?: readonly string[]; note?: string};
/** Changes one day (a field left out is kept; `flow: null` clears it). A day left with nothing is removed. */
export function setCycleDay(rec: Cycle, date: string, input: DayInput, today: string): Cycle {
  if (!DAY.test(date) || date > today) throw new Error('Choose today or an earlier day.');
  const current = {...(rec.days[date] ?? {})};
  if (input.flow !== undefined) { if (input.flow === null) delete current.flow; else current.flow = input.flow; }
  if (input.symptoms !== undefined) { const list = [...new Set(input.symptoms)].slice(0, MAX_SYMPTOMS); if (list.length) current.symptoms = list; else delete current.symptoms; }
  if (input.note !== undefined) { const note = input.note.replace(/\s+/g, ' ').trim().slice(0, CYCLE_NOTE_MAX); if (note) current.note = note; else delete current.note; }
  const days = {...rec.days};
  if (current.flow || current.symptoms?.length || current.note) days[date] = current; else delete days[date];
  if (Object.keys(days).length > MAX_CYCLE_DAYS) {
    const keep = new Set(Object.keys(days).sort().slice(-MAX_CYCLE_DAYS));
    for (const d of Object.keys(days)) if (!keep.has(d)) delete days[d];
  }
  return cycleSchema.parse({...rec, days});
}
export const setCycleOn = (rec: Cycle, on: boolean): Cycle => cycleSchema.parse({...rec, on});
/** Deletes every entry (the person's confirmed choice); the on/off choice stays. */
export const clearCycleDays = (rec: Cycle): Cycle => cycleSchema.parse({...rec, days: {}});

/** The first day of each logged period, oldest first. */
export function periodStarts(rec: Pick<Cycle, 'days'>): string[] {
  const days = periodDays(rec), starts: string[] = [];
  let last: string | null = null;
  for (const d of days) { if (!last || between(last, d) > 2) starts.push(d); last = d; }
  return starts;
}
/** Complete cycle lengths in days (start to next start), oldest first; a pause in logging (over 90 days) is left out. */
export const cycleLengths = (rec: Pick<Cycle, 'days'>): number[] => periodStarts(rec).flatMap((s, i, all) => i ? [between(all[i - 1]!, s)] : []).filter(n => n > 0 && n <= MAX_CYCLE_LENGTH);

export type CycleEstimate =
  | {kind: 'not-yet'; cycles: number; need: number}
  | {kind: 'range'; from: string; to: string; cycles: number; shortest: number; longest: number; passed: boolean};
/** The next-period estimate: a range from past cycles, only after three complete ones. */
export function nextPeriodEstimate(rec: Pick<Cycle, 'days'>, today: string): CycleEstimate {
  const lengths = cycleLengths(rec), starts = periodStarts(rec);
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
