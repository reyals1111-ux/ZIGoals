// @vitest-environment jsdom
import {afterEach, describe, expect, test, vi} from 'vitest';
import {filterEntries} from './search';
import {JOURNAL_KEY, journalSchema} from './schema';
import {searchEverything} from '../search/notes-everything';

/** Session AV lane 2 (review B3C-14): a letter still folded away is not found by its words until its day. Fictional. */
const TODAY = '2026-11-22', SECRET = 'fictionalsecretword';
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: false, entries: [
  {id: 'sealed', date: '2026-11-01', text: `Dear future me, ${SECRET} inside.`, createdAt: '2026-11-01T20:00:00.000Z', tags: ['letters'], opensOn: '2027-11-01'},
  {id: 'opened', date: '2025-11-01', text: `Dear future me, ${SECRET} opened.`, createdAt: '2025-11-01T20:00:00.000Z', opensOn: '2026-11-01'},
  {id: 'plain', date: '2026-11-20', text: 'A fictional plain entry.', createdAt: '2026-11-20T20:00:00.000Z'},
]});
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

describe('the Journal’s search', () => {
  test('a sealed letter’s words find nothing; an opened letter is found', () => {
    expect(filterEntries(journal, {query: SECRET}, TODAY).map(e => e.id)).toEqual(['opened']);
  });
  test('its tags, which show on its folded row, still find it; so do its day and the calendar', () => {
    expect(filterEntries(journal, {query: '#letters'}, TODAY).map(e => e.id)).toEqual(['sealed']);
    expect(filterEntries(journal, {query: '2026-11-01'}, TODAY).map(e => e.id)).toEqual(['sealed']);
    expect(filterEntries(journal, {}, TODAY).map(e => e.id)).toEqual(['plain', 'opened', 'sealed']);
  });
  test('after Read it now on this visit, and on its day, its words find it', () => {
    expect(filterEntries(journal, {query: SECRET}, TODAY, new Set(['sealed'])).map(e => e.id)).toEqual(['opened', 'sealed']);
    expect(filterEntries(journal, {query: SECRET}, '2027-11-01').map(e => e.id)).toEqual(['opened', 'sealed']);
  });
});
describe('Search everything (and NOVA’s search) over this device', () => {
  test('a sealed letter is not among the journal hits', async () => {
    vi.useFakeTimers({toFake: ['Date']}); vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
    const {hits} = await searchEverything(SECRET, {pillars: ['notes']});
    expect(hits.filter(h => h.kind === 'journal').map(h => h.id)).toEqual(['opened']);
    expect(JSON.stringify(hits)).not.toContain(`${SECRET} inside`);
  });
});
