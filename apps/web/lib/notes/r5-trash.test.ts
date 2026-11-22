import {describe, expect, test} from 'vitest';
import {MAX_TRASH, notesSchema, type Notes} from './schema';
import {applyUndo, removeNote} from './store';
import {updateNoteKeepingVersion} from './versions';
import {capTrash, daysLeft, purgeTrash, restoreFromTrash, trashCutoff, trashOf} from './trash';
import {linkIndex, backlinks} from './links';
import {notesPackLines} from './pack';

/**
 * Session AV lane 2 (r5-notes; LEDGER #360, Logseq's recycled pages): a deleted note waits 30 days in Recently deleted,
 * with its photos and earlier versions, out of every reader of the notes; Restore puts it back, Empty now and the 30 days
 * remove it for good.
 */
const AT = '2026-11-20T09:00:00.000Z', DEL = '2026-11-21T10:00:00.000Z';
const base = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [
  {id: 'a', kind: 'topic', title: 'Fictional trip', body: 'Pack the [[Fictional list]].', photoId: 'p-1', createdAt: AT},
  {id: 'b', kind: 'topic', title: 'Fictional list', body: 'Socks.', createdAt: AT},
  {id: 'd', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'A walk.', createdAt: AT}]});

describe('delete moves a note to Recently deleted', () => {
  test('out of the notes, kept whole with the moment; Undo takes it out of the trash again', () => {
    const v = updateNoteKeepingVersion(base(), 'a', {body: 'New words [[Fictional list]].'}, AT, 'v-aaaaaaaa');
    const out = removeNote(v, 'a', DEL);
    expect(out.record.notes.map(n => n.id)).toEqual(['b', 'd']);
    expect(out.record.trash).toMatchObject([{id: 'a', title: 'Fictional trip', photoId: 'p-1', deletedAt: DEL}]);
    expect(out.record.versions?.map(x => x.noteId)).toEqual(['a']); // its earlier versions wait with it
    const back = applyUndo(out.record, out.undo);
    expect(back.notes.map(n => n.id).sort()).toEqual(['a', 'b', 'd']);
    expect(back.trash).toBeUndefined();
  });
  test('a deleted note is in no reader of the notes: backlinks, NOVA’s pack, the link index', () => {
    const r = removeNote(base(), 'a', DEL).record, idx = linkIndex({notes: r.notes});
    expect(backlinks(r.notes, {kind: 'note', id: 'b'}, idx)).toEqual([]);
    expect(idx.all.some(t => t.id === 'a')).toBe(false);
    expect(notesPackLines(r.notes).lines.join('\n')).not.toContain('Fictional trip');
  });
  test('the trash keeps its caps, the oldest leaving first', () => {
    const many = Array.from({length: MAX_TRASH + 3}, (_, i) => ({id: `t${i}`, kind: 'topic' as const, title: `T${i}`, body: '', createdAt: AT, deletedAt: new Date(Date.parse(DEL) + i * 1000).toISOString()}));
    const kept = capTrash(many);
    expect(kept).toHaveLength(MAX_TRASH);
    expect(kept[0]!.id).toBe('t3');
  });
});
describe('restore, days left and leaving for good', () => {
  test('Restore puts it back as it was; a day written again meanwhile keeps its own note', () => {
    const r = removeNote(base(), 'a', DEL).record;
    const back = restoreFromTrash(r, 'a', AT);
    expect(back.record.notes.find(n => n.id === 'a')).toMatchObject({title: 'Fictional trip', photoId: 'p-1'});
    expect('deletedAt' in back.record.notes.find(n => n.id === 'a')!).toBe(false);
    expect(back.record.trash).toBeUndefined();
    const day = removeNote(base(), 'd', DEL).record;
    const again = notesSchema.parse({...day, notes: [...day.notes, {id: 'd2', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'Tea.', createdAt: DEL}]});
    // Session AV lane 2 (review b5i B5I-3, B5I-4, deliberate): no merge any more; the restored day comes back as its own
    // note with its words, and the new day's note is untouched (checked as strictly as the merge was).
    const merged = restoreFromTrash(again, 'd', AT);
    expect(merged.into).toBe('d');
    expect(merged.record.notes.filter(n => n.day === '2026-11-20').map(n => [n.id, n.kind, n.title, n.body])).toEqual([['d', 'topic', '2026-11-20 · restored', 'A walk.'], ['d2', 'daily', '2026-11-20', 'Tea.']]);
    expect(() => restoreFromTrash(base(), 'zz', AT)).toThrow(/no longer/);
  });
  test('days left, the 30 days and Empty now (with the photos no other note names)', () => {
    const r = removeNote(base(), 'a', DEL).record, del = Date.parse(DEL);
    expect(daysLeft(r.trash![0]!, del)).toBe(29);
    expect(daysLeft(r.trash![0]!, del + 29.5 * 86_400_000)).toBe(0);
    expect(purgeTrash(r, {before: trashCutoff(del + 10 * 86_400_000)}).gone).toEqual([]);
    const late = purgeTrash(r, {before: trashCutoff(del + 31 * 86_400_000)});
    expect(late.gone.map(n => n.id)).toEqual(['a']); expect(late.record.trash).toBeUndefined(); expect(late.photos).toEqual(['p-1']);
    const shared = notesSchema.parse({...r, notes: [...r.notes, {id: 'c', kind: 'topic', title: 'Shares', body: '', photoId: 'p-1', createdAt: AT}]});
    expect(purgeTrash(shared, {}).photos).toEqual([]);
    const v = removeNote(updateNoteKeepingVersion(base(), 'a', {body: 'Changed.'}, AT, 'v-bbbbbbbb'), 'a', DEL).record;
    expect(purgeTrash(v, {ids: ['a']}).record.versions).toBeUndefined();
    expect(trashOf(removeNote(r, 'b', AT.replace('20T', '22T')).record).map(n => n.id)).toEqual(['b', 'a']);
  });
});
