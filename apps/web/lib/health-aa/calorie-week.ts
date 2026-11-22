import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {dailyHealthSummary, type HealthData} from '../health';
import {KCAL_FLOOR} from './energy';
import {weekDays} from './planner';
import {formatNumber} from '../visual-format';
import {parseNumberInput} from '../numbers/parse';

/**
 * Session AK (COMPETITORS N3, P2 #7): the weekly calorie budget, a display layer over the daily calorie target (the coach's
 * maths are untouched). The week's budget is the target × 7, shown as seven bars. "Shift" moves calories between weekdays
 * as a repeating pattern (Monday first): the weekly total stays the same and no day goes below the coach's floor. "Roll
 * over" (off by default) carries up to N kcal of a past day's unused budget to the next day. Device-only
 * (`zigoals:calorie-week:v1`, loose and versioned). An estimate-free view: it only re-spreads the person's own target.
 */
export const CALORIE_WEEK_KEY = 'zigoals:calorie-week:v1';
export const MAX_SHIFT = 2000, MAX_ROLLOVER = 1000, MIN_FREE_EXTRA = 50, MAX_FREE_EXTRA = 2000;
export const calorieWeekSchema = z.looseObject({
  version: z.literal(1),
  /** Monday … Sunday, kcal added (+) or taken (−); they sum to 0. */
  shifts: z.array(z.number().int().min(-MAX_SHIFT).max(MAX_SHIFT)).length(7).refine(s => s.reduce((a, b) => a + b, 0) === 0, 'Shifts keep the weekly total.').optional(),
  rollover: z.looseObject({on: z.boolean(), maxKcal: z.number().int().min(0).max(MAX_ROLLOVER)}).optional(),
  /**
   * Session AV lane 2, round 4 (health; LEDGER #328, Noom's Treat Days; TIER 3 (stored format), additive): one planned free
   * day with the extra the person chose, taken evenly from that week's other days (from the day it was planned on) above
   * the coach's floor; it counts only in its own week and is gone the week after. Optional; a value this build cannot read
   * is dropped on its own.
   */
  freeDay: z.looseObject({date: z.iso.date(), extraKcal: z.number().int().min(MIN_FREE_EXTRA).max(MAX_FREE_EXTRA), plannedOn: z.iso.date()}).optional().catch(undefined),
});
export type CalorieWeek = z.infer<typeof calorieWeekSchema>;
export const emptyCalorieWeek = (): CalorieWeek => ({version: 1});
export const CALORIE_WEEK: DeviceRecordSpec<CalorieWeek> = {key: CALORIE_WEEK_KEY, schema: calorieWeekSchema, empty: emptyCalorieWeek};
const ZERO = [0, 0, 0, 0, 0, 0, 0];
export const shiftsOf = (r: CalorieWeek) => r.shifts ?? ZERO;

/** Moves `kcal` from one weekday (0 = Monday) to another. Refuses a day under the floor; the weekly total never changes. */
export function shiftCalories(r: CalorieWeek, baseKcal: number, from: number, to: number, kcal: number): CalorieWeek {
  if (from === to || kcal <= 0) return r;
  if (![from, to].every(i => Number.isInteger(i) && i >= 0 && i < 7)) throw new Error('Choose two weekdays.');
  const shifts = [...shiftsOf(r)];
  shifts[from]! -= Math.round(kcal); shifts[to]! += Math.round(kcal);
  if (shifts.some(s => Math.abs(s) > MAX_SHIFT)) throw new Error(`A day moves at most ${MAX_SHIFT} kcal from your daily target.`);
  if (shifts.some(s => baseKcal + s < KCAL_FLOOR)) throw new Error(`No day goes below ${KCAL_FLOOR} kcal; shift less.`);
  return calorieWeekSchema.parse({...r, shifts});
}
export const resetShifts = (r: CalorieWeek): CalorieWeek => { const rest: Record<string, unknown> = {...r}; delete rest.shifts; return calorieWeekSchema.parse(rest); };
export const setRollover = (r: CalorieWeek, on: boolean, maxKcal: number): CalorieWeek => calorieWeekSchema.parse({...r, rollover: {on, maxKcal: Math.max(0, Math.min(MAX_ROLLOVER, Math.round(maxKcal)))}});

/**
 * Session AV lane 2, round 4 (LEDGER #328): the free day's extra and what each other day gives for it, for the week of
 * `days`. The extra is taken evenly from the week's other days from the day it was planned on, never below the coach's
 * floor (a day with less room gives what it has and the rest is spread over the others); when the days cannot give it all,
 * the free day gets what they can (`extra` is then less than chosen). Null outside the free day's own week.
 */
