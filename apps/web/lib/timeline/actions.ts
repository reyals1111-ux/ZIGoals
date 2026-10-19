import {habitDataSchema, logHabitValue, setHabitEntryStatus, type Habit, type HabitData} from '../habits';

/**
 * Undo for a tap on the timeline (Session AF, L5b; P9.2): a habit's day goes back exactly as it was before the tap — the
 * earlier entry, or no entry at all — through the habit journal's own functions. The tap itself is the Habits page's own
 * smart Done (components/habits/use-habits.ts `smartDone`); meals log with Health's own `logMealPlan`.
 */
export type HabitEntry = Habit['entries'][number];
export const entryOn = (data: HabitData, id: string, date: string): HabitEntry | undefined => data.habits.find(h => h.id === id)?.entries.find(e => e.date === date);
export function restoreHabitEntry(data: HabitData, id: string, date: string, previous: HabitEntry | undefined): HabitData {
  const habit = data.habits.find(h => h.id === id); if (!habit) return data;
  if (previous?.disposition === 'logged') return logHabitValue(data, id, date, previous.count, {note: previous.note, ...(previous.mood ? {mood: previous.mood} : {})});
  if (previous) return setHabitEntryStatus(data, id, date, previous.disposition, previous.note);
  if (!habit.entries.some(e => e.date === date)) return data;
  return habitDataSchema.parse({...data, habits: data.habits.map(h => h.id === id ? {...h, entries: h.entries.filter(e => e.date !== date)} : h)});
}
