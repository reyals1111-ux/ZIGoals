import {describe, expect, test} from 'vitest';
import {MAX_NOTE_VERSIONS, notesSchema, type Notes} from './schema';
import {applyUndo} from './store';
import {noteTags} from './tags';
import {renameTag, tooLongTag} from './tag-rename';

/**
 * Review b6n B6N-3 (Major) and B6N-6 (Minor), LEDGER #399: a tag rename never pushes out another note's earlier versions
 * (with Earlier versions full, the changed notes' earlier words are not kept as versions, and that is counted), its
 * Undo puts the versions back exactly; and a rename never cuts a tag — one that would pass 32 characters is refused in
 * words.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z';
const v = (note: string, i: number) => ({id: `v-${note}x${String(i).padStart(3, '0')}`, noteId: note, title: note, body: `Old words ${i}.`, savedAt: `2026-10-${String(1 + (i % 28)).padStart(2, '0')}T09:00:00.000Z`});
const others = Array.from({length: 30}, (_, k) => ({id: `o${k}`, kind: 'topic', title: `Other ${k}`, body: 'Plain.', createdAt: AT}));
const work = Array.from({length: 3}, (_, k) => ({id: `w${k}`, kind: 'topic', title: `Work ${k}`, body: `About #work ${k}.`, createdAt: AT}));
const full = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [...others, ...work], versions: others.flatMap(o => Array.from({length: 10}, (_, i) => v(o.id, i)))});

describe('B6N-3 a rename never pushes out other notes’ versions; Undo restores them exactly', () => {
  test('Earlier versions full: nothing pushed out, the three not kept are counted, Undo gives back the exact list', () => {
    const before = full();
    expect(before.versions).toHaveLength(MAX_NOTE_VERSIONS);
    const out = renameTag(before, 'work', 'job', NOW, 'UTC');
    expect(out.changed).toBe(3); expect(out.unversioned).toBe(3);
    expect(out.record.versions).toEqual(before.versions);
    expect(out.record.notes.filter(n => n.id.startsWith('w')).map(n => n.body)).toEqual(['About #job 0.', 'About #job 1.', 'About #job 2.']);
    const back = applyUndo(out.record, out.undo);
    expect(back.versions).toEqual(before.versions); expect(back.notes).toEqual(before.notes);
  });
  test('with room: each changed note keeps its earlier words; its own tenth version may give way; Undo puts it back', () => {
    const r = notesSchema.parse({version: 1, voice: false, notes: [...others.slice(0, 2), ...work], versions: [...Array.from({length: 10}, (_, i) => v('w0', i)), ...Array.from({length: 4}, (_, i) => v('o0', i))]});
    const out = renameTag(r, 'work', 'job', NOW, 'UTC');
    expect(out.unversioned).toBe(0);
    expect(out.record.versions!.filter(x => x.noteId === 'o0')).toEqual(r.versions!.filter(x => x.noteId === 'o0'));
    expect(out.record.versions!.filter(x => x.noteId === 'w0').map(x => x.body).at(-1)).toBe('About #work 0.');
    expect(out.record.versions!.filter(x => x.noteId === 'w1')).toHaveLength(1);
    expect(applyUndo(out.record, out.undo).versions).toEqual(r.versions);
  });
});
describe('B6N-6 a rename never cuts a tag', () => {
  const r = notesSchema.parse({version: 1, voice: false, notes: [{id: 'a', kind: 'topic', title: 'A', body: 'See #ab/x-yz and #ab/x-yq.', createdAt: AT}]});
  test('a nested tag that would pass 32 characters: refused in words, nothing changed', () => {
    const name = 'abcdefghijklmnopqrstuvwxyz12';
    expect(tooLongTag(r, 'ab', name)).toBe(`${name}/x-yz`);
    expect(() => renameTag(r, 'ab', name, NOW, 'UTC')).toThrow(`#${name}/x-yz would be 33 characters, and a tag holds at most 32. Choose a shorter name; nothing was renamed.`);
  });
  test('a typed name past 32 characters: refused, never cut', () => {
    expect(() => renameTag(r, 'ab', 'x'.repeat(33), NOW, 'UTC')).toThrow(/would be 33 characters/);
  });
  test('a name that fits keeps every nested tag apart', () => {
    expect(noteTags(renameTag(r, 'ab', 'cd', NOW, 'UTC').record.notes[0]!)).toEqual(['cd/x-yz', 'cd/x-yq']);
  });
});
