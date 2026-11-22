import {addLocalDays} from '../local-date';
import type {Journal, JournalEntry} from './schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #279, Stoic's "Think Ahead"): a letter to open later. An entry can get a day to open
 * on (`opensOn`: in a month, six months, a year, or a day chosen); until then the Journal shows it folded away, its words
 * hidden; on its day it shows on Today ("A letter you wrote … opens today") for a week, and the Journal's reminder
 * reaches the device that morning (the notification plan's journal kind; never a word of the letter). Pure.
 */
const pad = (n: number) => String(n).padStart(2, '0');
/** A day `months` months on (the last day of a shorter month: 31 Jan + 1 month is 28 or 29 Feb). */
export function addMonths(day: string, months: number): string {
  const y = Number(day.slice(0, 4)), m = Number(day.slice(5, 7)) - 1 + months, d = Number(day.slice(8, 10));
  const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12, last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${pad(mm + 1)}-${pad(Math.min(d, last))}`;
}
export type OpensChoice = 'month' | 'half' | 'year';
export const OPENS_WORDS: Record<OpensChoice, string> = {month: 'In a month', half: 'In six months', year: 'In a year'};
export const opensOnFor = (choice: OpensChoice, today: string) => addMonths(today, choice === 'month' ? 1 : choice === 'half' ? 6 : 12);
/** Whether an entry is a letter still folded away. */
export const isSealed = (e: Pick<JournalEntry, 'opensOn'>, today: string) => !!e.opensOn && e.opensOn > today;
/**
 * Session AV lane 2 (review B3C-2/3/4/14): the entries whose words may be shown or read: every entry but the letters still
 * folded away. On this day, Today's first lines, Every answer to a prompt, the journal search and ZIGi's and NOVA's
 * journal tool all read through this, so a letter stays folded everywhere until its day.
 */
export const unsealed = <E extends Pick<JournalEntry, 'opensOn'>>(entries: readonly E[], today: string): E[] => entries.filter(e => !isSealed(e, today));
/** How long a letter stays on Today after its day. */
export const LETTER_DAYS_ON_TODAY = 7;
/** The letters that opened today or in the last week, the newest opening first. */
export const lettersOpen = (entries: readonly JournalEntry[], today: string) => entries.filter(e => e.opensOn && e.opensOn <= today && e.opensOn > addLocalDays(today, -LETTER_DAYS_ON_TODAY)).sort((a, b) => b.opensOn!.localeCompare(a.opensOn!));
/** The letters still folded away, the next to open first. */
export const lettersAhead = (entries: readonly JournalEntry[], today: string) => entries.filter(e => isSealed(e, today)).sort((a, b) => a.opensOn!.localeCompare(b.opensOn!));
/** What the notification plan needs: the day each letter opens (from today on), an id, and never its words. */
export const letterWakes = (journal: Pick<Journal, 'entries'>, today: string): {id: string; date: string}[] => journal.entries.filter(e => e.opensOn && e.opensOn >= today).map(e => ({id: `letter:${e.id}`, date: e.opensOn!})).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20);
/** A letter given a day to open on, or that day taken away (it opens now). */
export function withOpensOn(journal: Journal, entryId: string, opensOn: string | null): Journal {
  if (!journal.entries.some(e => e.id === entryId)) throw new Error('This entry is no longer on this device.');
  return {...journal, entries: journal.entries.map(e => { if (e.id !== entryId) return e; const {opensOn: _o, ...rest} = e; void _o; return opensOn ? {...rest, opensOn} : rest; })};
}
