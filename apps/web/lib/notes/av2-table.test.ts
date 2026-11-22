import {describe, expect, test} from 'vitest';
import {firstDirection, noteRows, notesPerTag, notesPerWeek, sortRows} from './table';
import {showcaseNotes} from './showcase';
import type {Note} from './schema';

/** Session AV lane 2 (notes; LEDGER #29 a table and gallery of notes, #30 a chart of notes per tag), pure. */
const n = (id: string, title: string, body: string, extra: Partial<Note> = {}): Note => ({id, kind: 'topic', title, body, createdAt: '2026-11-01T09:00:00.000Z', ...extra});
const notes = [n('a', 'Trips', 'Kyoto and [[Japan adventure]] and [[Walk]]', {tags: ['travel', 'Plans'], updatedAt: '2026-11-20T09:00:00.000Z'}), n('b', 'Books', 'One two three four', {tags: ['reading', 'plans']}), n('c', 'Calm', 'Quiet', {createdAt: '2026-11-10T09:00:00.000Z'})];
describe('the table of notes', () => {
  test('rows with words, links, changed and made', () => {
    expect(noteRows(notes)[0]).toMatchObject({id: 'a', name: 'Trips', tags: ['travel', 'Plans'], words: 6, links: 2, changed: '2026-11-20', made: '2026-11-01'});
  });
  test('sorted by any column, both ways; ties by name', () => {
    const rows = noteRows(notes);
    expect(sortRows(rows, 'name', 'ascending').map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(sortRows(rows, 'words', 'descending').map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(sortRows(rows, 'changed', 'descending').map(r => r.id)).toEqual(['a', 'c', 'b']);
    expect(sortRows(rows, 'tags', 'ascending').map(r => r.id)).toEqual(['b', 'a', 'c']); // no tag last
    expect(firstDirection('name')).toBe('ascending'); expect(firstDirection('words')).toBe('descending');
  });
});
describe('the chart of notes', () => {
  test('notes per tag (without case), the untagged apart; notes per week', () => {
    expect(notesPerTag(notes)).toEqual({tags: [{tag: 'Plans', count: 2}, {tag: 'reading', count: 1}, {tag: 'travel', count: 1}], untagged: 1});
    expect(notesPerWeek(notes, '2026-11-25', 4)).toEqual([{start: '2026-11-02', count: 0}, {start: '2026-11-09', count: 1}, {start: '2026-11-16', count: 1}, {start: '2026-11-23', count: 0}]);
  });
  test('the Showcase’s notes have tags to chart', () => {
    expect(notesPerTag(showcaseNotes('2026-11-25').notes).tags.map(t => t.tag)).toEqual(['reading', 'travel']);
  });
});
