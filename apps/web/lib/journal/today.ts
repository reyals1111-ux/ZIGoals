import type {Journal, JournalEntry} from './schema';
import {onThisDay, type DatedEntry} from '../on-this-day/on-this-day';
import {isSealed, unsealed} from './letters';

/**
 * Session AV (1c, q4 #33, fresh-agent review): what Today's journal line knows — today's entries and the "On this day"
 * memories (with the person's own switch and the entries they set aside) — so Today can raise the journal card on a day
 * that has one, and, only when the person switched it on (`todayLines`), show the first line of each. Pure.
 */
export type JournalToday = {today: JournalEntry[]; memories: {entry: JournalEntry; label: string}[]};
export function journalToday(journal: Pick<Journal, 'entries'>, today: string, display: {shown: boolean; hidden?: readonly string[]}): JournalToday {
  // Session AV lane 2 (review B3C-2): a letter still folded away is never a memory (it shows on its own day instead).
  return {today: journal.entries.filter(e => e.date === today), memories: display.shown ? journalMemories(journal.entries, today, {hidden: display.hidden ?? []}).map(m => ({entry: m.entry, label: m.label})) : []};
}
/** "On this day" for the journal: the memories of today's date, the letters still folded away left out (review B3C-2). */
export const journalMemories = <E extends DatedEntry & Pick<JournalEntry, 'opensOn'>>(entries: readonly E[], today: string, options: {hidden?: readonly string[]; max?: number} = {}) => onThisDay(unsealed(entries, today), today, options);
/**
 * Today's opt-in first lines (Journal → Privacy → Show the first lines on Today): today's last three entries and the first
 * three memories. A letter written today and folded away is counted but its first line is not shown (review B3C-2).
 */
export function journalLines(day: JournalToday, today: string): {id: string; when: string; text: string}[] {
  return [...day.today.filter(e => !isSealed(e, today)).slice(-3).map(e => ({id: e.id, when: 'Today', text: firstLine(e.text)})), ...day.memories.slice(0, 3).map(m => ({id: m.entry.id, when: m.label, text: firstLine(m.entry.text)}))].filter(l => l.text);
}
/** An entry's first line, at most `max` characters ("…" when cut), for Today's opt-in lines. */
export function firstLine(text: string, max = 80): string {
  const line = text.split(/\r?\n/).map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
