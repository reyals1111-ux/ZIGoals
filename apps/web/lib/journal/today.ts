import type {Journal, JournalEntry} from './schema';
import {onThisDay} from '../on-this-day/on-this-day';

/**
 * Session AV (1c, q4 #33, fresh-agent review): what Today's journal line knows — today's entries and the "On this day"
 * memories (with the person's own switch and the entries they set aside) — so Today can raise the journal card on a day
 * that has one, and, only when the person switched it on (`todayLines`), show the first line of each. Pure.
 */
export type JournalToday = {today: JournalEntry[]; memories: {entry: JournalEntry; label: string}[]};
export function journalToday(journal: Pick<Journal, 'entries'>, today: string, display: {shown: boolean; hidden?: readonly string[]}): JournalToday {
  return {today: journal.entries.filter(e => e.date === today), memories: display.shown ? onThisDay(journal.entries, today, {hidden: display.hidden ?? []}).map(m => ({entry: m.entry, label: m.label})) : []};
}
/** An entry's first line, at most `max` characters ("…" when cut), for Today's opt-in lines. */
export function firstLine(text: string, max = 80): string {
  const line = text.split(/\r?\n/).map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
