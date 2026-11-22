import {habitDay, habitRuleOn, logHabitValue, restoreHabitEntry, setHabitEntryStatus, smartDoneValue, type Habit, type HabitData} from '../habits';

/**
 * Session AV lane 2 (habits pillar; QUALITY "Not fixed", q4 #30 — Habitify's week view skips and logs amounts per
 * cell): what one day of the week grid can become, and the change each choice writes, through the journal's own
 * mutators (the History's: `logHabitValue`, `setHabitEntryStatus`, `restoreHabitEntry`). A build habit's scheduled day
 * up to today, open, done, missed or skipped. Skip is offered for a habit counted per day (one counted per week, month
 * or year skips in its History, as the planned skip says). Pure.
 */
export type DayEdit = {date: string; status: string; count: number; target: number; kind: string; unit: string; canSkip: boolean; skipped: boolean; amount: boolean};
const EDITABLE = new Set(['complete', 'partial', 'due', 'failed', 'skipped']);
export function dayEdit(habit: Habit, date: string, today: string): DayEdit | null {
  const rule = habitRuleOn(habit, date);
  if (!rule || rule.type !== 'build' || rule.state !== 'active' || date > today) return null;
  const day = habitDay(habit, date, today);
  if (!EDITABLE.has(day.status)) return null;
  const m = rule.measurement as {kind: string; unit?: string};
  const perDay = rule.schedule.kind !== 'frequency' && rule.targetPeriod === 'day';
  return {date, status: day.status, count: day.count ?? 0, target: smartDoneValue(rule), kind: m.kind, unit: m.unit ?? '', canSkip: perDay, skipped: day.status === 'skipped', amount: m.kind !== 'boolean'};
}
export type DayChoice = {kind: 'done'} | {kind: 'skip'} | {kind: 'amount'; value: number} | {kind: 'clear'};
/** The journal after a choice; Undo is `restoreHabitEntry` with the entry read before (`entryBefore`). */
export function applyDayChoice(data: HabitData, habitId: string, date: string, choice: DayChoice, now = new Date()): HabitData {
  const habit = data.habits.find(h => h.id === habitId), rule = habit && habitRuleOn(habit, date);
  if (!habit || !rule) throw new Error('This habit could not be found.');
  if (choice.kind === 'skip') return setHabitEntryStatus(data, habitId, date, 'skipped', 'Skipped from the week', now);
  if (choice.kind === 'clear') return restoreHabitEntry(data, habitId, date, undefined, now);
  // A skipped day logged again keeps no skip: the value replaces it, as a check-in in the History does.
  return logHabitValue(data, habitId, date, choice.kind === 'done' ? smartDoneValue(rule) : choice.value, {mode: 'set'}, now);
}
export const entryBefore = (data: HabitData, habitId: string, date: string) => data.habits.find(h => h.id === habitId)?.entries.find(e => e.date === date);
/** The toast's words for a choice ("Read: skipped on Tuesday 17 November."). */
export function dayChoiceWords(title: string, dayWords: string, choice: DayChoice, unit: string): string {
  const on = dayWords === 'today' ? 'today' : `on ${dayWords}`;
  if (choice.kind === 'done') return `${title}: done ${on}.`;
  if (choice.kind === 'skip') return `${title}: skipped ${on}. A skipped day keeps the streak.`;
  if (choice.kind === 'clear') return `${title}: ${dayWords} is cleared.`;
  return `${title}: ${choice.value.toLocaleString('en-US', {maximumFractionDigits: 2})}${unit ? ` ${unit}` : ''} ${on}.`;
}
