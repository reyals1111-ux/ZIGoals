import {addLocalDays, localWeekday} from '../../local-date';
import type {WeekCell} from './habit-week';

/**
 * Session AM (ADR-038; art direction §4, Mind: "a month of journal marks"): the figures of NOVA's "Journal" widget, from
 * the Journal page's own record (lib/journal/schema.ts). Only each entry's day is read here: an entry's words never
 * leave its page, so this selector takes dates and nothing else.
 *
 * - The month: today's calendar month as weeks from Monday (as the Habits week reads), one cell per day. A day with an
 *   entry is "done"; today without one and the days to come are "ahead"; an earlier day without one is "missed", which
 *   the widget draws as a plain empty cell (a quiet day, said without blame); cells outside the month are "rest" (blank).
 * - The streak: the days in a row with an entry, ending today — or yesterday while today is still open, so a streak is
 *   not read as broken before the day is over.
 */
export type JournalWeek = {key: string; /** The row's first day inside the month. */ first: string; cells: WeekCell[]};
export type JournalMonth = {
  /** Entries in the journal at all (0: nothing yet, the widget teaches). */
  total: number;
  /** The month shown, "YYYY-MM". */
  month: string;
  /** Entries written this month, and the days of this month with at least one. */
  entries: number; daysWritten: number;
  streak: number;
  /** The day of the latest entry up to today (null: none). */
  lastDate: string | null;
  weeks: JournalWeek[];
  /** The Monday the first row starts on (may lie in the month before): its seven days name the columns. */
  firstMonday: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function journalMonth(entries: readonly {date: string}[], today: string): JournalMonth {
  const dates = entries.map(e => e.date).filter(d => typeof d === 'string' && DAY.test(d)), written = new Set(dates);
  const month = today.slice(0, 7), first = `${month}-01`;
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate(), last = `${month}-${String(days).padStart(2, '0')}`;
  const firstMonday = addLocalDays(first, -((localWeekday(first) + 6) % 7));
  const weeks: JournalWeek[] = [];
  for (let monday = firstMonday; monday <= last; monday = addLocalDays(monday, 7)) {
    const row = Array.from({length: 7}, (_, i) => addLocalDays(monday, i)), inMonth = row.filter(d => d >= first && d <= last);
    weeks.push({key: monday, first: inMonth[0]!, cells: row.map(d => d < first || d > last ? 'rest' : written.has(d) ? 'done' : d >= today ? 'ahead' : 'missed')});
  }
  let streak = 0;
  for (let d = written.has(today) ? today : addLocalDays(today, -1); written.has(d); d = addLocalDays(d, -1)) streak++;
  const past = dates.filter(d => d <= today).sort();
  return {
    total: dates.length, month, entries: dates.filter(d => d.startsWith(month)).length,
    daysWritten: [...written].filter(d => d.startsWith(month)).length, streak, lastDate: past.at(-1) ?? null, weeks, firstMonday,
  };
}
