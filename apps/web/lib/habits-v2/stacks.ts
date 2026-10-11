import {habitDay, latestHabitRule, type Habit, type HabitData} from '../habits';
import {wRemindersSchema, type WReminders} from '../reminders/w-schema';

/**
 * Habit stacks shown together (Session W Part 10): habits linked by "stack after" (the existing `stackAfterId`) form a
 * chain from the habit nothing comes before. Each chain is listed in order, a habit with two followers keeps both (in
 * title order). The optional chained reminder (`zigoals:w-reminders:v1` `chained`, this device only) says "next in your
 * stack" once the habit before is done today and the next one is still due; it can be put off for the day.
 */
const active = (h: Habit) => latestHabitRule(h).state !== 'archived';
/** Every chain of two or more habits, each in order from its first habit. */
export function stacksOf(data: Pick<HabitData, 'habits'>): Habit[][] {
  const habits = data.habits.filter(active), byId = new Map(habits.map(h => [h.id, h]));
  const followers = new Map<string, Habit[]>();
  for (const h of habits) if (h.stackAfterId && byId.has(h.stackAfterId)) followers.set(h.stackAfterId, [...(followers.get(h.stackAfterId) ?? []), h]);
  const roots = habits.filter(h => (!h.stackAfterId || !byId.has(h.stackAfterId)) && followers.has(h.id)).sort((a, b) => a.title.localeCompare(b.title));
  return roots.map(root => {
    const chain: Habit[] = [], seen = new Set<string>();
    const walk = (h: Habit) => { if (seen.has(h.id)) return; seen.add(h.id); chain.push(h); for (const next of (followers.get(h.id) ?? []).sort((a, b) => a.title.localeCompare(b.title))) walk(next); };
    walk(root);
    return chain;
  });
}
export const CHAINED_PREFIX = 'chained:';
export type ChainedDue = {id: string; kind: 'stack-next'; habitId: string; title: string; after: string; day: string; time: string; href: string};
/** The chained reminders due now: the habit before is done today, this one is scheduled and not done, not put off today. */
export function chainedDue(w: WReminders, data: Pick<HabitData, 'habits'>, today: string, clock = '00:00'): ChainedDue[] {
  const byId = new Map(data.habits.map(h => [h.id, h]));
  return Object.keys(w.chained).flatMap(id => {
    const habit = byId.get(id), before = habit?.stackAfterId ? byId.get(habit.stackAfterId) : undefined;
    if (!habit || !before || w.dismissed[`${CHAINED_PREFIX}${id}`] === today) return [];
    const mine = habitDay(habit, today, today);
    if (habitDay(before, today, today).status !== 'complete' || !mine.scheduled || !['due', 'partial'].includes(mine.status)) return [];
    return [{id: `${CHAINED_PREFIX}${id}`, kind: 'stack-next' as const, habitId: id, title: habit.title, after: before.title, day: today, time: clock, href: '/app/habits'}];
  });
}
/** Turns a habit's chained reminder on or off. */
export function setChained(w: WReminders, habitId: string, on: boolean): WReminders {
  const chained = {...w.chained};
  if (on) chained[habitId] = true; else delete chained[habitId];
  return wRemindersSchema.parse({...w, chained});
}
export const dismissChained = (w: WReminders, habitId: string, day: string): WReminders => wRemindersSchema.parse({...w, dismissed: {...w.dismissed, [`${CHAINED_PREFIX}${habitId}`]: day}});
