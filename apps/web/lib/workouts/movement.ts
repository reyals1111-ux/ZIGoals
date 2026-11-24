import {addLocalDays} from '../local-date';
import {durationMinutes, finished} from './engine';
import type {Workouts} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #375, Gentler Streak's Activity Path): how much movement suits this week, from
 * the person's own weeks. The usual weekly range is read from the last six whole weeks (Monday first; a week a workout
 * status covered is left out, #374, and so are the weeks before the first one with any movement): with five or more, the lowest and highest are set aside and the band runs from the
 * next lowest to the next highest; with three or four, from the lowest to the highest; under three there is no band yet.
 * This week's minutes fill it day by day, and the last 30 days are listed. Minutes are every Health activity minute (walks,
 * chores, everyday movement, #376) and every finished workout's — a workout that wrote its minutes into Health counts once,
 * as a workout. Facts about the person's own weeks only: no calorie figure, no "you must rest", no advice. Pure.
 */
export type ActivityMinutes = {id: string; date: string; minutes: number};
export type MovementDay = {date: string; workouts: number; other: number; minutes: number};
export type MovementBand = {
  today: string; monday: string;
  week: (MovementDay & {total: number; future: boolean})[]; weekTotal: number; weekWorkouts: number; weekOther: number;
  weeks: {start: string; minutes: number; paused: boolean}[]; counted: number;
  low: number | null; high: number | null; word: 'inside' | 'below' | 'above' | 'few';
  last30: MovementDay[];
};
const mondayOf = (d: string) => addLocalDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
/** Each day's minutes from `from` to `to`: workouts and other movement. */
export function movementDays(w: Workouts, activity: readonly ActivityMinutes[], from: string, to: string): Map<string, MovementDay> {
  const out = new Map<string, MovementDay>(), at = (date: string) => { let d = out.get(date); if (!d) { d = {date, workouts: 0, other: 0, minutes: 0}; out.set(date, d); } return d; };
  const linked = new Set(w.workouts.map(x => x.activityId).filter((id): id is string => !!id)), live = new Set(activity.map(a => a.id));
  for (const a of activity) if (a.date >= from && a.date <= to && a.minutes > 0) { const d = at(a.date); if (linked.has(a.id)) d.workouts += a.minutes; else d.other += a.minutes; }
  // A finished workout whose minutes are not in Health (an older log, or Health could not be written) counts its own length.
  for (const x of finished(w)) if (x.date >= from && x.date <= to && !(x.activityId && live.has(x.activityId))) at(x.date).workouts += Math.min(1440, Math.max(1, durationMinutes(x)));
  for (const d of out.values()) d.minutes = d.workouts + d.other;
  return out;
}
export function movementBand(w: Workouts, activity: readonly ActivityMinutes[], today: string, pauses: readonly {from: string; to: string}[] = []): MovementBand {
  const monday = mondayOf(today), first = addLocalDays(monday, -42), start30 = addLocalDays(today, -29);
  const days = movementDays(w, activity, first < start30 ? first : start30, addLocalDays(monday, 6));
  const dayOf = (date: string): MovementDay => days.get(date) ?? {date, workouts: 0, other: 0, minutes: 0};
  const sum = (from: string, n: number) => Array.from({length: n}, (_, i) => dayOf(addLocalDays(from, i)).minutes).reduce((a, b) => a + b, 0);
  const weeks = Array.from({length: 6}, (_, i) => { const start = addLocalDays(monday, -7 * (6 - i)), end = addLocalDays(start, 6); return {start, minutes: sum(start, 7), paused: pauses.some(p => p.from <= end && p.to >= start)}; });
  // Weeks before the first one with any movement are left out too: the log had not started yet.
  const started = weeks.findIndex(k => k.minutes > 0), values = weeks.filter((k, i) => !k.paused && started >= 0 && i >= started).map(k => k.minutes).sort((a, b) => a - b), counted = values.length;
  const usable = counted >= 3 && values.some(v => v > 0), inner = counted >= 5 ? values.slice(1, -1) : values;
  const low = usable ? inner[0]! : null, high = usable ? inner.at(-1)! : null;
  let total = 0;
  const week = Array.from({length: 7}, (_, i) => { const date = addLocalDays(monday, i), d = dayOf(date), future = date > today; if (!future) total += d.minutes; return {...d, ...(future ? {workouts: 0, other: 0, minutes: 0} : {}), total, future}; });
  const done = week.filter(d => !d.future), weekWorkouts = done.reduce((t, d) => t + d.workouts, 0), weekOther = done.reduce((t, d) => t + d.other, 0);
  const word: MovementBand['word'] = low === null || high === null ? 'few' : total > high ? 'above' : total >= low ? 'inside' : 'below';
  return {today, monday, week, weekTotal: total, weekWorkouts, weekOther, weeks, counted, low, high, word, last30: Array.from({length: 30}, (_, i) => dayOf(addLocalDays(start30, i)))};
}
/** The week's place in the band, in plain words (English; the answers carry the Dutch). */
export function bandWords(b: MovementBand): string {
  if (b.word === 'few') return `Your usual range needs three of your last six weeks with movement logged; ${b.counted < 3 ? `${b.counted} of those weeks can be counted so far` : 'none of them has any yet'}.`;
  const range = `${b.low}–${b.high} min a week`, open = b.today < addLocalDays(b.monday, 6);
  return b.word === 'inside' ? `Inside your usual range (${range}).` : b.word === 'above' ? `Above your usual range (${range}).` : `Below your usual range (${range})${open ? ' so far; the week runs to Sunday' : ''}.`;
}
