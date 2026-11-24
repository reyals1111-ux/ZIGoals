import {MAX_JOURNALS, type Journal, type JournalEntry} from './schema';
import {addBook, booksOf, newJournalId} from './books';

/**
 * Session AV lane 2 (r3-notes; LEDGER #278, Stoic's dream journal): "Write down a dream" on the morning's sleep entry opens
 * the Journal with an entry for a Dreams journal (made on its first use; a journal already called Dreams or Dromen is
 * used), linked to that night (`night`, the day the night ended, as the sleep log names it). The sleep log shows the
 * night's dream entries. Pure.
 */
export const DREAM_NAMES = ['dreams', 'dromen'];
export const dreamsBook = (journal: Pick<Journal, 'journals'>) => booksOf(journal).find(b => DREAM_NAMES.includes(b.name.trim().toLowerCase())) ?? null;
/** The Dreams journal's id, made when there is none and there is room (else null: the entry goes in the main Journal). */
export function withDreamsBook(journal: Journal, id = newJournalId()): {journal: Journal; book: string | null; made: boolean} {
  const found = dreamsBook(journal);
  if (found) return {journal, book: found.id, made: false};
  if (booksOf(journal).length >= MAX_JOURNALS) return {journal, book: null, made: false};
  const out = addBook(journal, {name: 'Dreams', theme: 'cyan'}, id);
  return {journal: out.journal, book: out.book.id, made: true};
}
/** A dream entry for a night: in the Dreams journal (made on first use), linked to the night. */
export function addDream(journal: Journal, entry: JournalEntry, night: string, bookId?: string): {journal: Journal; made: boolean} {
  const d = withDreamsBook(journal, bookId), {journal: _other, ...rest} = entry; void _other;
  const next: JournalEntry = {...rest, night, ...(d.book ? {journal: d.book} : {})};
  return {journal: {...d.journal, entries: [...d.journal.entries, next].slice(-5000)}, made: d.made};
}
/** The dream entries of a night, oldest first. */
export const dreamsOf = (entries: readonly JournalEntry[], night: string) => entries.filter(e => e.night === night).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
/** Every night with a dream written, newest first, with how many. */
export function dreamNights(entries: readonly JournalEntry[]): {night: string; count: number}[] {
  const m = new Map<string, number>();
  for (const e of entries) if (e.night) m.set(e.night, (m.get(e.night) ?? 0) + 1);
  return [...m].map(([night, count]) => ({night, count})).sort((a, b) => b.night.localeCompare(a.night));
}
