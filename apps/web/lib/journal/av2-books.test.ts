import {describe, expect, test} from 'vitest';
import {addBook, bookCounts, bookNameIssue, bookOf, changeBook, inBook, moveEntry, removeBook, restoreBook} from './books';
import {dateQuery, filterEntries, monthGrid, shiftMonth} from './search';
import {emptyJournal, journalSchema, type Journal} from './schema';
import {showcaseJournal} from './showcase';

/** Session AV lane 2 (journal; LEDGER #43, Day One's journals, themes, search by date and calendar), pure. */
const e = (id: string, date: string, text = 'A fictional day.', extra: object = {}) => ({id, date, text, createdAt: `${date}T20:00:00.000Z`, ...extra});
const base = (): Journal => journalSchema.parse({...emptyJournal(), entries: [e('a', '2026-11-01', 'Walk by the sea'), e('b', '2026-11-03', 'Busy at work', {tags: ['work']}), e('c', '2026-11-20', 'Quiet evening')]});

describe('several journals', () => {
  test('make, rename, colour; names are checked; the main Journal keeps every entry with no journal or a gone one', () => {
    const made = addBook(base(), {name: ' Fictional  travel ', theme: 'teal'}, 'j-travel01'), book = made.book;
    let journal = made.journal;
    expect(book).toEqual({id: 'j-travel01', name: 'Fictional travel', theme: 'teal'});
    expect(bookNameIssue(journal, 'journal')).toContain('main journal');
    expect(bookNameIssue(journal, 'FICTIONAL TRAVEL')).toBe('You have a journal with that name.');
    expect(bookNameIssue(journal, 'FICTIONAL TRAVEL', 'j-travel01')).toBeNull();
    expect(() => addBook(journal, {name: '', theme: 'gold'})).toThrow('Give the journal a name.');
    journal = changeBook(journal, 'j-travel01', {name: 'Trips', theme: 'gold'});
    expect(journal.journals).toEqual([{id: 'j-travel01', name: 'Trips', theme: 'gold'}]);
    journal = moveEntry(journal, 'a', 'j-travel01');
    expect(bookOf(journal, journal.entries[0]!)?.name).toBe('Trips');
    expect(bookOf(journal, {journal: 'j-gone0000'})).toBeNull();
    expect(inBook(journal, journal.entries[0]!, 'j-travel01')).toBe(true);
    expect(inBook(journal, journal.entries[1]!, 'main')).toBe(true);
    expect(bookCounts(journal).map(b => [b.name, b.count])).toEqual([['Journal', 2], ['Trips', 1]]);
    expect(() => moveEntry(journal, 'a', 'j-nothere00')).toThrow();
    expect(moveEntry(journal, 'a', null).entries[0]).not.toHaveProperty('journal');
  });
  test('removing a journal keeps its entries in the main Journal; Undo puts it and them back', () => {
    let journal = addBook(base(), {name: 'Trips', theme: 'teal'}, 'j-travel01').journal;
    journal = moveEntry(moveEntry(journal, 'a', 'j-travel01'), 'c', 'j-travel01');
    const {journal: after, undo} = removeBook(journal, 'j-travel01');
    expect(after.journals).toEqual([]); expect(after.entries).toHaveLength(3);
    expect(after.entries.every(x => !x.journal)).toBe(true);
    expect(undo.moved).toEqual(['a', 'c']);
    const back = restoreBook(after, undo);
    expect(back.journals).toEqual(journal.journals); expect(back.entries.filter(x => x.journal === 'j-travel01').map(x => x.id)).toEqual(['a', 'c']);
    expect(restoreBook(back, undo)).toBe(back);
  });
  test('up to ten beside the main one', () => {
    let j = base();
    for (let i = 0; i < 10; i++) j = addBook(j, {name: `Fictional ${i}`, theme: 'violet'}, `j-many${String(i).padStart(4, '0')}`).journal;
    expect(() => addBook(j, {name: 'One more', theme: 'violet'})).toThrow('Up to 10 journals');
  });
  test('the Showcase has a second journal, labelled as an example, holding its two run entries', () => {
    const s = showcaseJournal('2026-11-23');
    expect(s.journals).toEqual([{id: 'j-showcaseruns', name: 'Example · Runs', theme: 'teal'}]);
    expect(s.entries.filter(x => x.journal === 'j-showcaseruns').map(x => x.text)).toEqual([expect.stringContaining('Ran 5 km'), expect.stringContaining('A short run helped')]);
    expect(s.entries).toHaveLength(10);
  });
});

describe('search by date and the calendar', () => {
  const today = '2026-11-23';
  test('a typed date reads as a day range; words stay words', () => {
    expect(dateQuery('2026-11-03', today)).toEqual({from: '2026-11-03', to: '2026-11-03'});
    expect(dateQuery('2026-11', today)).toEqual({from: '2026-11-01', to: '2026-11-30'});
    expect(dateQuery('3 nov', today)).toEqual({from: '2026-11-03', to: '2026-11-03'});
    expect(dateQuery('Nov 3, 2025', today)).toEqual({from: '2025-11-03', to: '2025-11-03'});
    expect(dateQuery('3 maart', today)).toEqual({from: '2026-03-03', to: '2026-03-03'});
    expect(dateQuery('february 2024', today)).toEqual({from: '2024-02-01', to: '2024-02-29'});
    for (const words of ['may', 'march', 'walk', '31 feb', '2026-13', '']) expect(dateQuery(words, today), words).toBeNull();
  });
  test('the list keeps words, tags, a journal and a day range together, newest first', () => {
    const j = moveEntry(addBook(base(), {name: 'Trips', theme: 'teal'}, 'j-travel01').journal, 'a', 'j-travel01');
    expect(filterEntries(j, {}, today).map(x => x.id)).toEqual(['c', 'b', 'a']);
    expect(filterEntries(j, {query: '3 nov'}, today).map(x => x.id)).toEqual(['b']);
    expect(filterEntries(j, {query: '2026-11'}, today).map(x => x.id)).toEqual(['c', 'b', 'a']);
    expect(filterEntries(j, {from: '2026-11-02', to: '2026-11-20'}, today).map(x => x.id)).toEqual(['c', 'b']);
    expect(filterEntries(j, {from: '2026-11-02', query: 'quiet'}, today).map(x => x.id)).toEqual(['c']);
    expect(filterEntries(j, {query: '#work'}, today).map(x => x.id)).toEqual(['b']);
    expect(filterEntries(j, {tag: 'work', from: '2026-11-04'}, today)).toEqual([]);
    expect(filterEntries(j, {book: 'j-travel01'}, today).map(x => x.id)).toEqual(['a']);
    expect(filterEntries(j, {book: 'main'}, today).map(x => x.id)).toEqual(['c', 'b']);
  });
  test('a month grid, Monday first, with each day’s count; months step across years', () => {
    const weeks = monthGrid('2026-11', base().entries, today);
    expect(weeks[0]![0]!.date).toBe('2026-10-26'); // Nov 1, 2026 is a Sunday
    expect(weeks.flat().find(d => d.date === '2026-11-03')).toEqual({date: '2026-11-03', inMonth: true, count: 1, future: false});
    expect(weeks.flat().find(d => d.date === '2026-11-25')?.future).toBe(true);
    expect(weeks.at(-1)!.map(d => d.date).slice(0, 2)).toEqual(['2026-11-30', '2026-12-01']); // Nov 30 is a Monday: its week ends in December
    expect(shiftMonth('2026-01', -1)).toBe('2025-12'); expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
