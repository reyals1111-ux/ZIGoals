import {latestHabitRule, type HabitData} from '../habits';

/**
 * Session AV lane 2 (habits; LEDGER #181, Fabulous's routine reminder): where a habit's reminder leads. The first habit
 * of a routine (a stack's head: an active habit others stack after, itself after none still active) opens the
 * routine's player at its first open step; any other habit opens its card, as before. The same head rule as
 * lib/habits-v2/stacks.ts `stacksOf`, kept here without its imports so Today's reminder cards stay light.
 */
export function isRoutineHead(data: Pick<HabitData, 'habits'>, habitId: string): boolean {
  const active = data.habits.filter(h => latestHabitRule(h).state !== 'archived'), ids = new Set(active.map(h => h.id));
  const head = active.find(h => h.id === habitId);
  return !!head && (!head.stackAfterId || !ids.has(head.stackAfterId)) && active.some(h => h.stackAfterId === habitId);
}
export const reminderHref = (data: Pick<HabitData, 'habits'>, habitId: string): string =>
  isRoutineHead(data, habitId) ? `/app/habits#routine=${encodeURIComponent(habitId)}&open` : `/app/habits#habit-${habitId}`;