export function freeDayShares(r: CalorieWeek, base: number, days: readonly string[]): {date: string; chosen: number; extra: number; gives: Record<string, number>} | null {
  const f = r.freeDay;
  if (!f || !days.includes(f.date)) return null;
  const shifts = shiftsOf(r), givers = days.map((d, i) => ({d, room: Math.max(0, base + shifts[i]! - KCAL_FLOOR)})).filter(g => g.d !== f.date && g.d >= f.plannedOn);
  const gives: Record<string, number> = Object.fromEntries(givers.map(g => [g.d, 0]));
  let left = f.extraKcal, open = givers.filter(g => g.room > 0);
  while (left > 0 && open.length) {
    const each = Math.floor(left / open.length), extraOne = left - each * open.length;
    let taken = 0;
    open.forEach((g, i) => { const want = each + (i < extraOne ? 1 : 0), give = Math.min(want, g.room - gives[g.d]!); gives[g.d]! += give; taken += give; });
    left -= taken; open = open.filter(g => gives[g.d]! < g.room);
    if (!taken) break;
  }
  return {date: f.date, chosen: f.extraKcal, extra: f.extraKcal - left, gives};
}
/** Plans the free day: a day from today on, 50–2,000 kcal, refused when the week's other days cannot give it above the floor. */
export function planFreeDay(r: CalorieWeek, base: number, date: string, extraKcal: number, today: string): CalorieWeek {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) throw new Error('Choose a day from today on.');
  if (!Number.isInteger(extraKcal) || extraKcal < MIN_FREE_EXTRA || extraKcal > MAX_FREE_EXTRA) throw new Error(`Choose an extra from ${formatKcal(MIN_FREE_EXTRA)} to ${formatKcal(MAX_FREE_EXTRA)} kcal.`);
  const next = calorieWeekSchema.parse({...r, freeDay: {date, extraKcal, plannedOn: today}});
  const shares = freeDayShares(next, base, weekDays(date));
  if (!shares || shares.extra < extraKcal) throw new Error(`The other days of that week can give ${formatKcal(shares?.extra ?? 0)} kcal at most without going below ${formatKcal(KCAL_FLOOR)}. Plan a smaller extra.`);
  return next;
}
// Review B4E-10: the app's own number format in these messages.
const formatKcal = (n: number) => formatNumber(n);
/** Reads the free day's extra as every number field does (grouping, a decimal comma), or says what to fix. */
export function readFreeExtra(text: string): {ok: true; kcal: number} | {ok: false; message: string} {
  const v = parseNumberInput(text);
  return v.ok ? {ok: true, kcal: Math.round(v.value)} : {ok: false, message: v.error};
}
/**
 * The food day's line for a planned free day (review B4E-9): "today" only on today; another day is named
 * ("on Sat, Nov 21"), since the line shows whenever that day's diary is open.
 */
export function freeDayLine(extra: number, date: string, today: string, fmt: {number: (n: number) => string; day: (d: string) => string}): string {
  return `A planned free day: ${fmt.number(extra)} kcal more ${date === today ? 'today' : `on ${fmt.day(date)}`}, taken evenly from ${date === today ? 'this' : 'that'} week’s other days.`;
}
export const clearFreeDay = (r: CalorieWeek): CalorieWeek => { const rest: Record<string, unknown> = {...r}; delete rest.freeDay; return calorieWeekSchema.parse(rest); };

/** `partial` (Session AL, MO-013): some of the day's entries carry no calories, so `eaten` is the known part, a lower bound. */
export type BudgetDay = {date: string; base: number; shift: number; carried: number; budget: number; eaten: number | null; remaining: number | null; past: boolean; partial?: boolean;
  /** Session AV lane 2, round 4 (LEDGER #328): the free day's extra on its day, and what another day gave for it. */
  free?: number; gave?: number};
/** The week of `anchor` against `today`: each day's budget (base + shift + what rolled over), what was logged and what is left. */
export function weekBudget(data: HealthData, r: CalorieWeek, anchor: string, today: string): {days: BudgetDay[]; weeklyBudget: number; eaten: number; base: number} | null {
  const base = data.targets.kcal;
  if (!base) return null;
  const shifts = shiftsOf(r), roll = r.rollover?.on ? r.rollover.maxKcal : 0, days: BudgetDay[] = [], free = freeDayShares(r, base, weekDays(anchor));
  for (const [i, date] of weekDays(anchor).entries()) {
    // Session AL (P-MO-68, MO-013): a day with some entries lacking calories shows what is known ("1,655+ logged"); it
    // used to read "nothing logged".
    const s = dailyHealthSummary(data, date), partial = s.entries > 0 && s.nutrients.kcal === null, eaten = s.entries > 0 ? s.nutrients.kcal ?? s.knownNutrients.kcal : null;
    const prev = days[i - 1];
    // Only a past day with a full log can leave anything unused; an unlogged or partial day is unknown, never "all unused".
    const carried = roll && prev && prev.past && prev.eaten !== null && !prev.partial ? Math.min(roll, Math.max(0, prev.budget - prev.eaten)) : 0;
    const plus = free?.date === date ? free.extra : 0, minus = free?.gives[date] ?? 0;
    const budget = Math.max(KCAL_FLOOR, base + shifts[i]!) + carried + plus - minus;
    days.push({date, base, shift: shifts[i]!, carried, budget, eaten, remaining: eaten === null ? null : budget - eaten, past: date < today, ...(partial ? {partial: true} : {}), ...(plus ? {free: plus} : {}), ...(minus ? {gave: minus} : {})});
  }
  // Session AL (P-MO-68, MO-151): the week's total is the sum of the days as shown, so a target under the floor reads
  // "8,400" beside seven days of 1,200 (it said "7,000 (1,000 × 7)").
  return {days, weeklyBudget: days.reduce((a, d) => a + d.budget - d.carried, 0), eaten: days.reduce((a, d) => a + (d.eaten ?? 0), 0), base};
}
