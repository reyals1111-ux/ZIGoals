import {addLocalDays} from '../local-date';
import {focusSessionsSchema, type FocusSessions} from '../focus-sessions/schema';

/**
 * Session AK (F5d): fictional focus sessions for the Showcase (for lib/showcase-data.ts to write under
 * `zigoals:focus-sessions:v1`, FOCUS_SESSIONS_KEY), so the Showcase's Wrapped and the focus garden have something to show.
 * Deterministic for a day: 24 sessions over the last 60 days, mostly grown, a few withered (kept, never deleted).
 */
export function showcaseFocusSessions(day: string): FocusSessions {
  const sessions = Array.from({length: 24}, (_, i) => {
    const date = addLocalDays(day, -(i * 5 % 60) - 1), planned = [25, 25, 45, 15][i % 4]!, withered = i % 7 === 3;
    const focused = withered ? Math.round(planned * 60 * 0.4) : planned * 60, away = withered ? 300 : 30;
    const start = Date.parse(`${date}T${i < 12 ? '09' : '15'}:${String(10 + (i % 4) * 10).padStart(2, '0')}:00.000Z`);
    return {id: `focus_showcase-${String(i + 1).padStart(3, '0')}`, startedAt: new Date(start).toISOString(), endedAt: new Date(start + (focused + away) * 1000).toISOString(), day: date, plannedMinutes: planned, focusedSeconds: focused, awaySeconds: away, outcome: withered ? 'withered' as const : 'grown' as const};
  }).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return focusSessionsSchema.parse({version: 1, sessions});
}
