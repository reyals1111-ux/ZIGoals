import {habitDay, habitRuleOn, type Habit} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';
import type {CompactCell} from './compact';

/**
 * Session AV (owner follow-up 1, F-WEEK-GRID; Habitify's week view): one week, Monday to Sunday, every habit a row and
 * every day a cell — done, open, missed, skipped or not scheduled — from the journal's own day states, as the compact
 * list reads them. `offset` 0 is this week, −1 the week before. A day after today is never tappable. Pure.
 */
const TAPPABLE = new Set(['complete', 'partial', 'due', 'failed']);
export function weekDays(today: string, offset = 0): string[] {
  const monday = addLocalDays(today, -((localWeekday(today) + 6) % 7) + 7 * offset);
  return Array.from({length: 7}, (_, i) => addLocalDays(monday, i));
}
export function weekGrid(habits: readonly Habit[], today: string, offset = 0): {days: string[]; rows: {id: string; title: string; cells: CompactCell[]}[]} {
  const days = weekDays(today, offset);
  return {days, rows: habits.map(h => ({id: h.id, title: h.title, cells: days.map(date => {
    const day = habitDay(h, date, today), rule = habitRuleOn(h, date);
    return {date, status: day.status, done: day.status === 'complete', tappable: date <= today && !!rule && rule.type === 'build' && TAPPABLE.has(day.status)};
  })}))};
}
