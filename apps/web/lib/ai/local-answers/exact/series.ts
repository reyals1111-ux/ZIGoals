import {daysBetween} from '../../tools/range';
import type {Lang} from './types';

/**
 * Session AS (ADR-042, approval item 1): one day of something the person keeps (a habit, a water target, a journal), read
 * the same way everywhere so "missed", "skipped" and "done" mean one thing across the app:
 * - done: the day counts (the habit complete, the target reached, an entry written);
 * - part: something was logged but the target was not reached;
 * - missed: a past due day without it (the Habits page's "failed"); for a log, a past day with nothing logged is `none`;
 * - skipped: the person marked the day as skipped (never added to "missed");
 * - open: today, not done yet (the day is not over: never "missed");
 * - rest: not due that day; none: nothing recorded (unknown, never zero).
 */
export type DayState = 'done' | 'part' | 'missed' | 'skipped' | 'open' | 'rest' | 'none';
export type DayPoint = {date: string; state: DayState; value: number | null};
export type Tally = {
  /** Days that were due (everything but `rest`); `decided`: without today's open day. */
  due: number; decided: number;
  done: number; part: number; missed: number; skipped: number; open: number; none: number;
  dates: Record<'done' | 'part' | 'missed' | 'skipped' | 'open' | 'none', string[]>;
  /** The values of the days that have one. */
  total: number; valued: number;
  best: DayPoint | null; lowest: DayPoint | null;
};
export function tally(points: readonly DayPoint[]): Tally {
  const dates: Tally['dates'] = {done: [], part: [], missed: [], skipped: [], open: [], none: []};
  let total = 0, valued = 0, best: DayPoint | null = null, lowest: DayPoint | null = null;
  for (const p of points) {
    if (p.state !== 'rest') dates[p.state].push(p.date);
    if (p.value !== null && p.state !== 'rest' && p.state !== 'skipped') {
      total += p.value; valued++;
      if (!best || p.value > best.value!) best = p;
      if (!lowest || p.value < lowest.value!) lowest = p;
    }
  }
  const due = points.filter(p => p.state !== 'rest').length;
  return {due, decided: due - dates.open.length, done: dates.done.length, part: dates.part.length, missed: dates.missed.length, skipped: dates.skipped.length, open: dates.open.length, none: dates.none.length, dates, total, valued, best, lowest};
}
/** Days in a row that count, ending on the newest day: a skipped or rest day neither adds nor breaks; today's open day does not break. */
export function runNow(points: readonly DayPoint[]): number {
  let run = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const s = points[i]!.state;
    if (s === 'done') run++; else if (s === 'skipped' || s === 'rest' || (s === 'open' && i === points.length - 1)) continue; else break;
  }
  return run;
}
/** The longest run of days that count inside the points, with the day it ended. */
export function runBest(points: readonly DayPoint[]): {days: number; ended: string | null} {
  let run = 0, best = 0, ended: string | null = null;
  for (const p of points) {
    if (p.state === 'done') { run++; if (run > best) { best = run; ended = p.date; } }
    else if (p.state !== 'skipped' && p.state !== 'rest' && p.state !== 'open') run = 0;
  }
  return {days: best, ended};
}
/** The share done of the days that are decided (skipped days are neutral, as on the Habits page), as a whole percent; null when none is decided. */
export function rate(t: Tally): number | null {
  const decided = t.done + t.part + t.missed + t.none;
  return decided ? Math.round(t.done / decided * 100) : null;
}
export const spanDays = (from: string, to: string): number => daysBetween(from, to) + 1;
/** A list of days in words, at most `max` of them, then "and N more". */
export function dayList(dates: readonly string[], words: (day: string) => string, lang: Lang, max = 12): string {
  const shown = dates.slice(0, max).map(words), more = dates.length - shown.length;
  if (more > 0) return `${shown.join(', ')} ${lang === 'nl' ? `en nog ${more}` : `and ${more} more`}`;
  return shown.length <= 1 ? shown[0] ?? '' : `${shown.slice(0, -1).join(', ')} ${lang === 'nl' ? 'en' : 'and'} ${shown.at(-1)}`;
}
