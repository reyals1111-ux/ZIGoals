import {describe, expect, test} from 'vitest';
import {addNotePhoto, insertPhotoLine, placedPhotoIds, removeNotePhoto, unplacedPhotoIds, PHOTOS_FULL} from './note-photos';
import {notePhotoIdsOf, notesSchema} from './schema';
import {noteToMarkdown, notesExportEntries} from './markdown';
import {parseBlocks} from '../ai/safe-render';

/** Session AV lane 2 (r4-notes; LEDGER #307, Bear): up to eight photos in a note, each placed in the words. */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-21T09:00:00.000Z';
const record = (extra: Record<string, unknown> = {}) => notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Day one.', createdAt: AT, ...extra}]});

describe('adding and deleting photos', () => {
  test('the first is the note’s photo (no line); later ones are placed in the words', () => {
    let r = addNotePhoto(record(), 'n1', 'p-1', NOW);
    expect(r.notes[0]).toMatchObject({photoId: 'p-1', body: 'Day one.'}); expect(r.notes[0]!.photos).toBeUndefined();
    r = addNotePhoto(r, 'n1', 'p-2', NOW);
    expect(r.notes[0]).toMatchObject({photos: ['p-2'], body: 'Day one.\n\n![photo](p-2)'});
    expect(notePhotoIdsOf(r.notes[0]!)).toEqual(['p-1', 'p-2']);
    expect(unplacedPhotoIds(r.notes[0]!)).toEqual(['p-1']);
    expect(addNotePhoto(r, 'n1', 'p-3', NOW, {place: false}).notes[0]!.body).toBe('Day one.\n\n![photo](p-2)');
  });
  test('at most eight', () => {
    const full = record({photoId: 'p-0', photos: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7']});
    expect(() => addNotePhoto(full, 'n1', 'p-8', NOW)).toThrow(PHOTOS_FULL);
  });
  test('deleting a photo takes its line out; the next becomes the first', () => {
    const r = record({photoId: 'p-1', photos: ['p-2', 'p-3'], body: 'A.\n\n![photo](p-2)\n\nB.\n\n![photo](p-3)'});
    // Session AV lane 2 (review b4g B4G-5, deliberate): removeNotePhoto now returns {record, undo}; the same notes are checked.
    const a = removeNotePhoto(r, 'n1', 'p-2', NOW).record.notes[0]!;
    expect(a).toMatchObject({photoId: 'p-1', photos: ['p-3'], body: 'A.\n\nB.\n\n![photo](p-3)'});
    const b = removeNotePhoto(r, 'n1', 'p-1', NOW).record.notes[0]!;
    expect(b).toMatchObject({photoId: 'p-2', photos: ['p-3']});
    const c = removeNotePhoto(record({photoId: 'p-1'}), 'n1', 'p-1', NOW).record.notes[0]!;
    expect('photoId' in c || 'photos' in c).toBe(false);
  });
  test('a photo line goes on its own line at the caret', () => {
    expect(insertPhotoLine('One two', 3, 'p-9')).toBe('One\n\n![photo](p-9)\n\ntwo');
    expect(insertPhotoLine('', 0, 'p-9')).toBe('![photo](p-9)');
    expect(insertPhotoLine('Line\n', 5, 'p-9')).toBe('Line\n\n![photo](p-9)');
    expect(placedPhotoIds('![photo](p-9)\ntext ![photo](p-8)\n  ![A beach](p-7)  ')).toEqual(['p-9', 'p-7']);
  });
});
describe('the reading view and the Markdown export', () => {
  test('notes draw a photo line as a photo; ZIGi’s replies never do, and an address is never a photo', () => {
    expect(parseBlocks('![photo](p-2)', {notes: true})).toEqual([{type: 'photo', id: 'p-2', alt: 'photo'}]);
    const zigi = parseBlocks('![photo](p-2)');
    expect(zigi.map(b => b.type)).toEqual(['paragraph']);
    expect(zigi[0]!.type === 'paragraph' && zigi[0]!.children.map(c => c.type === 'text' ? c.text : '?').join('')).toBe('![photo](p-2)');
    expect(parseBlocks('![x](https://example.com/a.png)', {notes: true})[0]!.type).toBe('paragraph');
  });
  test('each photo is written beside the note and embedded where it was placed', () => {
    const r = record({photoId: 'p-1', photos: ['p-2'], body: 'A.\n\n![photo](p-2)\n\nB.'});
    const photos = new Map([['p-1', {data: new Uint8Array([1]), type: 'image/webp'}], ['p-2', {data: new Uint8Array([2]), type: 'image/jpeg'}]]);
    const entries = notesExportEntries(r, {goals: [], habits: []}, {now: new Date(NOW), photos});
    expect(entries.map(e => e.name)).toEqual(['attachments/p-1.webp', 'attachments/p-2.jpg', 'Notes/Fictional trip.md']);
    const md = String(entries[2]!.data);
    expect(md).toContain('photo: "p-1.webp"\nphotos: ["p-2.jpg"]');
    expect(md).toContain('A.\n\n![[p-2.jpg]]\n\nB.\n\n![[p-1.webp]]');
    expect(noteToMarkdown(r.notes[0]!)).toContain('![photo](p-2)');
  });
});
