import type {Meditation} from './schema';
import {addDays} from '../zone-time';
import {sessionDay, weekStart, weeklyBars} from './stats';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #413, Medito's consistency): the days with a session out of the days, over
 * the last 30 or 90 — up to yesterday while today has none yet (as the days in a row count), and from the first session
 * when that is later — and, with a weekly goal, the weeks it was met. A missed day only moves the window; it never
 * takes away a day already counted, and nothing is called a fall or a break. Derived; nothing stored.
 */
export type Consistency = {window: 30 | 90; from: string; to: string; days: number; withSession: number; weeks: number; goalWeeks: number | null; goal: number | null};
export function consistency(m: Meditation, today: string, window: 30 | 90 = 30): Consistency | null {
  const days = new Set(m.sessions.map(sessionDay));
  if (!days.size) return null;
  const to = days.has(today) ? today : addDays(today, -1), first = [...days].sort()[0]!;
  let from = addDays(to, 1 - window);
  if (first > from) from = first;
  if (from > to) return {window, from: today, to: today, days: 1, withSession: days.has(today) ? 1 : 0, weeks: 0, goalWeeks: null, goal: m.goal?.minutesPerWeek ?? null};
  let count = 0, n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) { n++; if (days.has(d)) count++; }
  // The weeks: every week Monday to Sunday that started in the window and has ended, and this week once its goal is met.
  const goal = m.goal?.minutesPerWeek ?? null, bars = weeklyBars(m, today, Math.ceil(window / 7) + 1).filter(b => b.weekStart >= weekStart(from));
  const ended = bars.filter(b => addDays(b.weekStart, 6) < today), current = bars.find(b => addDays(b.weekStart, 6) >= today);
  const counted = goal !== null && current && current.minutes >= goal ? [...ended, current] : ended;
  return {window, from, to, days: n, withSession: count, weeks: counted.length, goalWeeks: goal === null ? null : counted.filter(b => b.minutes >= goal).length, goal};
}
/** "18 of the last 30 days had a session", or from the first session when that is later. */
export function consistencyLine(c: Consistency, lang: 'en' | 'nl' = 'en'): string {
  const all = c.days === c.window;
  if (lang === 'nl') return `${c.withSession} van de ${all ? `laatste ${c.days}` : c.days} dagen${all ? '' : ' sinds je eerste sessie'} hadden een sessie${c.goalWeeks !== null && c.weeks ? `; je weekdoel gehaald in ${c.goalWeeks} van de ${c.weeks} weken` : ''}.`;
  return `${c.withSession} of the ${all ? `last ${c.days}` : c.days} days${all ? '' : ' since your first session'} had a session${c.goalWeeks !== null && c.weeks ? `; your weekly goal met in ${c.goalWeeks} of ${c.weeks} ${c.weeks === 1 ? 'week' : 'weeks'}` : ''}.`;
}
