import {habitCalendarDay, habitDataSchema, habitRuleOn, latestHabitRule, ruleSchema, type Habit, type HabitData} from './habits';
import {DELETED_HABIT_NOTE, DELETED_HABIT_TITLE, isDeletedHabit, type DeletedHabit} from './habit-delete';
import {formatDate} from './visual-format';
/**
 * "Delete for good" and its Undo (Session Z-Cloud Part 4.6, ADR-019 C25; `[TIER 3] (data formats)`): the writes, loaded
 * when the person deletes a habit (the shell's form and the readers are in lib/habit-delete.ts).
 */
export function deleteHabitForGood(data: HabitData, id: string, now = new Date()): {data: HabitData; deleted: DeletedHabit} {
  const original = data.habits.find(habit => habit.id === id);
  if (!original || isDeletedHabit(original)) throw Error('This habit is no longer available. Refresh and try again.');
  if (latestHabitRule(original).state !== 'archived') throw Error('Archive the habit first; only an archived habit can be deleted for good.');
  // Gate B security read: the archive must be in effect, not only scheduled; a shell that is still due would show as due on
  // #32–#35, keep its reminders, and come back with any check-in another device records.
  if (habitRuleOn(original, habitCalendarDay(data, now))?.state !== 'archived') throw Error(`The archive starts on ${formatDate(latestHabitRule(original).from)}; the habit can be deleted for good from then.`);
  const at = now.toISOString(), updatedAt = at > original.updatedAt ? at : original.updatedAt;
  const shell: Habit = {
    id: original.id, title: DELETED_HABIT_TITLE, category: 'Deleted', description: '', notes: DELETED_HABIT_NOTE, timeOfDay: 'anytime',
    endCondition: original.endCondition, startDate: original.startDate,
    ...(original.ruleRevisions ? {ruleRevisions: original.ruleRevisions} : {}), ...(original.timerReceipts ? {timerReceipts: original.timerReceipts} : {}),
    createdAt: original.createdAt, updatedAt, rules: original.rules, entries: [],
  };
  const unstacked = data.habits.filter(habit => habit.stackAfterId === id).map(habit => habit.id);
  const habits = data.habits.map(habit => habit.id === id ? shell : habit.stackAfterId === id ? withoutStack(habit) : habit);
  return {data: habitDataSchema.parse({...data, habits}), deleted: {original, unstacked, shellUpdatedAt: updatedAt}};
}
/**
 * Session AL (P-NB-24; NB-135, NB-160, NB-181): "Delete for good" the same day, from any state. A habit whose archive is
 * not yet in effect (scheduled for tomorrow because today holds a check-in, or not archived at all) is archived from
 * today first: today's rule is replaced, which is safe here because the deletion removes today's check-ins anyway. The
 * shell is the same as deleteHabitForGood's, so every build reads it as before; Undo puts the original back.
 */
export function deleteHabitForGoodNow(data: HabitData, id: string, now = new Date()): {data: HabitData; deleted: DeletedHabit} {
  const original = data.habits.find(habit => habit.id === id);
  if (!original || isDeletedHabit(original)) throw Error('This habit is no longer available. Refresh and try again.');
  const today = habitCalendarDay(data, now);
  if (habitRuleOn(original, today)?.state === 'archived') return deleteHabitForGood(data, id, now);
  const base = habitRuleOn(original, today) ?? latestHabitRule(original), from = today < original.startDate ? original.startDate : today;
  const rule = ruleSchema.parse({...base, state: 'archived', from});
  const archived: Habit = {...original, rules: [...original.rules.filter(r => r.from < from), rule], endCondition: rule.endCondition, updatedAt: now.toISOString() > original.updatedAt ? now.toISOString() : original.updatedAt};
  const result = deleteHabitForGood(habitDataSchema.parse({...data, habits: data.habits.map(h => h.id === id ? archived : h)}), id, now);
  return {data: result.data, deleted: {...result.deleted, original}};
}
/** Undo: the habit and its stacks back, only while the shell and those habits are as the deletion left them. */
export function undoDeleteHabit(data: HabitData, deleted: DeletedHabit): HabitData {
  const shell = data.habits.find(habit => habit.id === deleted.original.id);
  if (!shell || !isDeletedHabit(shell) || shell.updatedAt !== deleted.shellUpdatedAt) throw Error('This habit changed since it was deleted, so Undo was not applied.');
  const habits = data.habits.map(habit => habit.id === deleted.original.id ? deleted.original
    : deleted.unstacked.includes(habit.id) && habit.stackAfterId === undefined ? {...habit, stackAfterId: deleted.original.id} : habit);
  return habitDataSchema.parse({...data, habits});
}
/**
 * A habit stacked after the deleted one stops being stacked. Its own `updatedAt` stays (Gate B security read): the merge is
 * field by field, so the cleared stack syncs on its own, and a check-in on that habit from another device does not
 * become a conflict to review.
 */
function withoutStack(habit: Habit): Habit {
  const rest = {...habit}; delete rest.stackAfterId;
  return rest;
}
