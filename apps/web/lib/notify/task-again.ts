import {notifyPrefsSchema, type NotifyPrefs} from './prefs';

// Session AW Part 2 (speed, attempt 2): setting the task reminders' repeat and own snooze choices — out of lib/notify/prefs.ts,
// which every page loads; the record's schema (with `taskAgain` and `snoozes`) and taskAgainOf stay there.
export function setTaskAgain(p: NotifyPrefs, again: {every: number; times: number} | null): NotifyPrefs {
  const next: Record<string, unknown> = {...p};
  if (again) next.taskAgain = {every: again.every, times: again.times}; else delete next.taskAgain;
  const parsed = notifyPrefsSchema.parse(next);
  if (again && !parsed.taskAgain) throw new Error('Choose every 5, 10, 15 or 30 minutes, 2 to 10 times.');
  return parsed;
}
/** Session AW (X1, LEDGER #439): the person's own snooze choices (null: back to the usual three). */
export function setSnoozes(p: NotifyPrefs, list: readonly unknown[] | null): NotifyPrefs {
  const next: Record<string, unknown> = {...p};
  if (list && list.length) next.snoozes = [...list].slice(0, 6); else delete next.snoozes;
  return notifyPrefsSchema.parse(next);
}
