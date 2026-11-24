import {describe, expect, test} from 'vitest';
import {MAX_TRASH, notesSchema, type Notes} from './schema';
import {applyUndo, removeNote} from './store';
import {bulkChange} from './bulk';

/**
 * Review b5i B5I-1, B5I-2 (Blockers): a delete never drops a note to make room in Recently deleted — when the notes would
 * not fit, it is refused in words and nothing changes; and an Undo gives back the trash exactly as it was.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z';
const note = (i: number, body = 'x') => ({id: `n${i}`, kind: 'topic' as const, title: `Fictional ${i}`, body, createdAt: AT});
const rec = (n: number, trash: number, body = 'x'): Notes => notesSchema.parse({version: 1, voice: false, notes: Array.from({length: n}, (_, i) => note(i, body)),
  ...(trash ? {trash: Array.from({length: trash}, (_, i) => ({...note(1000 + i), deletedAt: AT}))} : {})});

describe('Recently deleted never drops a note silently', () => {
  test('choosing more notes than it holds is refused, and nothing is deleted', () => {
    const r = rec(250, 0);
    expect(() => bulkChange(r, r.notes.map(n => n.id), {kind: 'delete'}, NOW)).toThrow(`Recently deleted keeps at most ${MAX_TRASH} notes, so 250 cannot be deleted at once. Choose ${MAX_TRASH} or fewer; nothing was deleted.`);
  });
  test('a full trash refuses a delete, by count and by characters, and says how to make room', () => {
    const full = rec(5, MAX_TRASH);
    expect(() => removeNote(full, 'n1', NOW)).toThrow(/Recently deleted is full .*nothing was deleted\. Open Notes → Notes → Recently deleted/);
    const big = rec(30, 0, 'y'.repeat(15_000));
    expect(() => bulkChange(big, big.notes.map(n => n.id), {kind: 'delete'}, NOW)).toThrow(/Recently deleted is full/);
    const fits = bulkChange(big, big.notes.slice(0, 20).map(n => n.id), {kind: 'delete'}, NOW);
    expect(fits.record.trash).toHaveLength(20);
  });
  test('Undo gives back the trash exactly as it was, older entries included', () => {
    const r = rec(100, 150), out = bulkChange(r, r.notes.slice(0, 50).map(n => n.id), {kind: 'delete'}, NOW);
    expect(out.record.trash).toHaveLength(200);
    const back = applyUndo(out.record, out.undo);
    expect(back.trash).toEqual(r.trash);
    expect(back.notes.map(n => n.id).sort()).toEqual(r.notes.map(n => n.id).sort());
  });
});
