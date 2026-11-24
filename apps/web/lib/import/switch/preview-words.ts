import {formatDate, formatNumber} from '../../visual-format';
import type {Habit} from '../../habits';

/**
 * Review b2b #7 (LEDGER #194): the words of the "From Daylio, Habitica or YNAB" previews (components/import/
 * switch-import-more.tsx) with their days through the app's date formatter, as every other import preview writes them
 * ("Oct 1, 2026" in en-US, "1 Oct 2026" in en-GB), never a raw ISO day. Pure.
 */
type PreviewHabit = Pick<Habit, 'title'> & {entries: readonly {date: string}[]; rules: readonly {measurement: {kind: string}}[]};
/** "Fictional reading · 2 days from Oct 1, 2026 · with amounts". */
export function importedHabitLine(h: PreviewHabit): string {
  const days = h.entries.length;
  return `${h.title} · ${formatNumber(days)} ${days === 1 ? 'day' : 'days'}${h.entries[0] ? ` from ${formatDate(h.entries[0].date)}` : ''}${h.rules[0]?.measurement.kind === 'count' ? ' · with amounts' : ''}`;
}
/** "from Oct 1, 2026 to Oct 3, 2026" for a Daylio file's first and last day ("—" where a day is missing). */
export function dayRangeWords(entries: readonly {date: string}[]): string {
  const first = entries[0]?.date, last = entries.at(-1)?.date;
  return `from ${first ? formatDate(first) : '—'} to ${last ? formatDate(last) : '—'}`;
}
