import {describe, expect, test} from 'vitest';
import {findMatches, replaceAll, replaceOne} from './find';
import {notesSchema} from './schema';
import {updateNoteKeepingVersion, noteVersionsOf} from './versions';

/** Session AV lane 2 (r4-notes; LEDGER #312, Bear's find and replace). */
describe('find and replace in a note', () => {
  test('every match, left to right, not overlapping; with or without case', () => {
    expect(findMatches('Tea, tea and TEA. teatea', 'tea')).toEqual([0, 5, 13, 18, 21]);
    expect(findMatches('Tea, tea and TEA.', 'tea', true)).toEqual([5]);
    expect(findMatches('aaaa', 'aa')).toEqual([0, 2]);
    expect(findMatches('words', '')).toEqual([]);
    expect(findMatches('İstanbul and istanbul', 'istanbul').length).toBeGreaterThanOrEqual(1);
  });
  test('replace one at its place, or all', () => {
    expect(replaceOne('one two one', 8, 3, '1')).toBe('one two 1');
    expect(replaceAll('Tea, tea and TEA.', 'tea', 'coffee')).toBe('coffee, coffee and coffee.');
    expect(replaceAll('Tea, tea', 'tea', 'x', true)).toBe('Tea, x');
    expect(replaceAll('a.b.c', '.', '')).toBe('abc');
  });
  test('saving the replaced words keeps the earlier ones as a version', () => {
    const r = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Fictional', body: 'Buy tea.', createdAt: '2026-11-20T09:00:00.000Z'}]});
    const next = updateNoteKeepingVersion(r, 'n1', {body: replaceAll('Buy tea.', 'tea', 'coffee')}, '2026-11-21T09:00:00.000Z');
    expect(next.notes[0]!.body).toBe('Buy coffee.');
    expect(noteVersionsOf(next, 'n1').map(v => v.body)).toEqual(['Buy tea.']);
  });
});
