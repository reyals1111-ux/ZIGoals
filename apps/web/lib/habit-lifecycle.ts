import {type Habit, type HabitState} from './habits';
import {isDeletedHabit} from './habit-delete';
import {formatDate} from './visual-format';

/**
 * Session AL (DV-206, P-DV-73): a habit's lifecycle as Activity rows: paused, resumed, archived and restored (each rule
 * change of state, on the day it began), and "deleted for good" for a shell (lib/habit-delete.ts) at the moment of the
 * deletion. A rule records only its first day, not a clock time, so those rows sit at local midnight, which Activity
 * shows without a time (lib/activity-time.ts). A deleted habit's name went with it, so its row names no habit.
 * Read-only: nothing is stored.
 */
export type HabitLifecycleRow = {id: string; category: 'HABIT'; title: string; detail: string; at: string; /** The local day; left out for a deletion, whose day Activity reads from `at` in its zone. */ day?: string; href: string};
const midnight = (date: string) => { const d = new Date(`${date}T00:00:00`); return Number.isNaN(d.getTime()) ? `${date}T00:00:00.000Z` : d.toISOString(); };
const WORDS: Record<`${HabitState}>${HabitState}`, string | null> = {
  'active>paused': 'Habit paused', 'paused>active': 'Habit resumed', 'active>archived': 'Habit archived', 'paused>archived': 'Habit archived',
  'archived>active': 'Habit restored', 'archived>paused': 'Habit restored (paused)', 'active>active': null, 'paused>paused': null, 'archived>archived': null,
};
export function habitLifecycleRows(habits: readonly Habit[], shells: readonly Habit[] = []): HabitLifecycleRow[] {
  const rows: HabitLifecycleRow[] = [];
  for (const habit of habits) {
    if (isDeletedHabit(habit)) continue;
    habit.rules.forEach((rule, i) => {
      const before = habit.rules[i - 1];
      const title = before ? WORDS[`${before.state}>${rule.state}`] : null;
      if (title) rows.push({id: `habit-state:${habit.id}:${rule.from}`, category: 'HABIT', title, detail: `${habit.title} · from ${formatDate(rule.from)}`, at: midnight(rule.from), day: rule.from, href: `/app/habits?habit=${encodeURIComponent(habit.id)}`});
    });
  }
  for (const shell of shells) if (isDeletedHabit(shell)) rows.push({id: `habit-deleted:${shell.id}`, category: 'HABIT', title: 'Habit deleted for good', detail: 'Its name, notes and check-ins are gone', at: shell.updatedAt, href: '/app/habits'});
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
