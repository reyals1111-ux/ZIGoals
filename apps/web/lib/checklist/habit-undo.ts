import type {Habit, HabitData} from '../habits';

/**
 * Session AL (A7): the Undo of a habit day changed from the Checklist's List view ("Done yesterday", "Skip today"): the
 * habit goes back exactly as it was, in the LATEST record; every other habit, and a habit removed since, is left alone.
 */
export function restoreHabit(latest: HabitData, before: Habit | undefined): HabitData {
  if (!before || !latest.habits.some(h => h.id === before.id)) return latest;
  return {...latest, habits: latest.habits.map(h => h.id === before.id ? before : h)};
}

/**
 * Session AL third pass (P-LS-08, LS-058): taking items off the path from Edit path or the List view stacks their Undo
 * (components/ui/remove-with-undo.ts): three quick removals give one toast whose Undo puts all three back where they were.
 * One removal reads exactly as before.
 */
export const PATH_REMOVAL_STACK = {
  key: 'checklist-path',
  many: (count: number) => `${count} items are off your path. Their records stay on their pages.`,
  manyUndone: (count: number) => `All ${count} are back on your path.`,
};
