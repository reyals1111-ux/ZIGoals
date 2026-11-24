import {JOURNAL_ID, JOURNAL_NAME_MAX, JOURNAL_THEMES, MAX_JOURNALS, journalSchema, type Journal, type JournalBook, type JournalEntry, type JournalTheme} from './schema';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's several journals with themes): up to ten journals beside the main
 * one, each with a name and a colour (kept in the journal record's `journals`; an entry names its journal in `journal`).
 * An entry with no journal, or with one that is gone, is in the main Journal, so a record from an older build reads as
 * one journal. Removing a journal moves its entries to the main Journal (nothing is deleted). Pure.
 */
export const MAIN_JOURNAL = {id: null, name: 'Journal', theme: 'violet' as JournalTheme};
export const THEME_WORDS: Record<JournalTheme, string> = {violet: 'Violet', cyan: 'Sky', magenta: 'Rose', teal: 'Teal', gold: 'Gold', green: 'Green'};
export type BookChoice = 'all' | 'main' | string;
export const booksOf = (journal: Pick<Journal, 'journals'>): JournalBook[] => journal.journals ?? [];
/** The journal an entry is in (the main Journal for none or one that is gone). */
export function bookOf(journal: Pick<Journal, 'journals'>, entry: Pick<JournalEntry, 'journal'>): JournalBook | null {
  return entry.journal ? booksOf(journal).find(b => b.id === entry.journal) ?? null : null;
}
/** Whether an entry belongs to the chosen journal ("all", "main" or a journal's id). */
export function inBook(journal: Pick<Journal, 'journals'>, entry: Pick<JournalEntry, 'journal'>, choice: BookChoice): boolean {
  if (choice === 'all') return true;
  const book = bookOf(journal, entry);
  return choice === 'main' ? book === null : book?.id === choice;
}
export const newJournalId = () => `j-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12)}`;
/** Why a name cannot be used (empty, too long, the main Journal's own name, or another journal's), or null. */
export function bookNameIssue(journal: Pick<Journal, 'journals'>, raw: string, except?: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return 'Give the journal a name.';
  if (name.length > JOURNAL_NAME_MAX) return `A name can be at most ${JOURNAL_NAME_MAX} characters.`;
  if (name.toLowerCase() === MAIN_JOURNAL.name.toLowerCase()) return '“Journal” is the main journal’s name. Choose another.';
  if (booksOf(journal).some(b => b.id !== except && b.name.toLowerCase() === name.toLowerCase())) return 'You have a journal with that name.';
  return null;
}
export function addBook(journal: Journal, input: {name: string; theme: JournalTheme}, id = newJournalId()): {journal: Journal; book: JournalBook} {
  if (booksOf(journal).length >= MAX_JOURNALS) throw new Error(`Up to ${MAX_JOURNALS} journals beside the main one.`);
  const issue = bookNameIssue(journal, input.name); if (issue) throw new Error(issue);
  if (!JOURNAL_ID.test(id)) throw new Error('This journal could not be made.');
  const book: JournalBook = {id, name: input.name.trim().replace(/\s+/g, ' '), theme: JOURNAL_THEMES.includes(input.theme) ? input.theme : 'violet'};
  return {journal: journalSchema.parse({...journal, journals: [...booksOf(journal), book]}), book};
}
export function changeBook(journal: Journal, id: string, change: {name?: string; theme?: JournalTheme}): Journal {
  const book = booksOf(journal).find(b => b.id === id);
  if (!book) throw new Error('That journal is no longer on this device.');
  if (change.name !== undefined) { const issue = bookNameIssue(journal, change.name, id); if (issue) throw new Error(issue); }
  return journalSchema.parse({...journal, journals: booksOf(journal).map(b => b.id === id ? {...b, ...(change.name !== undefined ? {name: change.name.trim().replace(/\s+/g, ' ')} : {}), ...(change.theme ? {theme: change.theme} : {})} : b)});
}
/** Removes a journal; its entries move to the main Journal. Returns what Undo needs (the journal and the moved ids). */
export function removeBook(journal: Journal, id: string): {journal: Journal; undo: {book: JournalBook; at: number; moved: string[]}} {
  const at = booksOf(journal).findIndex(b => b.id === id);
  if (at < 0) throw new Error('That journal is no longer on this device.');
  const moved = journal.entries.filter(e => e.journal === id).map(e => e.id);
  const entries = journal.entries.map(e => e.journal === id ? withoutBook(e) : e);
  return {journal: journalSchema.parse({...journal, journals: booksOf(journal).filter(b => b.id !== id), entries}), undo: {book: booksOf(journal)[at]!, at, moved}};
}
/** Undo of a removal: the journal back in its place and its entries back in it (an entry since removed stays gone). */
export function restoreBook(journal: Journal, undo: {book: JournalBook; at: number; moved: string[]}): Journal {
  if (booksOf(journal).some(b => b.id === undo.book.id)) return journal;
  const books = [...booksOf(journal)]; books.splice(Math.min(undo.at, books.length), 0, undo.book);
  const moved = new Set(undo.moved);
  return journalSchema.parse({...journal, journals: books.slice(0, MAX_JOURNALS), entries: journal.entries.map(e => moved.has(e.id) ? {...e, journal: undo.book.id} : e)});
}
const withoutBook = (e: JournalEntry): JournalEntry => { const {journal: _j, ...rest} = e; void _j; return rest; };
/** An entry moved to a journal (null: the main Journal). */
export function moveEntry(journal: Journal, entryId: string, bookId: string | null): Journal {
  if (bookId && !booksOf(journal).some(b => b.id === bookId)) throw new Error('That journal is no longer on this device.');
  return journalSchema.parse({...journal, entries: journal.entries.map(e => e.id !== entryId ? e : bookId ? {...e, journal: bookId} : withoutBook(e))});
}
/** How many entries each journal holds (main first). */
export function bookCounts(journal: Pick<Journal, 'journals' | 'entries'>): {id: string | null; name: string; theme: JournalTheme; count: number}[] {
  const books = booksOf(journal);
  return [{...MAIN_JOURNAL, count: journal.entries.filter(e => !bookOf(journal, e)).length}, ...books.map(b => ({id: b.id, name: b.name, theme: b.theme, count: journal.entries.filter(e => e.journal === b.id).length}))];
}
