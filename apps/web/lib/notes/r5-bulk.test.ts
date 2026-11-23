import {describe, expect, test} from 'vitest';
import {notesSchema, type Notes} from './schema';
import {applyUndo} from './store';
import {bulkChange, cleanTag} from './bulk';

/** Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): one change to several notes, one Undo. */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z';
const base = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [
  {id: 'a', kind: 'topic', title: 'Fictional A', body: 'About #work here.', tags: ['work'], createdAt: AT},
  {id: 'b', kind: 'topic', title: 'Fictional B', body: 'Plain.', tags: ['work', 'home'], createdAt: AT},
  {id: 'c', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'A day.', createdAt: AT},
  {id: 'd', kind: 'topic', title: 'Fictional D', body: 'Not chosen.', createdAt: AT}]});

describe('bulk changes', () => {
  test('a tag added to every chosen note, once; one Undo puts them all back', () => {
    const out = bulkChange(base(), ['a', 'b', 'c'], {kind: 'tag-add', tag: 'trip'}, NOW);
    expect(out.changed).toBe(3);
    expect(out.record.notes.map(n => n.tags)).toEqual([['work', 'trip'], ['work', 'home', 'trip'], ['trip'], undefined]);
    expect(out.record.notes[3]!.updatedAt).toBeUndefined();
    expect(applyUndo(out.record, out.undo).notes).toEqual(base().notes);
    expect(() => bulkChange(out.record, ['a', 'b'], {kind: 'tag-add', tag: 'TRIP'}, NOW)).toThrow(/have that tag already/);
  });
  test('a tag taken off; one written in the words stays and is counted', () => {
    const out = bulkChange(base(), ['a', 'b'], {kind: 'tag-remove', tag: 'work'}, NOW);
    expect(out.changed).toBe(1); expect(out.skipped).toBe(1);
    expect(out.record.notes[0]!.tags).toEqual(['work']); expect(out.record.notes[1]!.tags).toEqual(['home']);
  });
  test('pin only topic notes; archive; delete moves them all to Recently deleted with one Undo', () => {
    const pin = bulkChange(base(), ['a', 'c'], {kind: 'pin', on: true}, NOW);
    expect(pin.changed).toBe(1); expect(pin.record.notes[0]!.pinned).toBe(true); expect(pin.record.notes[2]!.pinned).toBeUndefined();
    expect('pinned' in bulkChange(pin.record, ['a'], {kind: 'pin', on: false}, NOW).record.notes[0]!).toBe(false);
    expect(bulkChange(base(), ['a', 'c'], {kind: 'archive'}, NOW).record.notes.filter(n => n.archived).map(n => n.id)).toEqual(['a', 'c']);
    const del = bulkChange(base(), ['a', 'b'], {kind: 'delete'}, NOW);
    expect(del.record.notes.map(n => n.id)).toEqual(['c', 'd']);
    expect(del.record.trash?.map(n => [n.id, n.deletedAt])).toEqual([['a', NOW], ['b', NOW]]);
    expect(del.undo.said).toBe('The 2 notes are back.');
    const back = applyUndo(del.record, del.undo);
    expect(back.notes.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'd']); expect(back.trash).toBeUndefined();
    expect(() => bulkChange(base(), [], {kind: 'archive'}, NOW)).toThrow(/Choose one note/);
  });
  test('a typed tag is cleaned to what a #tag holds', () => {
    expect(cleanTag('#Work meetings!')).toBe('Work-meetings');
    expect(cleanTag('  ')).toBeNull();
    expect(cleanTag('/a/b/')).toBe('a/b');
  });
});
