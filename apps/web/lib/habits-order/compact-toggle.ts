import {habitDay, habitRuleOn, smartDoneValue, type Habit} from '../habits';

/**
 * Session AK (5.7, wiring): what one tap in the compact list writes, pure. Done → the day's target (what the card's
 * Complete writes), not done → nothing logged; the day's note stays, and `before` is the value Undo puts back. Null for a
 * day that cannot change from here (not scheduled, skipped, paused, a quit or limit habit), or when nothing would change.
 */
export type CompactToggle = {value: number; before: number; note: string | undefined; title: string; done: boolean};
export function compactToggle(habit: Habit, date: string, today: string, done: boolean): CompactToggle | null {
  const rule = habitRuleOn(habit, date);
  if (!rule || rule.type !== 'build' || date > today) return null;
  const day = habitDay(habit, date, today);
  if (!['complete', 'partial', 'due', 'failed'].includes(day.status)) return null;
  const before = day.count ?? 0, value = done ? smartDoneValue(rule) : 0;
  if (value === before && (done ? day.status === 'complete' : before === 0)) return null;
  return {value, before, note: day.note || undefined, title: habit.title, done};
}
/** The toast's words: "Walk: done for today." / "Walk: Monday 3 November is no longer complete." */
export function compactToggleWords(t: Pick<CompactToggle, 'title' | 'done'>, dayWords: string): {message: string; undone: string} {
  return t.done ? {message: `${t.title}: done for ${dayWords}.`, undone: `${t.title}: ${dayWords} is back as it was.`}
    : {message: `${t.title}: ${dayWords} is no longer complete.`, undone: `${t.title}: ${dayWords} is complete again.`};
}
