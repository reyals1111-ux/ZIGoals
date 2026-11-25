import {describe, expect, test} from 'vitest';
import {EMPTY_SEARCH, MAX_SAVED_SEARCHES, NOTE_SEARCHES, emptyNoteSearches, findNotes, fromSaved, keepSearch, noteSearchesSchema, putBackSearch, removeSearch, renameSearch, searchWords, toSaved, type SearchState} from './saved-searches';
import {FILTER_WORDS} from './props';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import type {Note} from './schema';

/**
 * Session AW (x3; LEDGER #441, Evernote's saved searches): a Notes search kept by name (words, a tag, the kind of note,
 * the table's property filters, everywhere or not), at most 12, renamed or removed with Undo; what it finds is read
 * from the notes as they are now; a locked note is found by its name only. A new loose, versioned device record.
 */
const AT = '2026-11-20T09:00:00.000Z';
const note = (id: string, more: Partial<Note> = {}): Note => ({id, kind: 'topic', title: id, body: '', createdAt: AT, ...more} as Note);
const NOTES = [
  note('Trip ideas', {body: 'A fictional trip to Lisbon #travel', props: [{k: 'Status', t: 'choice', v: 'Planning'}]} as Partial<Note>),
  note('Packing', {body: 'Fictional socks for the trip #travel', props: [{k: 'Status', t: 'choice', v: 'Done'}]} as Partial<Note>),
  note('Daily', {kind: 'daily', day: '2026-11-19', body: 'A fictional trip planned'}),
  note('Secret trip', {body: 'hidden words #travel', locked: true, props: [{k: 'Status', t: 'choice', v: 'Planning'}]} as Partial<Note>),
];
const s = (over: Partial<SearchState>): SearchState => ({...EMPTY_SEARCH, ...over});
const ids = (state: SearchState) => findNotes(NOTES, state).map(h => h.note.id);
const store = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
describe('the stored format (TIER 3: a new device record)', () => {
  test('missing reads as empty; an item that does not read is dropped and the rest kept; a later build’s fields stay', () => {
    const st = store();
    expect(readDeviceRecord(st, NOTE_SEARCHES)).toEqual({data: emptyNoteSearches(), unreadable: false});
    const parsed = noteSearchesSchema.parse({version: 1, searches: [{id: 'ns-abcd1', name: 'Trips', words: 'trip', colour: 'blue'}, {id: 'bad', name: 'x'}, {id: 'ns-abcd2', name: 'Kind', kind: 'diary'}]});
    expect(parsed.searches).toEqual([{id: 'ns-abcd1', name: 'Trips', words: 'trip', colour: 'blue'}, {id: 'ns-abcd2', name: 'Kind'}]);
    st.setItem(NOTE_SEARCHES.key, '{oops');
    expect(readDeviceRecord(st, NOTE_SEARCHES).unreadable).toBe(true);
  });
});
describe('what a search finds', () => {
  test('the words, then the tag, the kind and the property filters', () => {
    expect(ids(s({words: 'trip'}))).toEqual(expect.arrayContaining(['Trip ideas', 'Packing', 'Daily']));
    expect(ids(s({words: 'trip'}))).not.toContain('Secret trip');
    expect(ids(s({words: 'trip', tag: 'travel'}))).toEqual(expect.arrayContaining(['Trip ideas', 'Packing']));
    expect(ids(s({words: 'trip', tag: 'travel'}))).toHaveLength(2);
    expect(ids(s({words: 'trip', kind: 'daily'}))).toEqual(['Daily']);
    expect(ids(s({tag: 'travel', filters: [{name: 'Status', op: 'is', value: 'planning'}]}))).toEqual(['Trip ideas']);
    // A filter that needs a value and has none is not applied (as the table does).
    expect(ids(s({tag: 'travel', filters: [{name: 'Status', op: 'is', value: ' '}]}))).toHaveLength(2);
  });
  test('a locked note is found by its name only: never by its words, tags or properties', () => {
    expect(ids(s({words: 'hidden'}))).toEqual([]);
    expect(ids(s({tag: 'travel'}))).not.toContain('Secret trip');
    expect(ids(s({kind: 'topic'}))).toContain('Secret trip');
    expect(findNotes(NOTES, s({kind: 'topic'})).find(h => h.note.id === 'Secret trip')!.snippet).toBe('Locked note: its words show after your PIN.');
  });
});
describe('kept by name, at most 12', () => {
  test('kept with only what it uses; opened as it was', () => {
    const saved = toSaved('ns-0001a', '  Trip   ideas ', s({words: ' trip ', tag: 'travel', filters: [{name: 'Status', op: 'is', value: 'Planning'}, {name: 'Status', op: 'contains', value: ''}]}));
    expect(saved).toEqual({id: 'ns-0001a', name: 'Trip ideas', words: 'trip', tag: 'travel', filters: [{name: 'Status', op: 'is', value: 'Planning'}]});
    expect(fromSaved(saved)).toEqual(s({words: 'trip', tag: 'travel', filters: [{name: 'Status', op: 'is', value: 'Planning'}]}));
    expect(toSaved('ns-0002a', 'Everywhere', s({words: 'lisbon', wide: true}))).toEqual({id: 'ns-0002a', name: 'Everywhere', words: 'lisbon', wide: true});
    expect(() => toSaved('ns-0003a', ' ', s({words: 'x'}))).toThrow('Give the search a name, for example Trip ideas.');
    expect(() => toSaved('ns-0003a', 'Empty', EMPTY_SEARCH)).toThrow(/Type a few words/);
    expect(searchWords(saved, FILTER_WORDS)).toBe('“trip” · #travel · Status is Planning');
  });
  test('the same name replaces it in place; the 13th is refused; rename refuses a name in use; remove and its Undo', () => {
    let r = emptyNoteSearches();
    for (let i = 0; i < MAX_SAVED_SEARCHES; i++) r = keepSearch(r, toSaved(`ns-000${i}x`, `Search ${i}`, s({words: `w${i}`})));
    expect(r.searches).toHaveLength(12);
    expect(() => keepSearch(r, toSaved('ns-0099x', 'One more', s({words: 'x'})))).toThrow('Up to 12 saved searches. Remove one to keep this one.');
    const replaced = keepSearch(r, toSaved('ns-0099x', 'search 3', s({words: 'new'})));
    expect(replaced.searches[3]).toEqual({id: 'ns-0003x', name: 'search 3', words: 'new'});
    expect(() => renameSearch(r, 'ns-0001x', 'Search 2')).toThrow('Another saved search is called “Search 2”.');
    expect(renameSearch(r, 'ns-0001x', ' Trips ').searches[1]!.name).toBe('Trips');
    const out = removeSearch(r, 'ns-0002x');
    expect(out.record.searches).toHaveLength(11); expect(out.at).toBe(2);
    expect(putBackSearch(out.record, out.removed!, out.at).searches).toEqual(r.searches);
    expect(putBackSearch(r, out.removed!, out.at)).toBe(r);
  });
  test('written through the device record (validated, or nothing written)', () => {
    const st = store();
    updateDeviceRecord(st, NOTE_SEARCHES, c => keepSearch(c, toSaved('ns-0001a', 'Trips', s({words: 'trip'}))));
    expect(readDeviceRecord(st, NOTE_SEARCHES).data.searches.map(x => x.name)).toEqual(['Trips']);
  });
});
