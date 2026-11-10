import {describe, expect, it} from 'vitest';
import {noteName, shortNoteName} from './schema';
import {applyUndo, removeNote} from './store';

/** Session AL second pass (DV-192, A7): a toast echoes at most 40 characters of a note; Delete's Undo restores the record. */
const note = (body: string, title = '') => ({title, body, kind: 'inbox' as const, day: '2026-11-04'});
describe('Notes (Session AL)', () => {
  it('DV-192: the echoed name is cut to 40 characters with an ellipsis', () => {
    const long = 'T9 note about the long walk to the harbour and back again before dinner';
    expect(noteName(note(long)).length).toBeGreaterThan(40);
    expect(shortNoteName(note(long))).toBe(`${long.slice(0, 39).trimEnd()}…`);
    expect(shortNoteName(note('Short one'))).toBe('Short one');
  });
  it('A7: Delete’s Undo puts the note back in the latest record', () => {
    const at = '2026-11-04T08:00:00.000Z';
    const a = {id: 'note_aaaaaaaa', kind: 'inbox', title: '', body: 'Remember the seeds', createdAt: at, updatedAt: at, day: '2026-11-04'};
    const record = {version: 1, notes: [a]} as never;
    const out = removeNote(record, 'note_aaaaaaaa');
    expect((out.record as {notes: unknown[]}).notes).toHaveLength(0);
    expect(out.undo.said).toBe('“Remember the seeds” is back.');
    expect((applyUndo(out.record, out.undo) as {notes: {id: string}[]}).notes.map(n => n.id)).toEqual(['note_aaaaaaaa']);
  });
});
