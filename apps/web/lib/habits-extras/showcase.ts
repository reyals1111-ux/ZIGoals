import {createHabit, habitDataSchema, type HabitData} from '../habits';
import {pauseHabitTimer, startHabitTimer} from '../habit-timer-actions';
import {habitExtrasSchema, type HabitExtras} from './schema';
import {addLocalDays} from '../local-date';

/**
 * Session AA-Local Part 7 (ADR-022): what the Showcase shows of Habits best in class, all fictional and labelled. The six
 * Showcase habits get a time of day (sections), notes and moods on a few check-ins (their 30 days of history stay as they
 * are: lib/insights and the weekly review pin sentences from them); a quit habit "Late-night snacks (Showcase)" with 30 days, four skips with reasons (so lib/insights' weekday card keeps its habit: skipped days leave its sample),
 * four slips, a skip with its reason and a cost
 * per day and a skip with its reason; a timer on Read paused at 25 minutes (deterministic: the same day gives the same bytes,
 * which lib/showcase.test.ts and the vault fixtures rely on; a running timer would follow the clock). No stack is added to
 * the six habits: the vault's power-user fixture clones the first habit and a stack reference would dangle (B42).
 */
export const SHOWCASE_QUIT_ID = '92000000-0000-4000-8000-000000000007';
const TIME_OF_DAY = {Read: 'morning', Exercise: 'morning', Walk: 'afternoon', Meditate: 'evening', Contribute: 'anytime', 'Drink water': 'anytime'} as const;
const MOODS = ['energized', 'good', 'calm', 'neutral'] as const;
export function showcaseHabitsAa(habits: HabitData, day: string): HabitData {
  const date = (offset: number) => addLocalDays(day, offset), at = (offset: number) => `${date(offset)}T19:00:00.000Z`;
  let data = habitDataSchema.parse(habits);
  // Time of day, six weeks of history, a skip with its reason, notes and moods.
  data = {...data, habits: data.habits.map((h, i) => {
    const tod = TIME_OF_DAY[h.title as keyof typeof TIME_OF_DAY] ?? 'anytime';
    const older: typeof h.entries = [];
    const entries = [...older, ...h.entries].map(e => {
      if (e.date === date(-1) && h.title === 'Meditate') return {...e, mood: 'calm' as const, note: 'SHOWCASE DATA · a quiet ten minutes before bed'};
      if (e.disposition === 'logged' && e.count > 0 && (Number(e.date.slice(-2)) + i) % 6 === 0) return {...e, mood: MOODS[(Number(e.date.slice(-2)) + i) % MOODS.length]};
      return e;
    });
    return {...h, timeOfDay: tod, entries};
  })};
  // The quit habit: no late-night snacks, six weeks, four slips, €3 a day saved (the cost lives in the device record).
  if (!data.habits.some(h => h.id === SHOWCASE_QUIT_ID)) {
    data = createHabit(data, {title: 'Late-night snacks (Showcase)', category: 'Wellbeing', description: 'Nothing after nine in the evening.', notes: 'SHOWCASE DATA · fictional quit habit', schedule: {kind: 'daily'}, type: 'quit', target: 0, measurement: {kind: 'count', unit: 'times'}, timeOfDay: 'evening'}, new Date(at(-29)), SHOWCASE_QUIT_ID);
    const quit = data.habits.find(h => h.id === SHOWCASE_QUIT_ID)!;
    const slips = new Set([date(-26), date(-17), date(-9), date(-4)]); // four slips, spread over the month
    const skips: Record<string, string> = {[date(-24)]: 'Skipped · travelling', [date(-15)]: 'Skipped · ill', [date(-8)]: 'Skipped · family dinner', [date(-3)]: 'Skipped · travelling'}; // four skips with their reasons: the weekday insight leaves skipped days out, so this habit's sample stays below the six habits'
    quit.entries = Array.from({length: 30}, (_, n) => { const d = date(-29 + n); if (skips[d]) return {date: d, count: 0, disposition: 'skipped' as const, note: skips[d]!, updatedAt: at(-29 + n)}; return {date: d, count: slips.has(d) ? 1 : 0, disposition: slips.has(d) ? 'failed' as const : 'logged' as const, note: '', updatedAt: at(-29 + n)}; });
  }
  data = habitDataSchema.parse(data);
  // A timer on Read, paused at 25:00 this morning (the chip on the card and on Today; Resume and Finish work).
  try { const read = data.habits.find(h => h.title === 'Read')!; if (!read.timer) { data = startHabitTimer(data, read.id, '92000000-0000-4000-8000-0000000000e1', new Date(`${day}T06:00:00.000Z`), 'Europe/Brussels'); data = pauseHabitTimer(data, read.id, '92000000-0000-4000-8000-0000000000e1', new Date(`${day}T06:25:00.000Z`)); } } catch { /* the Showcase still shows without a timer */ }
  return habitDataSchema.parse(data);
}
/** The device record beside the habits: life areas (AA-Cloud's ids), the quit habit's cost, the end bell on Exercise. */
export function showcaseHabitExtras(habits: HabitData): HabitExtras {
  const id = (t: string) => habits.habits.find(h => h.title === t)?.id;
  const areas: Record<string, string> = {};
  for (const [t, a] of [['Read', 'learning'], ['Exercise', 'health'], ['Walk', 'health'], ['Meditate', 'mind'], ['Contribute', 'wealth'], ['Drink water', 'health']] as const) { const i = id(t); if (i) areas[i] = a; }
  areas[SHOWCASE_QUIT_ID] = 'health';
  const bells: Record<string, true> = {}; const ex = id('Exercise'); if (ex) bells[ex] = true;
  return habitExtrasSchema.parse({version: 1, areas, quitCost: {[SHOWCASE_QUIT_ID]: {perDay: 3, currency: 'EUR'}}, bells});
}
