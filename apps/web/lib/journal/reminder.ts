import {addLocalDays} from '../local-date';
import {journalReminderSchema, journalSchema, type Journal, type JournalReminder} from './schema';
import {writingStreak} from './stats';

/**
 * Session AV lane 2 (journal; LEDGER #40, Day One's journaling reminders and streaks): a reminder to write, at a time and
 * on the weekdays the person chose, kept in the journal record (`reminder`, additive). The notification plan reads it
 * (lib/notify/plan.ts, kind `journal`): it wakes the device at that time on those days unless the person already wrote
 * that day, and its line says the writing streak it keeps. Off until switched on. Pure.
 */
export const DEFAULT_REMINDER: JournalReminder = {on: false, time: '21:00', days: 127};
/** The weekdays, Monday first, as the mask counts them (bit 0 is Monday … bit 6 Sunday, as lib/notify/zone weekdayBit and the push Workers). */
export const WEEKDAYS = [['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']] as const;
export const reminderOf = (journal: Pick<Journal, 'reminder'>): JournalReminder => journal.reminder ?? DEFAULT_REMINDER;
/** The journal with its reminder changed; a change that would leave no weekday, or a time that does not read, throws. */
export function withReminder(journal: Journal, change: Partial<JournalReminder>): Journal {
  const next = journalReminderSchema.safeParse({...reminderOf(journal), ...change});
  if (!next.success) throw new Error(change.days !== undefined ? 'Keep at least one day.' : 'Choose a time, for example 21:00.');
  return journalSchema.parse({...journal, reminder: next.data});
}
export const dayOn = (days: number, weekday: number) => (days & (1 << weekday)) !== 0;
export const toggleDay = (days: number, weekday: number) => days ^ (1 << weekday);
/** The days in words: "every day", "weekdays", "weekends", or the days by name ("Mon, Wed and Fri"). */
export function daysWords(days: number): string {
  if (days === 127) return 'every day';
  if (days === 31) return 'on weekdays';
  if (days === 96) return 'at weekends';
  const names = WEEKDAYS.filter((_, i) => dayOn(days, i)).map(([short]) => short);
  return `on ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? 'no day'}`;
}
/** A wall-clock time in plain words for the 24-hour field ("21:00"). */
export const reminderLine = (r: JournalReminder) => r.on ? `A reminder to write at ${r.time}, ${daysWords(r.days)}, unless you already wrote that day.` : 'No reminder to write.';

/**
 * What the notification plan needs: the time and weekdays, whether today (and tomorrow, for the 48-hour window) already
 * has an entry, and the streak a new entry today keeps or starts. Nothing of the entries' words. Null while off.
 */
export function reminderPlanInput(journal: Pick<Journal, 'reminder' | 'entries'>, today: string): {time: string; weekdays: number; written: string[]; streak: number} | null {
  const r = journal.reminder;
  if (!r?.on) return null;
  const days = new Set(journal.entries.map(e => e.date)), written = [today, addLocalDays(today, 1)].filter(d => days.has(d));
  const s = writingStreak(journal.entries, today);
  return {time: r.time, weekdays: r.days, written, streak: s.current};
}
/** The reminder's own line under the streak: what a new entry today does to it. */
export function streakNudge(entries: Journal['entries'], today: string): string {
  const s = writingStreak(entries, today);
  if (s.writtenToday) return s.current > 1 ? `Written today: ${s.current} days in a row.` : 'Written today.';
  if (s.current > 0) return `Write today to make it ${s.current + 1} days in a row.`;
  return s.longest > 0 ? `Your longest run is ${s.longest} ${s.longest === 1 ? 'day' : 'days'}. A few lines today start a new one.` : 'A few lines today start your streak.';
}
