import {describe, expect, test} from 'vitest';
import {isLockedHidden, notesSchema} from './schema';
import {focused, hasTag, tagTree, visibleTagsOf} from './tags';
import {noteRows, notesPerTag} from './table';
import {shownOf} from './lock';

/**
 * Session AV lane 2 (review b4g B4G-1, B4G-2; LEDGER #318): a locked note shows nothing of itself without the PIN — no
 * #tags (written or kept) in the Tags fold, the focus, the table, the gallery or the chart, and no photo, words,
 * properties or counts in the views. One shared test (`isLockedHidden`) and one tag reader (`visibleTagsOf`).
 */
const AT = '2026-11-20T09:00:00.000Z';
const notes = notesSchema.parse({version: 1, notes: [
  {id: 'l', kind: 'topic', title: 'Fictional private', body: 'My #diagnosis/fictional note about [[Fictional plan]].', tags: ['diagnosis/fictional', 'kept'], photoId: 'p-1', photos: ['p-2'], props: [{k: 'Status', t: 'choice', v: 'Secret'}], locked: true, createdAt: AT},
  {id: 'o', kind: 'topic', title: 'Fictional plan', body: 'Open #work words.', createdAt: AT}]}).notes;

describe('a locked note in the views', () => {
  test('the one test, and no tags at all', () => {
    expect(notes.map(isLockedHidden)).toEqual([true, false]);
    expect(visibleTagsOf(notes[0]!)).toEqual([]);
    expect(visibleTagsOf(notes[1]!)).toEqual(['work']);
  });
  test('the Tags fold and the focus never list it', () => {
    expect(tagTree(notes).map(t => t.tag)).toEqual(['work']);
    expect(hasTag(notes[0]!, 'diagnosis')).toBe(false); expect(hasTag(notes[0]!, 'kept')).toBe(false);
    expect(focused(notes, 'diagnosis')).toEqual([]);
  });
  test('the table, the gallery and the chart: its name only', () => {
    expect(noteRows(notes)[0]).toMatchObject({name: 'Fictional private', tags: [], words: 0, links: 0, photo: false, locked: true});
    expect(noteRows(notes)[1]!.locked).toBeUndefined();
    expect(notesPerTag(notes)).toEqual({tags: [{tag: 'work', count: 1}], untagged: 1});
  });
  test('what the views draw of it carries no words, tags, photos or properties', () => {
    const shell = shownOf(notes[0]!);
    expect(shell).toMatchObject({id: 'l', title: 'Fictional private', body: '', locked: true});
    for (const k of ['photoId', 'photos', 'props', 'tags'] as const) expect(k in shell).toBe(false);
    expect(JSON.stringify(shell)).not.toMatch(/diagnosis|Secret|p-1|p-2/);
    expect(shownOf(notes[1]!)).toBe(notes[1]);
  });
});
