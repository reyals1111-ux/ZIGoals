import {describe, expect, test} from 'vitest';
import {capNoteVersions, noteVersionsOf, restoreNoteVersion, updateNoteKeepingVersion} from './versions';
import {addTopic, applyUndo, ensureDaily} from './store';
import {MAX_NOTE_VERSION_CHARS, emptyNotes} from './schema';
import {showcaseNotes} from './showcase';

/** Session AV lane 2 (notes; LEDGER #33, Notion's version history), pure. */
const AT = '2026-11-20T09:00:00.000Z', LATER = '2026-11-21T09:00:00.000Z';
const base = () => addTopic(emptyNotes(), {title: 'Fictional plans', body: 'First words', now: AT, id: 'n1'}).record;
describe('earlier versions of a note', () => {
  test('a save that changes the words keeps the old ones; the same words, a pin or a first save keep none', () => {
    const r = updateNoteKeepingVersion(base(), 'n1', {title: 'Fictional plans', body: 'Second words'}, LATER, 'v-note0001');
    expect(r.notes[0]).toMatchObject({body: 'Second words', updatedAt: LATER});
    expect(r.versions).toEqual([{id: 'v-note0001', noteId: 'n1', title: 'Fictional plans', body: 'First words', savedAt: AT}]);
    expect(updateNoteKeepingVersion(r, 'n1', {body: 'Second words'}, LATER).versions).toHaveLength(1);
    expect(updateNoteKeepingVersion(r, 'n1', {pinned: true}, LATER).versions).toHaveLength(1);
    const day = ensureDaily(emptyNotes(), '2026-11-21', AT);
    expect(updateNoteKeepingVersion(day.record, day.note.id, {body: 'Today'}, LATER).versions).toBeUndefined();
  });
  test('restore brings the words back and keeps the replaced ones; Undo puts the note back', () => {
    const r = updateNoteKeepingVersion(base(), 'n1', {title: 'Fictional plans', body: 'Second words'}, LATER, 'v-note0001');
    const out = restoreNoteVersion(r, 'n1', 'v-note0001', '2026-11-22T09:00:00.000Z', 'v-note0002');
    expect(out.record.notes[0]!.body).toBe('First words');
    expect(noteVersionsOf(out.record, 'n1').map(v => [v.id, v.body])).toEqual([['v-note0002', 'Second words'], ['v-note0001', 'First words']]);
    expect(applyUndo(out.record, out.undo).notes[0]!.body).toBe('Second words');
    expect(() => restoreNoteVersion(r, 'n1', 'v-gone', LATER)).toThrow('That version is no longer on this device.');
  });
  test('at most ten per note, none for a note that is gone, within the character cap', () => {
    let r = base();
    for (let i = 0; i < 13; i++) r = updateNoteKeepingVersion(r, 'n1', {body: `Words ${i}`}, `2026-11-21T09:${String(i).padStart(2, '0')}:00.000Z`, `v-many${String(i).padStart(4, '0')}`);
    expect(noteVersionsOf(r, 'n1')).toHaveLength(10);
    expect(noteVersionsOf(r, 'n1')[0]!.body).toBe('Words 11');
    expect(capNoteVersions(r.versions!, new Set())).toEqual([]);
    const big = Array.from({length: 40}, (_, i) => ({id: `v-big${String(i).padStart(5, '0')}`, noteId: `n${i % 30}`, title: '', body: 'x'.repeat(20_000), savedAt: AT}));
    expect(capNoteVersions(big, new Set(big.map(v => v.noteId))).reduce((n, v) => n + v.body.length, 0)).toBeLessThanOrEqual(MAX_NOTE_VERSION_CHARS);
  });
  test('the Showcase’s “Books to read” has one earlier version', () => {
    expect(noteVersionsOf(showcaseNotes('2026-11-25'), 'showcase-note-books').map(v => v.body)).toEqual([expect.stringContaining('2. The Psychology of Money')]);
  });
});
