import {habitDay, habitRuleOn, habitStats, setHabitEntryStatus, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';

/**
 * Streak repair with an earned freeze: every seven-day streak any habit has ever reached earns one freeze; a freeze
 * turns one missed day of the last week into a skipped day ("Streak freeze" in its note, a skipped entry through the
 * journal's own mutator), so the streak that day broke is whole again. Used freezes are counted from those entries, so
 * the balance is derived, never stored. Never automatic: the person chooses the day.
 */
export const FREEZE_NOTE = 'Streak freeze';
export function freezesEarned(data: HabitData, today: string): number { return data.habits.reduce((n, h) => n + Math.floor(habitStats(h, today).bestStreak / 7), 0); }
export function freezesUsed(data: HabitData): number { return data.habits.reduce((n, h) => n + h.entries.filter(e => e.disposition === 'skipped' && e.note === FREEZE_NOTE).length, 0); }
/** At most five in hand: enough to mend a week, never a stockpile that makes a miss meaningless. */
export const MAX_FREEZES = 5;
export const freezesAvailable = (data: HabitData, today: string) => Math.min(MAX_FREEZES, Math.max(0, freezesEarned(data, today) - freezesUsed(data)));
export type RepairableDay = {habitId: string; title: string; date: string};
/** The missed days of the last seven that a freeze could repair. */
export function repairableDays(data: HabitData, today: string): RepairableDay[] {
  const out: RepairableDay[] = [];
  for (const h of data.habits) {
    if (habitRuleOn(h, today)?.state !== 'active') continue;
    for (let i = 1; i <= 7; i++) { const date = addLocalDays(today, -i); if (date < h.startDate) break; if (habitDay(h, date, today).status === 'failed') out.push({habitId: h.id, title: h.title, date}); }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
export function applyFreeze(data: HabitData, habitId: string, date: string, today: string, now = new Date()): HabitData {
  if (freezesAvailable(data, today) <= 0) throw new Error('No freeze to use yet: a seven-day streak earns one.');
  if (!repairableDays(data, today).some(d => d.habitId === habitId && d.date === date)) throw new Error('A freeze repairs a missed day of the last week.');
  return setHabitEntryStatus(data, habitId, date, 'skipped', FREEZE_NOTE, now);
}
