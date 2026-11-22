import {describe, expect, test} from 'vitest';
import {NOTES_KEY, emptyNotes, notesSchema, type Notes} from './schema';
import {updateNote} from './store';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r3-notes; TIER 3 (stored format), additive and optional): a note's own properties (`props`, LEDGER
 * #270) and the notes record's boards (`canvases`, LEDGER #273) read on their own (an item this build cannot read is
 * dropped, never failing the record), older records read as before, and Export everything → erase → Restore (Replace and
 * Merge) gives both back — the boards live in the notes record, so no new key is needed.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const R3_NOTES: Notes = notesSchema.parse({version: 1, voice: false,
  notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Plans.', createdAt: AT, props: [{k: 'Status', t: 'choice', v: 'Planning'}, {k: 'Budget', t: 'number', v: 1200}, {k: 'Leave', t: 'date', v: '2027-04-01'}, {k: 'Booked', t: 'tick', v: false}, {k: 'With', t: 'text', v: 'Fictional friends'}]}],
  canvases: [{id: 'cv-trip0001', name: 'Fictional trip board', updatedAt: AT,
    nodes: [{id: 'a', type: 'note', note: 'n1', x: 0, y: 0, w: 260, h: 140}, {id: 'b', type: 'text', text: 'Fictional idea', x: 320, y: 0, w: 220, h: 120, color: '4'}, {id: 'g', type: 'group', label: 'Fictional spring', x: -40, y: -40, w: 640, h: 240}],
    edges: [{id: 'e1', from: 'a', to: 'b', label: 'leads to'}]}]});

describe('the round-3 notes fields read on their own', () => {
  test('a full record keeps them', () => {
    expect(R3_NOTES.notes[0]!.props).toHaveLength(5);
    expect(R3_NOTES.canvases![0]).toMatchObject({name: 'Fictional trip board', nodes: [{type: 'note'}, {type: 'text', color: '4'}, {type: 'group', label: 'Fictional spring'}], edges: [{label: 'leads to'}]});
  });
  test('an item this build cannot read is dropped, never failing the record', () => {
    const odd = notesSchema.parse({...R3_NOTES,
      notes: [{...R3_NOTES.notes[0], props: [{k: 'Status', t: 'choice', v: 'Planning'}, {k: 'Budget', t: 'number', v: 'lots'}, {k: '', t: 'text', v: 'x'}, {k: 'Mood', t: 'colour', v: 'red'}]}],
      canvases: [{...R3_NOTES.canvases![0], nodes: [{id: 'a', type: 'note', note: 'n1', x: 0, y: 0, w: 260, h: 140}, {id: 'z', type: 'video', x: 0, y: 0, w: 100, h: 100}, {id: 'b', type: 'text', x: 1e9, y: 0, w: 1, h: 1}]}, {id: 'bad', name: 'x'}]});
    expect(odd.notes[0]!.props).toEqual([{k: 'Status', t: 'choice', v: 'Planning'}]);
    expect(odd.canvases).toHaveLength(1);
    expect(odd.canvases![0]!.nodes.map(n => n.id)).toEqual(['a']);
    expect(notesSchema.parse({...R3_NOTES, canvases: 'x', notes: [{...R3_NOTES.notes[0], props: 'x'}]})).toMatchObject({canvases: undefined, notes: [{props: undefined}]});
  });
  test('an older record reads as before; clearing the properties takes the field off', () => {
    const old = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Old', body: '', createdAt: AT}]});
    expect(old.canvases).toBeUndefined(); expect(old.notes[0]!.props).toBeUndefined();
    expect(notesSchema.parse(emptyNotes())).toEqual(emptyNotes());
    expect('props' in updateNote(R3_NOTES, 'n1', {props: []}, AT, 'UTC').notes[0]!).toBe(false);
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into empty notes', async () => {
    const zip = buildEverythingZip(collectEverything({[NOTES_KEY]: JSON.stringify(R3_NOTES)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json), part = parts.find(p => p.id === 'device:notes')!;
    expect(notesSchema.parse(value(part, 'replace'))).toEqual(R3_NOTES);
    const merged = notesSchema.parse(value(part, 'merge', emptyNotes()));
    expect(merged.notes).toEqual(R3_NOTES.notes);
    expect(merged.canvases).toEqual(R3_NOTES.canvases);
  });
});
