import {habitDay, habitRuleOn, habitStats, type Habit, type HabitDayStatus} from '../../habits';
import {addLocalDays} from '../../local-date';

/**
 * Session AM (ADR-038; art direction §4, Habits: "week lattice, 7 × habits"): the figures of "Habits this week", from the
 * Habits page's own engine (lib/habits.ts habitDay and habitStats; nothing is counted a second way).
 *
 * - Today: the habits due today and how many are complete, as NOVA's Habits HUD counts them (lib/nova/holo/habits.ts: a
 *   skipped day is not due).
 * - The lattice: one row per active habit (its rule today is active), in the Habits page's own order, with the last seven
 *   days ending today. A cell is the day's own outcome (see `weekCell`).
 * - The row's note is the habit's current streak in its own unit ("12 d", "3 wk").
 */
export type WeekCell = 'done' | 'missed' | 'rest' | 'ahead' | 'part';
export type HabitWeekRow = {id: string; title: string; cells: WeekCell[]; streak: number; unit: string};
export type HabitWeek = {
  /** Habits on this device (0: nothing yet, the widget teaches). */
  count: number;
  /** Habits whose rule is active today (paused and archived ones are left out of the lattice). */
  active: number;
  due: number; done: number;
  /** The seven days of the lattice, oldest first, ending today. */
  days: string[];
  rows: HabitWeekRow[];
  /** Active habits that did not fit the rows. */
  more: number;
  /** Across every active habit and the seven days: the days that were due, and those done. */
  weekDue: number; weekDone: number;
  /** The longest current streak among the active habits (null: none is running). */
  longest: {title: string; streak: number; unit: string} | null;
};

/**
 * A day's outcome as a lattice cell.
 * - done: complete.
 * - part: something was logged but the target was not met (today, or a past day of a weekly target).
 * - missed: a past due day without it, or a day the person marked as not done.
 * - rest: not due that day (not scheduled, skipped, paused, before the habit began).
 * - ahead: due today and still open. Decision: today is never "missed" while it is today — the day is not over, so an open
 *   habit is "still to come" until it is done or the day ends (then the engine itself reads it as failed).
 */
export function weekCell(status: HabitDayStatus): WeekCell {
  switch (status) {
    case 'complete': return 'done';
    case 'partial': return 'part';
    case 'failed': return 'missed';
    case 'due': case 'future': return 'ahead';
    default: return 'rest';
  }
}

export function habitWeek(habits: readonly Habit[], today: string, maxRows = 4): HabitWeek {
  const days = Array.from({length: 7}, (_, i) => addLocalDays(today, i - 6));
  const dueToday = habits.filter(h => { const d = habitDay(h, today, today); return d.scheduled && d.status !== 'skipped'; });
  const active = habits.filter(h => habitRuleOn(h, today)?.state === 'active');
  const all = active.map(h => { const s = habitStats(h, today); return {id: h.id, title: h.title, cells: days.map(d => weekCell(habitDay(h, d, today).status)), streak: s.currentStreak, unit: s.streakUnit}; });
  const cells = all.flatMap(r => r.cells), rows = all.slice(0, Math.max(0, maxRows));
  const longest = all.filter(r => r.streak > 0).sort((a, b) => Number(b.unit === 'days') - Number(a.unit === 'days') || b.streak - a.streak || a.title.localeCompare(b.title))[0];
  return {
    count: habits.length, active: active.length, due: dueToday.length, done: dueToday.filter(h => habitDay(h, today, today).status === 'complete').length,
    days, rows, more: all.length - rows.length,
    weekDue: cells.filter(c => c !== 'rest').length, weekDone: cells.filter(c => c === 'done').length,
    longest: longest ? {title: longest.title, streak: longest.streak, unit: longest.unit} : null,
  };
}

const SHORT: Record<string, string> = {days: 'd', weeks: 'wk', months: 'mo', years: 'yr'};
/** A streak beside its row, short: "12 d", "3 wk". No streak running: nothing (the table says so in words). */
export const streakNote = (n: number, unit: string): string => n > 0 ? `${n} ${SHORT[unit] ?? unit}` : '';

const CELL_WORDS: Record<WeekCell, string> = {done: 'done', part: 'partly done', missed: 'not done', rest: 'not due', ahead: 'still to come'};
export const cellWords = (cell: WeekCell): string => CELL_WORDS[cell];
