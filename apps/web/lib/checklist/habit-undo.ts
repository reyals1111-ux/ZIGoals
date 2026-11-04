import type {Habit, HabitData} from '../habits';

/**
 * Session AL (A7): the Undo of a habit day changed from the Checklist's List view ("Done yesterday", "Skip today"): the
 * habit goes back exactly as it was, in the LATEST record; every other habit, and a habit removed since, is left alone.
 */
export function restoreHabit(latest: HabitData, before: Habit | undefined): HabitData {
  if (!before || !latest.habits.some(h => h.id === before.id)) return latest;
  return {...latest, habits: latest.habits.map(h => h.id === before.id ? before : h)};
}
