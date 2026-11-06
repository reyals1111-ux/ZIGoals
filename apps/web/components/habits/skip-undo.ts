'use client';
import {restoreHabitEntry, setHabitEntryStatus, type Habit, type HabitData} from '../../lib/habits';
import {formatDate} from '../../lib/visual-format';
import {showUndo} from '../ui/undo-toast';

/**
 * Session AL (P-NB-26; PR-044, NB-068, NB-131, NB-188): every skip (and "Mark failed") says what it did and offers Undo,
 * which puts the day back to the entry it held before, read from the store at the moment of the change.
 */
export async function markDayWithUndo(update: (change: (data: HabitData) => HabitData) => Promise<unknown>, habit: Pick<Habit, 'id' | 'title'>, date: string, today: string, status: 'skipped' | 'failed', note: string): Promise<void> {
  let previous: Habit['entries'][number] | undefined;
  await update(data => { previous = data.habits.find(h => h.id === habit.id)?.entries.find(e => e.date === date); return setHabitEntryStatus(data, habit.id, date, status, note); });
  const day = date === today ? 'today' : formatDate(date);
  showUndo({
    message: status === 'skipped' ? `${habit.title} skipped ${day}. Your streak keeps its place.` : `${habit.title} marked missed ${day}.`,
    undoLabel: `Undo the ${status === 'skipped' ? 'skip' : 'missed mark'} on ${habit.title}`,
    restore: () => update(data => restoreHabitEntry(data, habit.id, date, previous)),
    undone: status === 'skipped' ? `${habit.title} is due again ${day}.` : `${habit.title}: the missed mark is gone.`,
  });
}
