import {describe, expect, test} from 'vitest';
import {placedPhotoIds, removeNotePhoto, withoutPhotoLines} from './note-photos';
import {notesSchema} from './schema';
import {applyUndo} from './store';
import {noteVersionsOf} from './versions';

/**
 * Session AV lane 2 (review b4g B4G-5; LEDGER #307): deleting a photo takes out only its own line (and one blank line
 * beside it); every other character stays — code with blank lines, a first line's indentation. The words it changes are
 * kept as an earlier version, and Undo puts the note back.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-21T09:00:00.000Z';
const body = '  indented first line\n\n```\na\n\n\n\nb\n![photo](p-2)\n```\n\n![photo](p-2)\n\nend   ';
const record = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Fictional', body, photoId: 'p-1', photos: ['p-2'], createdAt: AT}]});
describe('deleting one photo', () => {
  test('only its own line goes; a line inside code is not a photo', () => {
    expect(placedPhotoIds(body)).toEqual(['p-2']);
    expect(withoutPhotoLines(body, 'p-2')).toBe('  indented first line\n\n```\na\n\n\n\nb\n![photo](p-2)\n```\n\nend   ');
    expect(withoutPhotoLines(body, 'p-9')).toBe(body);
  });
  test('the earlier words are kept as a version, and Undo puts the note back', () => {
    const out = removeNotePhoto(record, 'n1', 'p-2', NOW);
    expect(out.record.notes[0]).toMatchObject({photoId: 'p-1', body: withoutPhotoLines(body, 'p-2')});
    expect('photos' in out.record.notes[0]!).toBe(false);
    expect(noteVersionsOf(out.record, 'n1').map(v => v.body)).toEqual([body]);
    expect(applyUndo(out.record, out.undo).notes[0]).toEqual(record.notes[0]);
  });
});
