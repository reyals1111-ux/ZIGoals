import {latestHabitRule, type Habit, type HabitData} from './habits';

/**
 * "Delete for good" for an archived habit (Session Z-Cloud Part 4.6, persona item 6, ADR-019 C25; `[TIER 3] (data formats)`).
 *
 * Sync refuses a habit whose accepted rule revisions or timer receipts disappear (`lib/vault/account-data.ts`
 * `assertHabitsRetained`), and every reader since #32 parses habits strictly, so a removed habit or a new "deleted" field
 * would leave other devices, #35 included, unable to sync Habits. A deleted habit therefore stays as a nameless shell in
 * today's format: its name, category, description and notes, its check-ins, its Goal and Health links, its stacking and a
 * running timer go; its id, dates, rules and the append-only rule revisions and timer receipts (no name in them) stay, it
 * is archived, and its notes carry `DELETED_HABIT_MARK`. This build hides a shell everywhere (`withoutDeletedHabits`) and
 * Export everything leaves it out; #32–#35 show an archived "Deleted habit" with no history. Habits that were stacked after
 * it stop being stacked. Undo puts the habit and those stacks back while nothing changed since. The writes are in
 * lib/habit-delete-write.ts, loaded when a habit is deleted; this file holds what every Habits page reads.
 */
export const DELETED_HABIT_MARK = 'zigoals:deleted-habit:v1';
export const DELETED_HABIT_TITLE = 'Deleted habit';
/** The notes a shell carries: the mark, then a sentence for builds #32–#35, which show the shell. */
export const DELETED_HABIT_NOTE = `${DELETED_HABIT_MARK} · Deleted for good on another device or this one: its name, notes and check-ins are gone. A newer ZIGoals hides it.`;

export function isDeletedHabit(habit: Habit): boolean {
  return habit.title === DELETED_HABIT_TITLE && habit.notes.startsWith(DELETED_HABIT_MARK) && habit.entries.length === 0 && latestHabitRule(habit).state === 'archived';
}
/** The record as this build shows it: shells left out. Writes always go through the full record. */
export function withoutDeletedHabits(data: HabitData): HabitData {
  return data.habits.some(isDeletedHabit) ? {...data, habits: data.habits.filter(habit => !isDeletedHabit(habit))} : data;
}
/** What Undo needs: the habit as it was, the habits whose stacking was cleared, and the shell's own stamp. */
export type DeletedHabit = {original: Habit; unstacked: string[]; shellUpdatedAt: string};
