import {habitName, habitPoints, habitRows, habitTrack} from '../../../ai/local-answers/exact/habits';
import {previousPeriod, type Period} from '../../../ai/local-answers/exact/period';
import {tally} from '../../../ai/local-answers/exact/series';
import type {Habit} from '../../../habits';
import {formatDate} from '../../../visual-format';

/**
 * Session AS (ADR-042 Part 2, family: twins): habits in one period beside the period just before it (the same days of
 * the week or month before: lib/ai/local-answers/exact/period.ts `previousPeriod`). Counted as the exact layer's own
 * sentence counts them: every habit together, the check-ins done of those due (skipped days and today's open ones are
 * not due); one habit, the days done of its decided days, and for a habit with a measure its amount in each period
 * (the sentence compares those: "15 minutes this week; 20 minutes the period before"). A side with nothing due is
 * unknown (null), never a zero.
 */
export type CompareSide = {from: string; to: string; done: number; due: number; /** Whole percent done; null when nothing was due. */ rate: number | null; words: string; /** One measured habit: its amount in the period ("15 minutes"). */ amount: string | null};
export type CompareView = {
  /** The habit's name when one was asked for, else null (every habit together). */
  name: string | null;
  now: CompareSide; before: CompareSide | null;
  /** The difference in whole percent points (now minus before); null when a side is unknown. */
  points: number | null;
  /** What is counted: "due check-ins" for every habit, "days" for one. */
  unit: string;
};
const span = (p: Period) => p.from === p.to ? formatDate(p.from, {year: false}) : `${formatDate(p.from, {year: false})} – ${formatDate(p.to, {year: false})}`;
export function comparePeriods(habits: readonly Habit[], period: Period, today: string, ref?: string): CompareView {
  const one = ref ? habits.find(h => h.id === ref) : undefined, before = previousPeriod(period, today), measure = one ? habitTrack(one, today).measure : null;
  const side = (p: Period): CompareSide => {
    let done: number, due: number, amount: string | null = null;
    if (one) { const T = tally(habitPoints(one, p.days, today)); done = T.done; due = T.decided; if (measure && T.valued) amount = measure.text(T.total, 'en'); }
    else { const rows = habitRows(habits, p, today); done = rows.reduce((n, r) => n + r.T.done, 0); due = rows.reduce((n, r) => n + r.T.due - r.T.open - r.T.skipped, 0); }
    return {from: p.from, to: p.to, done, due, rate: due ? Math.round(done / due * 100) : null, words: span(p), amount};
  };
  const a = side(period), b = before ? side(before) : null;
  return {name: one ? habitName(one) : null, now: a, before: b, points: a.rate !== null && b && b.rate !== null ? a.rate - b.rate : null, unit: one ? 'days' : 'due check-ins'};
}
