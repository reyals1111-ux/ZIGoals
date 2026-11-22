import {describe, expect, test} from 'vitest';
import {MAX_TAG_TEMPLATES, MAX_TRASH, NOTES_KEY, emptyNotes, notesSchema, type Notes} from './schema';
import {updateNote} from './store';
import {shownOf} from './lock';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r5-notes; TIER 3 (stored format), additive and optional): Recently deleted (`trash`, LEDGER #360),
 * the templates for a tag (`tagTemplates`, #362) and a note's look (`look`, #367) read on their own (what this build
 * cannot read is dropped, never failing the record), older records read as before, and Export everything → erase →
 * Restore gives them back.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const R5_NOTES: Notes = notesSchema.parse({version: 1, voice: false,
  tagTemplates: [{tag: 'meeting', body: '## Who\n\n## Decided\n'}],
  trash: [{id: 'n9', kind: 'topic', title: 'Fictional old list', body: 'Gone words.', createdAt: AT, deletedAt: '2026-11-21T10:00:00.000Z', photoId: 'p-9'}],
  notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Plans.', photoId: 'p-1', look: {cover: 'p-1', colour: 'sage'}, createdAt: AT}]});

describe('the round-5 notes fields read on their own', () => {
  test('a full record keeps them', () => {
    expect(R5_NOTES).toMatchObject({tagTemplates: [{tag: 'meeting'}], trash: [{id: 'n9', deletedAt: '2026-11-21T10:00:00.000Z'}], notes: [{look: {cover: 'p-1', colour: 'sage'}}]});
  });
  test('what this build cannot read is dropped, never failing the record', () => {
    const odd = notesSchema.parse({...R5_NOTES,
      tagTemplates: [{tag: ''}, 7, ...Array.from({length: 14}, (_, i) => ({tag: `t${i}`, body: 'x'}))],
      trash: [{id: 'bad id!', kind: 'topic', createdAt: AT, deletedAt: AT}, {...R5_NOTES.trash![0], deletedAt: 'soon'}, R5_NOTES.trash![0]],
      notes: [{...R5_NOTES.notes[0], look: {cover: 'not ok!', colour: 'neon'}}, {...R5_NOTES.notes[0], id: 'n2', look: 'blue'}]});
    expect(odd.tagTemplates).toHaveLength(MAX_TAG_TEMPLATES);
    expect(odd.trash!.map(n => n.id)).toEqual(['n9']);
    expect(odd.notes[0]!.look?.cover).toBeUndefined(); expect(odd.notes[0]!.look?.colour).toBeUndefined();
    expect(odd.notes[1]!.look).toBeUndefined();
    expect(notesSchema.parse({...R5_NOTES, trash: Array.from({length: MAX_TRASH + 5}, (_, i) => ({...R5_NOTES.trash![0], id: `t${i}`}))}).trash).toHaveLength(MAX_TRASH);
    expect(notesSchema.parse({...R5_NOTES, trash: 'all'}).trash).toBeUndefined();
  });
  test('an older record reads as before; clearing a look takes it off the note; a locked note shows no cover', () => {
    const old = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Old', body: '', createdAt: AT}]});
    expect(old.trash).toBeUndefined(); expect(old.tagTemplates).toBeUndefined(); expect(old.notes[0]!.look).toBeUndefined();
    expect(notesSchema.parse(emptyNotes())).toEqual(emptyNotes());
    expect('look' in updateNote(R5_NOTES, 'n1', {look: {}}, AT, 'UTC').notes[0]!).toBe(false);
    expect('look' in shownOf({...R5_NOTES.notes[0]!, locked: true})).toBe(false);
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into empty notes', async () => {
    const zip = buildEverythingZip(collectEverything({[NOTES_KEY]: JSON.stringify(R5_NOTES)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json), part = parts.find(p => p.id === 'device:notes')!;
    expect(notesSchema.parse(value(part, 'replace'))).toEqual(R5_NOTES);
    const merged = notesSchema.parse(value(part, 'merge', emptyNotes()));
    expect(merged.notes).toEqual(R5_NOTES.notes);
    expect(merged.trash ?? []).toEqual(R5_NOTES.trash);
    expect(merged.tagTemplates ?? []).toEqual(R5_NOTES.tagTemplates);
  });
});
