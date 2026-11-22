import {addLocalDays} from '../local-date';
import {describeRecur} from './recurrence';
import type {Task} from './schema';

/**
 * Session AV lane 2 (r6-plan, LEDGER #396; Capacities' repeating-task stat cards, "Avg. interval"): a repeating task's own
 * record over the last 3 months, from its kept finishes (`completions`, round 5's #352 can take one back or move it): how
 * often it was done, how many on their day (or before it) and how many after it, and the average days between finishes
 * beside the rule ("Every 7 days · done on average every 9 days"). Facts only: never "behind", never a score. Pure.
 */
export const RECORD_DAYS = 91;
export type RepeatRecord = {done: number; onDay: number; late: number; average: number | null; rule: string; from: string};
const dayGap = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export function repeatRecord(task: Pick<Task, 'recur' | 'completions'>, today: string, doneDay: (iso: string) => string): RepeatRecord | null {
  if (!task.recur) return null;
  const from = addLocalDays(today, -(RECORD_DAYS - 1));
  const finishes = (task.completions ?? []).map(c => ({day: doneDay(c.at), due: c.due})).filter(c => c.day >= from && c.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  const days = [...new Set(finishes.map(c => c.day))], gaps = days.slice(1).map((d, i) => dayGap(days[i]!, d));
  return {
    done: finishes.length,
    onDay: finishes.filter(c => c.due && c.day <= c.due).length,
    late: finishes.filter(c => c.due && c.day > c.due).length,
    average: gaps.length ? Math.round(gaps.reduce((n, g) => n + g, 0) / gaps.length * 10) / 10 : null,
    rule: describeRecur(task.recur).replace(/ \(\d+ left\)$/, ''), from,
  };
}
const days = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? 'day' : 'days'}`;
/** The record in one plain line, English. */
export function recordWords(r: RepeatRecord): string {
  if (!r.done) return `${r.rule} · not done yet in the last 3 months.`;
  const times = r.done === 1 ? 'once' : `${r.done} times`, when = r.onDay || r.late ? ` (${r.onDay} by its day, ${r.late} after it)` : '';
  return `${r.rule} · done ${times} in the last 3 months${when}${r.average !== null ? ` · on average every ${days(r.average)}` : ''}.`;
}
