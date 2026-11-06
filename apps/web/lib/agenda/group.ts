/**
 * Session AL (DV-193, DV-194, P-DV-125): a day in words ("4 habits · 1 task") for the month grid's cells and legend, and
 * the week view's habits with no time folded into one row ("4 habits · any time"), so a one-off task is not lost among
 * the same habits repeated every day. Pure.
 */
const WORDS: Record<string, [string, string]> = {
  habit: ['habit', 'habits'], task: ['task', 'tasks'], event: ['event', 'events'], contribution: ['contribution', 'contributions'],
  bill: ['bill', 'bills'], workout: ['workout', 'workouts'], meal: ['meal', 'meals'], unbonding: ['unbonding date', 'unbonding dates'], review: ['review', 'reviews'],
};
const ORDER = ['task', 'event', 'habit', 'contribution', 'bill', 'workout', 'meal', 'unbonding', 'review'];
export function daySummary(items: readonly {source: string}[]): string {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.source, (counts.get(i.source) ?? 0) + 1);
  return [...counts].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0])).map(([s, n]) => { const w = WORDS[s] ?? [s, s]; return `${n} ${n === 1 ? w[0] : w[1]}`; }).join(' · ');
}
/** Habits with no time of day, folded when there are at least `min` of them; everything else as it was, in order. */
export function foldAnytimeHabits<T extends {source: string; time?: string | null}>(items: readonly T[], min = 2): {habits: T[]; rest: T[]} {
  const habits = items.filter(i => i.source === 'habit' && !i.time);
  return habits.length >= min ? {habits, rest: items.filter(i => !habits.includes(i))} : {habits: [], rest: [...items]};
}
