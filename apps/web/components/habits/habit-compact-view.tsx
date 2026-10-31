'use client';
import {useMemo} from 'react';
import {logHabitValue, type Habit, type HabitData} from '../../lib/habits';
import {compactRows} from '../../lib/habits-order/compact';
import {compactToggle, compactToggleWords} from '../../lib/habits-order/compact-toggle';
import {CompactHabitList} from './reorder-compact-list';
import {showToast} from '../ui/undo-toast';
import {formatDate} from '../../lib/visual-format';
import type {HabitsStore} from './use-habits';

/**
 * Session AK (5.7): the Habits page's compact list (its own chunk, loaded when the person picks "Compact"): the habits in
 * the page's order and filter, the last five days each, one tap per day through the habits store, with the app's toast
 * and Undo, as a card's Complete has.
 */
export function HabitCompactView({habits, store, onOpen}: {habits: readonly Habit[]; store: Pick<HabitsStore, 'data' | 'today' | 'update'>; onOpen?: (habitId: string) => void}) {
  const rows = useMemo(() => compactRows(habits, store.today), [habits, store.today]);
  async function toggle(habitId: string, date: string, done: boolean) {
    const habit = store.data.habits.find(h => h.id === habitId);
    const change = habit && compactToggle(habit, date, store.today, done);
    if (!change) return;
    await store.update(data => logValue(data, habitId, date, change.value));
    const words = compactToggleWords(change, date === store.today ? 'today' : formatDate(date, {weekday: true}));
    showToast({message: words.message, undone: words.undone, undo: () => store.update(data => logValue(data, habitId, date, change.before))});
  }
  return <CompactHabitList rows={rows} onToggle={toggle} onOpen={onOpen}/>;
}
const logValue = (data: HabitData, id: string, date: string, value: number) => logHabitValue(data, id, date, value);
export default HabitCompactView;
