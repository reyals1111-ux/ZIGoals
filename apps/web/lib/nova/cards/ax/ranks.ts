import type {Habit} from '../../../habits';
import {habitRows, isQuit} from '../../../ai/local-answers/exact/habits';
import type {Period} from '../../../ai/local-answers/exact/period';

/**
 * Session AS (ADR-042 Part 2, family 2: ranked miss bars): every habit by the days it was not done in a period, the most
 * first — missed (a due day without it) and skipped (marked so) as two parts of one bar, never added into one word. From
 * the exact layer's own rows (lib/ai/local-answers/exact/habits.ts `habitRows`), so "how many habits did I miss this
 * week" and this widget count one thing.
 */
export type RankRow = {key: string; label: string; missed: number; skipped: number; part: number; total: number; done: number; due: number; open: boolean; text: string};
export type RanksView = {
  rows: RankRow[];
  /** Habits that were due in the period and were done on every due day so far. */
  clean: number;
  /** Habits with a missed day, and with any day not done (missed, skipped or partly done). */
  habitsMissed: number; habitsNotDone: number;
  missedDays: number; skippedDays: number; openToday: string[];
  /** The longest bar's length, for the scale. */
  max: number;
};
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
export function missRanks(habits: readonly Habit[], period: Period, today: string): RanksView {
  const quit = new Set(habits.filter(isQuit).map(h => h.id));
  const all = habitRows(habits, period, today).map(r => {
    const part = r.T.dates.part.filter(d => d !== today).length, total = r.T.missed + r.T.skipped + part;
    const bits = [r.T.missed ? `${r.T.missed} ${quit.has(r.id) ? 'slipped' : 'missed'}` : '', r.T.skipped ? `${r.T.skipped} skipped` : '', part ? `${part} partly` : ''].filter(Boolean);
    return {key: r.id, label: r.name, missed: r.T.missed, skipped: r.T.skipped, part, total, done: r.T.done, due: r.T.due - r.T.open, open: r.T.open > 0, text: total ? `${days(total)}: ${bits.join(', ')}` : 'every due day done'};
  });
  const rows = all.filter(r => r.total > 0).sort((a, b) => b.missed - a.missed || b.total - a.total || a.label.localeCompare(b.label));
  return {
    rows, clean: all.length - rows.length, habitsMissed: all.filter(r => r.missed > 0).length, habitsNotDone: rows.length,
    missedDays: all.reduce((n, r) => n + r.missed, 0), skippedDays: all.reduce((n, r) => n + r.skipped, 0), openToday: all.filter(r => r.open).map(r => r.label),
    max: Math.max(1, ...rows.map(r => r.total)),
  };
}
