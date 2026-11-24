import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {restoreNoteVersion, updateNoteKeepingVersion, noteVersionsOf} from './versions';
import {tagsForSave} from './tags';

/**
 * Session AV lane 2 (review b4g B4G-15; LEDGER #306): restoring an earlier version recomputes the kept tags from its
 * words — a #tag gone from the words goes; a tag of the note's own Tags field stays.
 */
const AT = '2026-11-20T09:00:00.000Z';
describe('restoring a version and the tags', () => {
  test('#trip leaves with the words that held it; the field tag stays', () => {
    let r = notesSchema.parse({version: 1, notes: [{id: 'n', kind: 'topic', title: 'Fictional', body: 'Plain words.', tags: ['home'], createdAt: AT}]});
    r = updateNoteKeepingVersion(r, 'n', {body: 'Now a #trip.', tags: tagsForSave(['home'], 'Now a #trip.')}, '2026-11-21T09:00:00.000Z');
    expect(r.notes[0]!.tags).toEqual(['trip', 'home']);
    const v = noteVersionsOf(r, 'n')[0]!;
    const back = restoreNoteVersion(r, 'n', v.id, '2026-11-22T09:00:00.000Z').record.notes[0]!;
    expect(back.body).toBe('Plain words.');
    expect(back.tags).toEqual(['home']);
  });
});
