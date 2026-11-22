import {describe, expect, test} from 'vitest';
import {foreignFiles, foreignTag} from './import-enex';
import {planImport} from './markdown';
import {emptyNotes} from './schema';

/**
 * Session AV lane 2 (review b4g B4G-13; LEDGER #321): an Evernote tag with a comma or quotes comes in whole, as a #tag
 * can hold it, never split into broken pieces by the front matter's list.
 */
describe('Evernote tags', () => {
  test('cleaned to what a #tag holds', () => {
    expect(['a,b', 'trip "x"', 'work/meetings', 'Café time', '#x', ', ,'].map(foreignTag)).toEqual(['a-b', 'trip-x', 'work/meetings', 'Café-time', 'x', '']);
  });
  test('read back whole by the import', () => {
    const {files} = foreignFiles([{name: 'Evernote/Fictional.md', title: 'Fictional', tags: ['a,b', 'trip "x"', ', ,'], body: 'Words.', images: []}]);
    expect(planImport(emptyNotes(), files, '2026-11-22T09:00:00.000Z', '2026-11-22').add[0]!.tags).toEqual(['a-b', 'trip-x']);
  });
});
