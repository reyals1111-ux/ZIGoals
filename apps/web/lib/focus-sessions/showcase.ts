import {addLocalDays} from '../local-date';
import {focusSessionsSchema, type FocusSessions} from './schema';
import {POMODORO_DEFAULTS} from './pomodoro';

/**
 * Session AK (T3): the Showcase's fictional Pomodoro history, added to the Showcase's focus sessions
 * (lib/wrapped/showcase.ts `showcaseFocusSessions(day)`) before lib/showcase-data.ts writes `zigoals:focus-sessions:v1`:
 * two runs of four 25-minute blocks — yesterday's for "Example · Compare two savings accounts" (task_showcase-02 in
 * lib/tasks/showcase.ts), all grown, and one three days ago with one block withered (kept) — and the default lengths
 * remembered. Deterministic for a day; never written outside the Showcase.
 */
export function withShowcasePomodoro(record: FocusSessions, day: string): FocusSessions {
  const run = (date: string, startHour: number, taskId: string | null, witheredBlock: number | null, tag: string) => Array.from({length: 4}, (_, i) => {
    const start = Date.parse(`${date}T${String(startHour).padStart(2, '0')}:00:00.000Z`) + i * 30 * 60_000, withered = witheredBlock === i + 1;
    const focused = withered ? 11 * 60 : 25 * 60, away = withered ? 240 : 20;
    return {id: `focus_showcase-pomo-${tag}-${i + 1}`, startedAt: new Date(start).toISOString(), endedAt: new Date(start + (focused + away) * 1000).toISOString(), day: date,
      plannedMinutes: 25, focusedSeconds: focused, awaySeconds: away, outcome: withered ? 'withered' as const : 'grown' as const, mode: 'pomodoro', block: i + 1, ...(taskId ? {taskId} : {})};
  });
  const sessions = [...record.sessions, ...run(addLocalDays(day, -3), 14, null, 3, 'a'), ...run(addLocalDays(day, -1), 9, 'task_showcase-02', null, 'b')]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return focusSessionsSchema.parse({...record, sessions, pomodoro: {...POMODORO_DEFAULTS, sound: true, tickTask: true}});
}
