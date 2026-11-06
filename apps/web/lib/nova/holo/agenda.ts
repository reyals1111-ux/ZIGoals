import {clockAngle} from './geometry';

/**
 * Session AL Part 11 (lane L8; ledger P-LA-14, LA-023): today's agenda as the Agenda page's day view builds it (habits at
 * their times, tasks with their times, contributions, bills, workouts, meals, reviews and imported events:
 * lib/agenda/build.ts buildAgenda + lib/agenda/time-items.ts withExtras), for the HUD's 24-hour clock and for "Next three".
 * "Next three" is now sorted by time across every source, so a habit at 2 PM and a task at 6 PM say their times (they
 * read "any time today" and the task was missing when the list came from the orbit's candidates).
 */
export type ClockSource = 'habit' | 'task' | 'contribution' | 'bill' | 'workout' | 'meal' | 'unbonding' | 'review' | 'event';
export type ClockInput = {id: string; source: ClockSource; pillar: string; title: string; time: string | null; href: string | null; state: 'done' | 'skipped' | 'open'};
export type ClockItem = ClockInput & {angle: number | null};
export type NextItem = ClockInput & {when: 'next' | 'later' | 'earlier' | 'anytime'};
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Every item with its place on the dial (null: any time of the day), in the day view's order. */
export const clockItems = (items: readonly ClockInput[]): ClockItem[] => items.map(i => ({...i, angle: clockAngle(i.time)}));
/**
 * The next `count` open items: the first at or after now by time, then the ones without a time, then those whose time has
 * passed ("earlier") — the Daily orbit card's order, over the whole agenda.
 */
export function nextItems(items: readonly ClockInput[], now: string, count = 3): NextItem[] {
  const clock = TIME.test(now) ? now : '00:00', seen = new Set<string>();
  const open = items.filter(i => i.state === 'open' && !seen.has(i.id) && (seen.add(i.id), true)).map((i, n) => ({i, n, time: i.time && TIME.test(i.time) ? i.time : null}));
  const rank = (t: string | null) => t === null ? 1 : t >= clock ? 0 : 2;
  return open.sort((a, b) => rank(a.time) - rank(b.time) || (a.time ?? '').localeCompare(b.time ?? '') || a.n - b.n).slice(0, count)
    .map(({i, time}, k) => ({...i, time, when: time === null ? 'anytime' : time < clock ? 'earlier' : k === 0 ? 'next' : 'later'}));
}
/** How the day stands: items, done, timed and untimed. */
export function dayCounts(items: readonly ClockInput[]): {total: number; done: number; timed: number; anytime: number} {
  return {total: items.length, done: items.filter(i => i.state === 'done').length, timed: items.filter(i => i.time && TIME.test(i.time)).length, anytime: items.filter(i => !i.time || !TIME.test(i.time)).length};
}
