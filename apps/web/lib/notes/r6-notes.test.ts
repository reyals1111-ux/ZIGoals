import {describe, expect, test} from 'vitest';
import {MAX_PROPS, notesSchema, type Notes} from './schema';
import {applyUndo} from './store';
import {noteTags, tagTree} from './tags';
import {movedTag, renameTag, renameTagInText, tagRenamePreview} from './tag-rename';
import {notReadBack, setReadBack} from './read-back';
import {bulkChange} from './bulk';
import {mergeNotes, mergePreview, mergeTargets, repointLinks} from './merge';
import {columnSum, hasSums} from './table-sums';
import {noteVersionsOf} from './versions';
import {shownOf} from './lock';

/**
 * Session AV lane 2 (r6-notes; LEDGER #399, #402, #405, #407, #408; Capacities): rename or merge a tag, daily notes read
 * back, a property on several notes, merge two notes (with Undo, nothing lost), and sums under the notes table.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T09:00:00.000Z';
const rec = (notes: unknown[], extra: Record<string, unknown> = {}): Notes => notesSchema.parse({version: 1, voice: false, notes, ...extra});

describe('#399 rename or merge a tag', () => {
  const base = () => rec([
    {id: 'a', kind: 'topic', title: 'Fictional A', body: 'Off on a #trip today, and #trip/italy too. `#trip` in code.\n```\n#trip\n```', tags: ['trip'], createdAt: AT},
    {id: 'b', kind: 'topic', title: 'Fictional B', body: 'Packing.', tags: ['Trip', 'home'], createdAt: AT},
    {id: 'c', kind: 'topic', title: 'Fictional C', body: 'Secret #trip words.', locked: true, createdAt: AT},
    {id: 'd', kind: 'topic', title: 'Fictional D', body: 'A #tripod and #travel.', createdAt: AT}],
  {focusTag: 'trip', tagTemplates: [{tag: 'trip', body: '## Where'}, {tag: 'trip/italy', body: '## Città'}]});
  test('only the tag and the tags under it move; code is left as written', () => {
    expect(movedTag('trip', 'trip', 'travel')).toBe('travel'); expect(movedTag('Trip/Italy', 'trip', 'travel')).toBe('travel/Italy'); expect(movedTag('tripod', 'trip', 'travel')).toBeNull();
    expect(renameTagInText(base().notes[0]!.body, 'trip', 'travel')).toBe('Off on a #travel today, and #travel/italy too. `#trip` in code.\n```\n#trip\n```');
  });
  test('rename: words and Tags field, a locked note changed but counted, earlier words kept, template and focus follow; one Undo', () => {
    const before = base(), out = renameTag(before, 'trip', 'journeys', NOW, 'UTC');
    expect(out.changed).toBe(3); expect(out.locked).toBe(1); expect(out.merge).toBe(false);
    expect(out.record.notes.map(n => noteTags(n))).toEqual([['journeys', 'journeys/italy'], ['journeys', 'home'], ['journeys'], ['tripod', 'travel']]);
    expect(noteVersionsOf(out.record, 'a')[0]!.body).toBe(before.notes[0]!.body);
    expect(out.record.focusTag).toBe('journeys');
    expect(out.record.tagTemplates!.map(t => t.tag)).toEqual(['journeys', 'journeys/italy']);
    const back = applyUndo(out.record, out.undo);
    expect(back.notes).toEqual(before.notes); expect(back.focusTag).toBe('trip'); expect(back.tagTemplates).toEqual(before.tagTemplates);
  });
  test('merge into a tag that is there: one tag, never twice; its own template wins and the old one stays', () => {
    const r = rec([...base().notes, {id: 'e', kind: 'topic', title: 'Fictional E', body: 'x', tags: ['travel'], createdAt: AT}], {tagTemplates: [{tag: 'trip', body: 'T'}, {tag: 'travel', body: 'V'}]});
    expect(tagRenamePreview(r, 'trip', 'travel')).toEqual({notes: 3, locked: 1, merge: true});
    const out = renameTag(r, 'trip', 'travel', NOW, 'UTC');
    expect(out.merge).toBe(true); expect(out.templateKept).toBe(true);
    expect(out.record.tagTemplates).toEqual([{tag: 'trip', body: 'T'}, {tag: 'travel', body: 'V'}]);
    expect(tagTree(out.record.notes).find(t => t.tag === 'trip')).toBeUndefined();
    expect(noteTags(out.record.notes[1]!)).toEqual(['travel', 'home']);
  });
  test('refused in words: no letter, the same name, under itself, a tag nobody carries', () => {
    expect(() => renameTag(base(), 'trip', '123', NOW)).toThrow(/letter/);
    expect(() => renameTag(base(), 'trip', 'TRIP', NOW)).toThrow(/already called/);
    expect(() => renameTag(base(), 'trip', 'trip/sub', NOW)).toThrow(/sits under/);
    expect(() => renameTag(base(), 'nothing', 'else', NOW)).toThrow(/No note carries/);
  });
});
describe('#402 daily notes read back', () => {
  const r = () => rec([
    {id: 'd1', kind: 'daily', title: '2026-10-01', day: '2026-10-01', body: 'Old day.', createdAt: AT},
    {id: 'd2', kind: 'daily', title: '2026-11-10', day: '2026-11-10', body: 'A day.', createdAt: AT},
    {id: 'd3', kind: 'daily', title: '2026-11-12', day: '2026-11-12', body: '', createdAt: AT},
    {id: 'd4', kind: 'daily', title: '2026-11-15', day: '2026-11-15', body: 'Hidden.', locked: true, createdAt: AT},
    {id: 'd5', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'Read.', readBack: '2026-11-21', createdAt: AT},
    {id: 'd6', kind: 'daily', title: '2026-11-22', day: '2026-11-22', body: 'Today.', createdAt: AT},
    {id: 't', kind: 'topic', title: 'Fictional topic', body: 'x', createdAt: AT}]);
  test('the last 30 days before today, with words (a locked one counts), not read back, oldest first', () => {
    expect(notReadBack(r(), '2026-11-22').map(n => n.id)).toEqual(['d2', 'd4']);
  });
  test('marking keeps the note’s changed time and offers Undo; a topic note is refused', () => {
    const out = setReadBack(r(), 'd2', true, '2026-11-22');
    expect(out.record.notes[1]!.readBack).toBe('2026-11-22'); expect(out.record.notes[1]!.updatedAt).toBeUndefined();
    expect(applyUndo(out.record, out.undo).notes[1]!.readBack).toBeUndefined();
    expect('readBack' in setReadBack(r(), 'd5', false, '2026-11-22').record.notes[4]!).toBe(false);
    expect(() => setReadBack(r(), 't', true, '2026-11-22')).toThrow(/daily note/);
  });
});
describe('#405 a property on several notes at once', () => {
  const many = Array.from({length: MAX_PROPS}, (_, i) => ({k: `P${i}`, t: 'text', v: 'x'}));
  const r = () => rec([
    {id: 'a', kind: 'topic', title: 'A', body: '', createdAt: AT, props: [{k: 'Status', t: 'choice', v: 'Idea'}]},
    {id: 'b', kind: 'topic', title: 'B', body: '', createdAt: AT},
    {id: 'c', kind: 'topic', title: 'C', body: '', createdAt: AT, props: many},
    {id: 'd', kind: 'topic', title: 'D', body: '', createdAt: AT, locked: true}]);
  test('one value on every chosen note; a full one and a locked one skipped and counted; one Undo', () => {
    const out = bulkChange(r(), ['a', 'b', 'c', 'd'], {kind: 'prop-set', prop: {k: 'status', t: 'choice', v: 'Done'}}, NOW);
    expect(out.changed).toBe(2); expect(out.skipped).toBe(2); expect(out.full).toBe(1); expect(out.locked).toBe(1);
    expect(out.record.notes[0]!.props).toEqual([{k: 'status', t: 'choice', v: 'Done'}]);
    expect(out.record.notes[1]!.props).toEqual([{k: 'status', t: 'choice', v: 'Done'}]);
    expect(out.record.notes[3]!.props).toBeUndefined();
    expect(applyUndo(out.record, out.undo).notes).toEqual(r().notes);
  });
  test('removed from those that have it; a bad name or value refused before anything changes', () => {
    const out = bulkChange(r(), ['a', 'b'], {kind: 'prop-remove', name: 'STATUS'}, NOW);
    expect(out.changed).toBe(1); expect(out.record.notes[0]!.props).toBeUndefined();
    expect(() => bulkChange(r(), ['a'], {kind: 'prop-set', prop: {k: 'tags', t: 'text', v: 'x'}}, NOW)).toThrow(/ZIGoals uses itself/);
    expect(() => bulkChange(r(), ['a'], {kind: 'prop-set', prop: {k: 'Budget', t: 'number', v: Number.NaN}}, NOW)).toThrow(/does not fit/);
    expect(() => bulkChange(r(), ['c'], {kind: 'prop-set', prop: {k: 'New', t: 'tick', v: true}}, NOW)).toThrow(/10 properties already/);
  });
});
describe('#407 merge two notes', () => {
  const r = () => rec([
    {id: 'a', kind: 'topic', title: 'Fictional Rome', body: 'Colosseum. #italy', tags: ['city'], photoId: 'p-a', props: [{k: 'Status', t: 'choice', v: 'Done'}, {k: 'Budget', t: 'number', v: 300}], createdAt: '2026-11-19T09:00:00.000Z', pinned: true},
    {id: 'b', kind: 'topic', title: 'Fictional Italy', body: 'The trip.', tags: ['trip'], photoId: 'p-b', props: [{k: 'Status', t: 'choice', v: 'Planning'}], createdAt: AT},
    {id: 'c', kind: 'topic', title: 'Fictional links', body: 'See [[Fictional Rome]] and [[fictional rome#Food|food]] and ![[Fictional Rome]].', createdAt: AT},
    {id: 'l', kind: 'topic', title: 'Fictional locked', body: 'Also [[Fictional Rome]].', locked: true, createdAt: AT},
    {id: 'x', kind: 'topic', title: 'Fictional sealed', body: 'Locked.', locked: true, createdAt: AT}],
  {canvases: [{id: 'cv-0001', name: 'Board', nodes: [{id: 'n1', type: 'note', note: 'a', x: 0, y: 0, w: 200, h: 100}], edges: [], updatedAt: AT}]});
  test('links point at its heading in the other note', () => {
    expect(repointLinks('[[A]] [[a|x]] ![[A#H]] [[B]]', 'a', 'B', 'A')).toBe('[[B#A]] [[B#A|x]] ![[B#H]] [[B]]');
  });
  test('words under the other’s, photos, tags and missing properties added, a differing one written in the words, links and board follow; nothing lost; one Undo', () => {
    const before = r(), p = mergePreview(before, 'a', 'b');
    expect(p).toMatchObject({photos: 1, links: 2, locked: 1, propLines: 1, problem: null});
    const out = mergeNotes(before, 'a', 'b', NOW, 'UTC'), b = out.record.notes.find(n => n.id === 'b')!;
    expect(b.body).toBe('The trip.\n\n## Fictional Rome\n\nColosseum. #italy\n\nProperties it had:\n- Status: Done');
    expect(b.photoId).toBe('p-b'); expect(b.photos).toEqual(['p-a']); expect(b.tags).toEqual(['trip', 'city']);
    expect(b.props).toEqual([{k: 'Status', t: 'choice', v: 'Planning'}, {k: 'Budget', t: 'number', v: 300}]);
    expect(out.record.notes.find(n => n.id === 'c')!.body).toBe('See [[Fictional Italy#Fictional Rome]] and [[Fictional Italy#Food|food]] and ![[Fictional Italy#Fictional Rome]].');
    expect(out.record.notes.find(n => n.id === 'l')!.body).toBe('Also [[Fictional Italy#Fictional Rome]].');
    expect(out.record.notes.some(n => n.id === 'a')).toBe(false);
    expect(out.record.trash!.map(n => n.id)).toEqual(['a']);
    expect(noteVersionsOf(out.record, 'b')[0]!.body).toBe('The trip.');
    expect(out.record.canvases![0]!.nodes[0]!.note).toBe('b');
    const back = applyUndo(out.record, out.undo);
    expect(back.notes).toEqual(before.notes); expect(back.trash).toBeUndefined(); expect(back.canvases).toEqual(before.canvases);
  });
  test('never a locked note, an inbox capture or a daily note as the one merged; too many photos refused in words', () => {
    expect(mergeTargets(r(), 'a').map(n => n.id)).toEqual(['b', 'c']);
    expect(() => mergeNotes(r(), 'a', 'x', NOW)).toThrow(/locked note is never merged/);
    expect(() => mergeNotes(rec([{id: 'd', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'x', createdAt: AT}, ...r().notes]), 'd', 'b', NOW)).toThrow(/Only a topic note/);
    const full = rec([{...r().notes[0], photos: ['p-1', 'p-2', 'p-3', 'p-4']}, {...r().notes[1], photos: ['p-5', 'p-6', 'p-7', 'p-8']}]);
    expect(mergePreview(full, 'a', 'b').problem).toMatch(/can hold 8 photos/);
    expect(() => mergeNotes(full, 'a', 'b', NOW)).toThrow(/nothing was merged/);
  });
});
describe('#408 sums under the table', () => {
  const notes = rec([
    {id: 'a', kind: 'topic', title: 'A', body: '', createdAt: AT, props: [{k: 'Budget', t: 'number', v: 120.5}, {k: 'Booked', t: 'tick', v: true}]},
    {id: 'b', kind: 'topic', title: 'B', body: '', createdAt: AT, props: [{k: 'Budget', t: 'number', v: 80}, {k: 'Booked', t: 'tick', v: false}]},
    {id: 'c', kind: 'topic', title: 'C', body: '', createdAt: AT},
    {id: 'l', kind: 'topic', title: 'L', body: '', createdAt: AT, locked: true, props: [{k: 'Budget', t: 'number', v: 1000}, {k: 'Booked', t: 'tick', v: true}]}]).notes.map(shownOf);
  test('sum and average of the notes with a value; ticked of the notes shown; a locked note never counts', () => {
    expect(columnSum(notes, 'budget', 'number')).toEqual({kind: 'number', sum: 200.5, average: 100.25, count: 2});
    expect(columnSum(notes, 'Booked', 'tick')).toEqual({kind: 'tick', ticked: 1, of: 4});
    expect(columnSum(notes, 'Status', 'choice')).toBeNull();
    expect(hasSums([{type: 'text'}])).toBe(false); expect(hasSums([{type: 'number'}])).toBe(true);
  });
});
