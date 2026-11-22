import {describe, expect, test} from 'vitest';
import {boardColumns, byProp, choiceValues, filterNotes, propNameIssue, propNames, propsFromFrontMatter, propsFrontMatter, readValue, removeProp, setProp} from './props';
import {applyUndo} from './store';
import {notesSchema, emptyNotes, type Notes} from './schema';
import {noteToMarkdown, parseFrontMatter, planImport} from './markdown';
import {showcaseNotes} from './showcase';

/** Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's properties and Bases): a note's own properties and the views over them. */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T10:00:00.000Z';
const record = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [
  {id: 'a', kind: 'topic', title: 'Fictional trip', body: '', createdAt: AT, props: [{k: 'Status', t: 'choice', v: 'Planning'}, {k: 'Budget', t: 'number', v: 1200}, {k: 'Booked', t: 'tick', v: false}]},
  {id: 'b', kind: 'topic', title: 'Fictional house', body: '', createdAt: AT, props: [{k: 'Status', t: 'choice', v: 'Done'}, {k: 'Budget', t: 'number', v: 300}, {k: 'Booked', t: 'tick', v: true}, {k: 'Due', t: 'date', v: '2026-12-01'}]},
  {id: 'c', kind: 'topic', title: 'Fictional idea', body: '', createdAt: AT}]});
describe('a note’s own properties', () => {
  test('set, change, remove, with Undo; names and values checked; up to ten', () => {
    let out = setProp(record(), 'c', {k: 'Status', t: 'choice', v: 'Planning'}, NOW);
    expect(out.record.notes[2]!.props).toEqual([{k: 'Status', t: 'choice', v: 'Planning'}]);
    expect(applyUndo(out.record, out.undo).notes[2]!.props).toBeUndefined();
    out = setProp(out.record, 'c', {k: 'status', t: 'choice', v: 'Done'}, NOW);
    expect(out.record.notes[2]!.props).toEqual([{k: 'status', t: 'choice', v: 'Done'}]);
    expect(removeProp(out.record, 'c', 'Status', NOW).record.notes[2]!.props).toBeUndefined();
    expect(propNameIssue('title')).toMatch(/ZIGoals uses itself/);
    expect(propNameIssue('Due date')).toBeNull();
    expect(propNameIssue('a:b')).toMatch(/letters, numbers/);
    expect(() => setProp(record(), 'a', {k: 'Budget', t: 'number', v: 'lots' as never}, NOW)).toThrow('does not fit');
    let full = record();
    for (let i = 0; i < 6; i++) full = setProp(full, 'b', {k: `Extra ${i}`, t: 'text', v: 'x'}, NOW).record;
    expect(() => setProp(full, 'b', {k: 'One more', t: 'text', v: 'x'}, NOW)).toThrow('up to 10');
  });
  test('values read from fields by their type', () => {
    expect([readValue('number', '4,5'), readValue('number', 'x'), readValue('date', '2026-02-30'), readValue('date', '2026-12-01'), readValue('tick', 'yes'), readValue('choice', ' '), readValue('text', 'a')]).toEqual([4.5, null, null, '2026-12-01', true, null, 'a']);
  });
});
describe('views by property', () => {
  test('names the most used first with their type; a choice’s values in order', () => {
    expect(propNames(record().notes).map(p => [p.name, p.type, p.count])).toEqual([['Booked', 'tick', 2], ['Budget', 'number', 2], ['Status', 'choice', 2], ['Due', 'date', 1]]);
    expect(choiceValues(record().notes, 'status')).toEqual(['Planning', 'Done']);
  });
  test('filters: is, at least, ticked, has no value; sort by a property, no value last', () => {
    const n = record().notes, ids = (xs: typeof n) => xs.map(x => x.id);
    expect(ids(filterNotes(n, [{name: 'Status', op: 'is', value: 'planning'}]))).toEqual(['a']);
    expect(ids(filterNotes(n, [{name: 'Budget', op: 'atLeast', value: '500'}]))).toEqual(['a']);
    expect(ids(filterNotes(n, [{name: 'Booked', op: 'ticked'}]))).toEqual(['b']);
    expect(ids(filterNotes(n, [{name: 'Due', op: 'unset'}, {name: 'Booked', op: 'unticked'}]))).toEqual(['a', 'c']);
    expect(ids(filterNotes(n, [{name: 'Due', op: 'atMost', value: '2026-12-31'}]))).toEqual(['b']);
    expect(ids([...n].sort(byProp('Budget', 'ascending')))).toEqual(['b', 'a', 'c']);
    expect(ids([...n].sort(byProp('Budget', 'descending')))).toEqual(['a', 'b', 'c']);
  });
  test('the board: a column per value, then the notes with none', () => {
    expect(boardColumns(record().notes, 'Status').map(c => [c.value, c.notes.map(x => x.id)])).toEqual([['Planning', ['a']], ['Done', ['b']], [null, ['c']]]);
  });
});
describe('front matter: written back on export, kept on import', () => {
  test('readable keys for Obsidian, and zigoals-props exactly; read back the same', () => {
    const md = noteToMarkdown(record().notes[1]!), {data} = parseFrontMatter(md);
    expect(md).toContain('\nStatus: "Done"\nBudget: 300\nBooked: true\nDue: 2026-12-01\n');
    expect(propsFromFrontMatter(data)).toEqual(record().notes[1]!.props);
  });
  test('another app’s keys become properties, their type read from the value; ZIGoals’ own keys are not', () => {
    const {data} = parseFrontMatter('---\ntitle: X\nstatus: draft\nrating: 4\ndone: false\npublished: 2026-11-01\naliases: [x]\ntopics: [a, b]\n---\nBody');
    expect(propsFromFrontMatter(data)).toEqual([{k: 'status', t: 'text', v: 'draft'}, {k: 'rating', t: 'number', v: 4}, {k: 'done', t: 'tick', v: false}, {k: 'published', t: 'date', v: '2026-11-01'}, {k: 'topics', t: 'text', v: 'a, b'}]);
    const plan = planImport(emptyNotes(), [{name: 'X.md', data: new TextEncoder().encode('---\nstatus: draft\n---\nBody')}], NOW, '2026-11-22');
    expect(plan.add[0]!.props).toEqual([{k: 'status', t: 'text', v: 'draft'}]);
    expect(propsFrontMatter([])).toEqual([]);
  });
  test('the Showcase’s two notes carry a Status, so Table and Board have something to show', () => {
    const s = showcaseNotes('2026-11-17');
    expect(boardColumns(s.notes.filter(n => n.kind === 'topic'), 'Status').map(c => c.value)).toEqual(['Planning', 'Reading', null]);
  });
});
