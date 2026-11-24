import {describe, expect, test} from 'vitest';
import {MAX_EXTRA_PHOTOS, NOTES_KEY, emptyNotes, notePhotoIdsOf, notesSchema, type Notes} from './schema';
import {updateNote} from './store';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r4-notes; TIER 3 (stored format), additive and optional): a note's further photos (`photos`, LEDGER
 * #307), an archived note (`archived`, #315), and the notes record's focus tag and typewriter choice (`focusTag`,
 * `typewriter`, #306, #316) and a locked note (`locked`, #318) read on their own (what this build cannot read is dropped, never failing the record), older
 * records read as before, and Export everything → erase → Restore (Replace and Merge) gives them back.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const R4_NOTES: Notes = notesSchema.parse({version: 1, voice: false, focusTag: 'work', typewriter: true,
  notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Plans.\n\n![photo](p-2)', photoId: 'p-1', photos: ['p-2', 'p-3'], createdAt: AT},
    {id: 'n2', kind: 'topic', title: 'Fictional old idea', body: 'Kept.', archived: true, createdAt: AT},
    {id: 'n3', kind: 'topic', title: 'Fictional private', body: 'Hidden words.', locked: true, createdAt: AT}]});

describe('the round-4 notes fields read on their own', () => {
  test('a full record keeps them; the photos are read first to last', () => {
    expect(R4_NOTES).toMatchObject({focusTag: 'work', typewriter: true, notes: [{photos: ['p-2', 'p-3']}, {archived: true}, {locked: true, body: 'Hidden words.'}]});
    expect(notePhotoIdsOf(R4_NOTES.notes[0]!)).toEqual(['p-1', 'p-2', 'p-3']);
  });
  test('what this build cannot read is dropped, never failing the record', () => {
    const odd = notesSchema.parse({...R4_NOTES, focusTag: 'x'.repeat(80), typewriter: 'yes',
      notes: [{...R4_NOTES.notes[0], photos: ['p-2', 'not ok!', 'p-2', 7, ...Array.from({length: 12}, (_, i) => `p-x${i}`)]}, {...R4_NOTES.notes[1], archived: 'soon'}, {...R4_NOTES.notes[2], locked: 'yes'}]});
    expect(odd.focusTag).toBeUndefined(); expect(odd.typewriter).toBeUndefined();
    expect(odd.notes[0]!.photos).toHaveLength(MAX_EXTRA_PHOTOS);
    expect(odd.notes[0]!.photos!.slice(0, 2)).toEqual(['p-2', 'p-x0']);
    expect(odd.notes[1]!.archived).toBeUndefined(); expect(odd.notes[2]!.locked).toBeUndefined();
    expect(notesSchema.parse({...R4_NOTES, notes: [{...R4_NOTES.notes[0], photos: 'p-2'}]}).notes[0]!.photos).toBeUndefined();
  });
  test('an older record reads as before; clearing a field takes it off the note', () => {
    const old = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Old', body: '', createdAt: AT, photoId: 'p-1'}]});
    expect(old.focusTag).toBeUndefined(); expect(old.notes[0]!.photos).toBeUndefined(); expect(notePhotoIdsOf(old.notes[0]!)).toEqual(['p-1']);
    expect(notesSchema.parse(emptyNotes())).toEqual(emptyNotes());
    const cleared = updateNote(updateNote(R4_NOTES, 'n1', {photos: []}, AT, 'UTC'), 'n2', {archived: false}, AT, 'UTC');
    expect('photos' in cleared.notes[0]!).toBe(false); expect('archived' in cleared.notes[1]!).toBe(false);
    expect('locked' in updateNote(R4_NOTES, 'n3', {locked: false}, AT, 'UTC').notes[2]!).toBe(false);
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into empty notes', async () => {
    const zip = buildEverythingZip(collectEverything({[NOTES_KEY]: JSON.stringify(R4_NOTES)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json), part = parts.find(p => p.id === 'device:notes')!;
    expect(notesSchema.parse(value(part, 'replace'))).toEqual(R4_NOTES);
    const merged = notesSchema.parse(value(part, 'merge', emptyNotes()));
    expect(merged.notes).toEqual(R4_NOTES.notes);
  });
});
