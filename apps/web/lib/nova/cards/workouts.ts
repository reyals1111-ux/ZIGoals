import {weekStartOf} from '../../health-aa/coach';
import {addLocalDays} from '../../local-date';
import {plural} from '../../plural';
import {formatMonth, formatNumber, formatWeekday} from '../../visual-format';
import {durationMinutes, finished} from '../../workouts/engine';
import type {Workouts} from '../../workouts/schema';
import type {WidgetRange} from '../stage/record';
import {durationWords} from '../widgets/words';
import {asOfWords, logDayWords, rangeOf, shortDate, type CardRange} from './weight';

/**
 * Session AM (ADR-038): the figures of the "Workouts" widget NOVA makes on request, from the workout log with its own
 * rules (lib/workouts/engine.ts: a finished workout and its minutes, as the Workouts view, the Health page's Workouts
 * card and NOVA's `workouts` tool read them). A workout in progress is not counted until it is finished.
 *
 * The range is cut into columns a person can read at a glance: a week by day, a month or a quarter by week (Monday to
 * Sunday, as the Health page's weeks; the first and last may be part weeks), a year by calendar month. A column counts
 * the workouts logged in it; one with none is an empty slot, written "None logged", never a drawn zero.
 */
export type WorkoutLine = {id: string; name: string; date: string; dateText: string; minutes: number; minutesText: string};
export type WorkoutBucket = {key: string; from: string; to: string; label: string; name: string; count: number; minutes: number; text: string};
export type WorkoutsCard = {
  window: CardRange;
  /** Finished workouts in the range and their minutes together. */
  count: number; countWord: string; minutes: number; minutesText: string;
  by: 'day' | 'week' | 'month';
  buckets: WorkoutBucket[];
  /** The newest three finished workouts (in the range or before it), newest first. */
  recent: WorkoutLine[];
  /** Finished workouts ever logged (the widget teaches when this is 0). */
  all: number;
  edges: [string, string];
  asOf: string | null;
};

/** As many week columns as have room for a date each under them. */
const WEEK_LABELS = 6;
const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
const min = (a: string, b: string) => a < b ? a : b, max = (a: string, b: string) => a > b ? a : b;

/** The range's columns: [from, to] day pairs in order, each inside the range. */
export function bucketsOf(window: CardRange): {by: WorkoutsCard['by']; spans: {from: string; to: string}[]} {
  const spans: {from: string; to: string}[] = [];
  if (window.range === 'week') { for (let i = 0; i < window.days; i++) { const d = addLocalDays(window.from, i); spans.push({from: d, to: d}); } return {by: 'day', spans}; }
  if (window.range === 'year') {
    for (let start = monthStart(window.from); start <= window.to;) {
      const next = monthStart(addLocalDays(start, 32));
      spans.push({from: max(start, window.from), to: min(addLocalDays(next, -1), window.to)}); start = next;
    }
    return {by: 'month', spans};
  }
  for (let start = weekStartOf(window.from); start <= window.to; start = addLocalDays(start, 7)) spans.push({from: max(start, window.from), to: min(addLocalDays(start, 6), window.to)});
  return {by: 'week', spans};
}

export function workoutsCard(record: Workouts, day: string, range?: WidgetRange): WorkoutsCard {
  const window = rangeOf(range, day), done = finished(record).filter(w => w.date <= day);
  const inRange = done.filter(w => w.date >= window.from), minutes = inRange.reduce((t, w) => t + durationMinutes(w), 0);
  const {by, spans} = bucketsOf(window);
  const buckets = spans.map((s, i): WorkoutBucket => {
    const rows = inRange.filter(w => w.date >= s.from && w.date <= s.to), mins = rows.reduce((t, w) => t + durationMinutes(w), 0);
    const name = by === 'day' ? shortDate(s.from, day) : by === 'month' ? formatMonth(s.from.slice(0, 7)) : `Week of ${shortDate(weekStartOf(s.from), day)}`;
    // Under a column: the weekday's two letters, the month's first letter, a week's Monday; many weeks (a quarter) have
    // no room for that, so only the first and last are named, under the field (`edges`).
    const label = by === 'day' ? formatWeekday(s.from).slice(0, 2) : by === 'month' ? formatMonth(s.from.slice(0, 7), {year: false}).slice(0, 1) : spans.length <= WEEK_LABELS ? shortDate(weekStartOf(s.from), day) : '';
    return {key: `${s.from}:${i}`, from: s.from, to: s.to, label, name, count: rows.length, minutes: mins,
      text: rows.length ? `${formatNumber(rows.length)} ${plural(rows.length, 'workout')}, ${durationWords(mins)}` : 'None logged'};
  });
  const recent = done.slice(0, 3).map(w => { const m = durationMinutes(w); return {id: w.id, name: w.name, date: w.date, dateText: logDayWords(w.date, day), minutes: m, minutesText: durationWords(m)}; });
  return {
    window, count: inRange.length, countWord: plural(inRange.length, 'workout'), minutes, minutesText: durationWords(minutes), by, buckets, recent, all: done.length,
    edges: [by === 'week' ? `Week of ${shortDate(weekStartOf(window.from), day)}` : shortDate(window.from, day), by === 'week' ? 'This week' : by === 'month' ? 'This month' : 'Today'],
    asOf: asOfWords(done[0]?.date ?? null, day),
  };
}

/** The same figures as text, for the widget's table. */
export function workoutsRows(card: WorkoutsCard): (readonly [string, string])[] {
  return [
    [`Workouts in ${card.window.words}`, card.count ? `${formatNumber(card.count)} ${card.countWord}, ${card.minutesText} in total` : 'None logged'],
    ...card.buckets.map(b => [b.name, b.text] as const),
    ...card.recent.map((w, i) => [i === 0 ? 'Latest workout' : i === 1 ? 'The one before' : 'And before that', `${w.name}, ${w.dateText}, ${w.minutesText}`] as const),
  ];
}
