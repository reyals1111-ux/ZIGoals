import {habitDay, habitRuleOn, logHabitValue, type HabitData} from '../habits';
import {addDays} from '../zone-time';
import {checklistDaysSchema, type Checklist, type ChecklistDays} from './schema';
import {fillOwnDay} from './habit-undo';
import {ChecklistError, orderedItems} from './store';

/**
 * Session AL fifth pass (LS-032 / C-LS-35): a missed day filled in afterwards, from the history. A past square opens that
 * day's own items: the path's habits (Habits keeps their record, so their streak and history follow) and your own items
 * (the path keeps only each day's count for them, so the count goes up by one, as "Done yesterday" does).
 *
 * The last 7 days, as habit apps usually allow; the history seals at most 14 back (BACKFILL_DAYS), and an older day stays
 * as it was sealed. Today is filled on the path itself. Goals, goal steps and Health items keep their own records with
 * their own dates, so they are changed on their pages.
 */
export const FILL_BACK_DAYS = 7;
/** Yesterday first, then back to `FILL_BACK_DAYS` days ago. */
export const fillableDays = (today: string, back = FILL_BACK_DAYS): string[] => Array.from({length: back}, (_, i) => addDays(today, -(i + 1)));
export const canFillDay = (today: string, date: string): boolean => date < today && date >= addDays(today, -FILL_BACK_DAYS);

export type PastRow = {id: string; label: string; kind: 'habit' | 'custom'; habitId?: string; state: 'done' | 'open' | 'rest'; note: string};
type Day = ChecklistDays['days'][string] & {filled?: string[]};
const filledOn = (days: ChecklistDays, date: string): string[] => { const f = (days.days[date] as Day | undefined)?.filled; return Array.isArray(f) ? f.filter((x): x is string => typeof x === 'string') : []; };

/**
 * The rows a past day can show: each habit and own item on the path, in the path's order, that was there on `date`
 * (`addedDay` turns an item's `addedAt` into its day). `habitsToday` is Habits' own today.
 */
export function pastDayRows(record: Checklist, days: ChecklistDays, habits: HabitData, date: string, habitsToday: string, addedDay: (at?: string) => string | null): PastRow[] {
  const filled = new Set(filledOn(days, date)), day = days.days[date];
  return orderedItems(record).flatMap((item): PastRow[] => {
    if ('input' in item) return [];
    if (item.kind === 'custom') {
      const added = addedDay(item.addedAt); if (added && added > date) return [];
      const label = item.label ?? 'My item';
      if (filled.has(item.id)) return [{id: item.id, label, kind: 'custom', state: 'done', note: 'Filled in'}];
      if (day && day.total > 0 && day.done >= day.total) return [{id: item.id, label, kind: 'custom', state: 'done', note: 'That day counts every item as done'}];
      return [{id: item.id, label, kind: 'custom', state: 'open', note: 'Not counted as done that day'}];
    }
    if (item.kind !== 'habit') return [];
    const habitId = (item.ref as {habitId?: string} | undefined)?.habitId, habit = habitId ? habits.habits.find(h => h.id === habitId) : undefined;
    if (!habitId || !habit) return [];
    const row = {id: item.id, label: habit.title, kind: 'habit' as const, habitId}, rule = habitRuleOn(habit, date);
    if (!rule) return [{...row, state: 'rest', note: 'Not started yet that day'}];
    const status = habitDay(habit, date, habitsToday).status, entry = habit.entries.find(e => e.date === date);
    if (rule.state !== 'active') return [{...row, state: 'rest', note: rule.state === 'paused' ? 'Paused that day' : 'Archived'}];
    if (rule.type !== 'build') return [{...row, state: 'rest', note: 'A quit or limit habit counts what you log: change it on Habits'}];
    if (status === 'skipped') return [{...row, state: 'rest', note: 'A rest day'}];
    if (rule.schedule.kind !== 'frequency' && rule.targetPeriod !== 'day') return [{...row, state: 'rest', note: `Counts a total per ${rule.targetPeriod}: log the amount on Habits`}];
    if (rule.schedule.kind === 'frequency') return [entry && entry.disposition === 'logged' && entry.count > 0 ? {...row, state: 'done', note: 'Checked in'} : {...row, state: 'open', note: 'No check-in that day'}];
    if (status === 'not-scheduled') return [{...row, state: 'rest', note: 'Not scheduled that day'}];
    if (status === 'complete') return [{...row, state: 'done', note: 'Done'}];
    return [{...row, state: 'open', note: entry && entry.count > 0 ? 'Partly done' : 'Not done'}];
  });
}

/**
 * A habit done on a past day: a check-in (+1) for an "X times per period" habit, else the day set to its target. Habits'
 * own rules hold (a scheduled, active day up to today, its limits).
 */
export function fillHabitDay(habits: HabitData, habitId: string, date: string, now = new Date()): HabitData {
  const habit = habits.habits.find(h => h.id === habitId); if (!habit) throw new ChecklistError('This habit is no longer on Habits.');
  const rule = habitRuleOn(habit, date); if (!rule) throw new ChecklistError(`${habit.title} had not started that day.`);
  if (rule.schedule.kind === 'frequency') return logHabitValue(habits, habitId, date, 1, {mode: 'add'}, now);
  if (rule.type !== 'build' || rule.targetPeriod !== 'day') throw new ChecklistError(`${habit.title} counts what you log: change that day on Habits.`);
  const count = habit.entries.find(e => e.date === date)?.count ?? 0;
  return logHabitValue(habits, habitId, date, Math.max(count, rule.target), {mode: 'set'}, now);
}

/**
 * The day's square after a habit was filled in: a day the history sealed counts it once more (it was counted there as not
 * done), kept in `filled` so it is never counted twice. A day with no square (nothing was sealed) is left alone.
 */
export function countHabitFill(days: ChecklistDays, date: string, id: string): ChecklistDays {
  const day = days.days[date];
  if (!day || day.done >= day.total || filledOn(days, date).includes(id)) return days;
  return checklistDaysSchema.parse(fillOwnDay(days, date, id, day.total));
}

/** Your own item done on a past day: that day's count up by one (`total` own items were on the path then). */
export function fillCustomDay(days: ChecklistDays, date: string, id: string, total: number): ChecklistDays {
  if (filledOn(days, date).includes(id)) throw new ChecklistError('Already filled in for that day.');
  const day = days.days[date];
  if (day && day.total > 0 && day.done >= day.total) throw new ChecklistError('That day already counts every item as done.');
  return fillOwnDay(days, date, id, total);
}
