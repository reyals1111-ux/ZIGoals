import {habitDay, habitRuleOn, type Habit, type HabitDayStatus} from '../habits';
import {addDays} from '../goal-forecast';

/**
 * Session AK (5.7): the compact list (Loop's dense rows, COMPETITORS.md "Habits"): each habit is one row with its last
 * five days as small check boxes, so a missed day is one tap. Pure: the rows from the journal's own day states.
 */
export type CompactCell = {date: string; status: HabitDayStatus; done: boolean; tappable: boolean};
export type CompactRow = {id: string; title: string; cells: CompactCell[]; today: HabitDayStatus};
export const COMPACT_DAYS = 5;
/** A day a tap may change: scheduled, active, up to today, and a build habit (quit and limit habits keep their own controls). */
const TAPPABLE: ReadonlySet<HabitDayStatus> = new Set(['complete', 'partial', 'due', 'failed']);
export function compactRow(habit: Habit, today: string, days = COMPACT_DAYS): CompactRow {
  const cells: CompactCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i), day = habitDay(habit, date, today), rule = habitRuleOn(habit, date);
    cells.push({date, status: day.status, done: day.status === 'complete', tappable: !!rule && rule.type === 'build' && TAPPABLE.has(day.status)});
  }
  return {id: habit.id, title: habit.title, cells, today: cells.at(-1)!.status};
}
export const compactRows = (habits: readonly Habit[], today: string, days = COMPACT_DAYS): CompactRow[] => habits.map(h => compactRow(h, today, days));
const WORDS: Partial<Record<HabitDayStatus, string>> = {complete: 'done', partial: 'partly done', due: 'not done yet', failed: 'missed', skipped: 'skipped', 'planned-skip': 'skip planned', 'not-scheduled': 'not scheduled', paused: 'paused', archived: 'archived', future: 'ahead', 'not-started': 'not started'};
export const cellWords = (status: HabitDayStatus) => WORDS[status] ?? status;
