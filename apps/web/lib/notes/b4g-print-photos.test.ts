import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {unplacedPhotoIds} from './note-photos';
import {notesSchema} from './schema';

/**
 * Session AV lane 2 (review b4g B4G-14; LEDGER #307, #271): Print this note draws every photo the screen draws under the
 * words (the first, and any further one whose line was removed), and opens the print window only after every photo has
 * loaded or is known to be missing.
 */
describe('printing a note with several photos', () => {
  test('under the words: the first photo and any photo without its line', () => {
    const note = notesSchema.parse({version: 1, notes: [{id: 'n', kind: 'topic', title: 'Fictional', body: 'A.\n\n![photo](p-2)', photoId: 'p-1', photos: ['p-2', 'p-3'], createdAt: '2026-11-20T09:00:00.000Z'}]}).notes[0]!;
    expect(unplacedPhotoIds(note)).toEqual(['p-1', 'p-3']);
  });
  test('the sheet waits for every photo and draws the unplaced ones', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'components', 'notes', 'note-print.tsx'), 'utf8');
    expect(source).toContain('Promise.all(list.map(id => getNotePhoto(');
    expect(source).toContain('unplacedPhotoIds(note).map(');
    expect(source).toContain('photoUrls={urls}');
  });
});
