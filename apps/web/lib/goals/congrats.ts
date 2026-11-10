/**
 * Session AL third pass (L4; competitor row GAP-121 / P-DVG-10, "a custom congrats message", and "time logged in h/min"):
 * - a few words the person writes now for the day the goal is reached, shown on its "Goal reached" card. Kept in the goal
 *   extras record (zigoals:goal-extras:v1, a loose record: older readers keep an unknown field) as `congrats`, ≤ 300
 *   characters; additive and optional (stored-format note for the integrator).
 * - the time a goal's focus sessions and hand-logged time add up to, read from its notes' "Focus session: N min (day)"
 *   lines (lib/focus-session.ts); hours and minutes typed by hand become a "Time logged: N min (day)" line.
 */
import {goalExtrasSchema, type GoalExtras} from '../goal-extras/store';

export const CONGRATS_MAX = 300;
/** The message kept for this goal, or '' (a malformed value reads as none). */
export function congratsOf(extras: GoalExtras, goalKey: string): string {
 const v = (extras.goals[goalKey] as {congrats?: unknown} | undefined)?.congrats;
 return typeof v === 'string' ? v.slice(0, CONGRATS_MAX) : '';
}
/** Sets (or, with blank text, removes) the message. */
export function setCongrats(extras: GoalExtras, goalKey: string, text: string, at: string): GoalExtras {
 const words = text.replace(/\s+/g, ' ').trim().slice(0, CONGRATS_MAX);
 const {congrats: _old, ...rest} = (extras.goals[goalKey] ?? {}) as Record<string, unknown>; void _old;
 const next = words ? {...rest, congrats: words, updatedAt: at} : {...rest, updatedAt: at};
 return goalExtrasSchema.parse({...extras, goals: {...extras.goals, [goalKey]: next}});
}

const LINE = /^(?:Focus session|Time logged): (\d{1,5}) min \(/gm;
/** Minutes logged in a goal's notes (focus sessions and time added by hand). */
export function loggedMinutes(notes: string | undefined): number {
 let total = 0;
 for (const m of (notes ?? '').matchAll(LINE)) total += Number(m[1]);
 return total;
}
/** "2 h 15 min", "45 min", "0 min". */
export const hoursMinutes = (minutes: number) => { const m = Math.max(0, Math.round(minutes)), h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };
/** Hours and minutes typed by hand → the notes line, or the reason it cannot be added. */
export function timeLine(hoursText: string, minutesText: string, day: string): {line: string} | {error: string} {
 const h = hoursText.trim() ? Number(hoursText) : 0, m = minutesText.trim() ? Number(minutesText) : 0;
 if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) return {error: 'Enter whole hours and minutes, like 1 and 30.'};
 if (m > 59) return {error: 'Minutes go up to 59; add the rest as hours.'};
 const total = h * 60 + m;
 if (total > 24 * 60) return {error: 'Log up to 24 hours at a time.'};
 return total >= 1 ? {line: `Time logged: ${total} min (${day})`} : {error: 'Enter at least one minute.'};
}
