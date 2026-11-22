import {describe, expect, it} from 'vitest';
import {addProject, addTask, editTask} from './engine';
import {emptyTasks, tasksSchema, TASKS, TASKS_KEY, type Tasks} from './schema';
import {cleanFieldValues, fieldText, projectFields, readFieldValue, setProjectField, sortByField, type FieldDef} from './custom-fields';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields): fields a project adds to its tasks. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const budget: FieldDef = {id: 'f_budget', name: 'Budget', kind: 'number'}, room: FieldDef = {id: 'f_room', name: 'Room', kind: 'choice', options: ['Kitchen', 'Hall', 'Bath']};
const ordered: FieldDef = {id: 'f_ordered', name: 'Ordered', kind: 'tick'}, by: FieldDef = {id: 'f_by', name: 'Order by', kind: 'date'}, shop: FieldDef = {id: 'f_shop', name: 'Shop', kind: 'text'};
function base(): Tasks {
  let r = addProject(emptyTasks(), {name: 'Fictional redo'}, 'p');
  for (const f of [budget, room, ordered, by, shop]) r = setProjectField(r, 'p', f);
  r = addTask(r, {title: 'Tiles', projectId: 'p'}, {id: 'a', at, today});
  r = addTask(r, {title: 'Paint', projectId: 'p'}, {id: 'b', at, today});
  r = addTask(r, {title: 'Lamp', projectId: 'p'}, {id: 'c', at, today});
  r = editTask(r, 'a', {fields: cleanFieldValues(projectFields(r, 'p'), {f_budget: '450', f_room: 'Hall', f_ordered: true, f_by: '2026-12-01', f_shop: 'Fictional tiles & co'})}, today);
  r = editTask(r, 'b', {fields: cleanFieldValues(projectFields(r, 'p'), {f_budget: '80,5', f_room: 'Kitchen'})}, today);
  return r;
}

describe('custom fields (LEDGER #229)', () => {
  it('up to five per project, each a kind; names are their own; a choice needs its choices', () => {
    const r = base();
    expect(projectFields(r, 'p').map(f => [f.name, f.kind])).toEqual([['Budget', 'number'], ['Room', 'choice'], ['Ordered', 'tick'], ['Order by', 'date'], ['Shop', 'text']]);
    expect(() => setProjectField(r, 'p', {id: 'f6', name: 'Sixth', kind: 'text'})).toThrow('A project keeps 5 fields. Remove one first.');
    const one = setProjectField(addProject(emptyTasks(), {name: 'P'}, 'q'), 'q', budget);
    expect(() => setProjectField(one, 'q', {id: 'f2', name: 'budget', kind: 'text'})).toThrow('This project already has a field “budget”.');
    expect(() => setProjectField(one, 'q', {id: 'f3', name: 'Size', kind: 'choice', options: [' ', '']})).toThrow('Write the choices, separated by commas.');
  });
  it('values are read for their field, in plain words when they do not fit', () => {
    expect(readFieldValue(budget, '12.5')).toEqual({value: 12.5});
    expect(readFieldValue(budget, 'lots')).toEqual({error: '“Budget” is a number, for example 12 or 4.5.'});
    expect(readFieldValue(room, 'Attic')).toEqual({error: 'Choose one of the choices for “Room”.'});
    expect(readFieldValue(by, '2026-02-30x')).toEqual({error: '“Order by” is a day.'});
    expect(readFieldValue(ordered, false)).toEqual({value: null});
    expect(readFieldValue(shop, '  ')).toEqual({value: null});
    const r = base();
    expect(r.tasks.find(t => t.id === 'a')!.fields).toEqual({f_budget: 450, f_room: 'Hall', f_ordered: true, f_by: '2026-12-01', f_shop: 'Fictional tiles & co'});
    expect(r.tasks.find(t => t.id === 'b')!.fields).toEqual({f_budget: 80.5, f_room: 'Kitchen'});
    expect([fieldText(budget, 80.5), fieldText(ordered, true), fieldText(ordered, undefined), fieldText(by, '2026-12-01')]).toEqual(['80.5', 'Yes', '—', 'Dec 1, 2026']);
  });
  it('sorted as a Table column: numbers by size, choices in their own order, empty last', () => {
    const r = base(), tasks = r.tasks;
    expect(sortByField(tasks, budget, 'asc').map(t => t.title)).toEqual(['Paint', 'Tiles', 'Lamp']);
    expect(sortByField(tasks, budget, 'desc').map(t => t.title)).toEqual(['Tiles', 'Paint', 'Lamp']);
    expect(sortByField(tasks, room, 'asc').map(t => t.title)).toEqual(['Paint', 'Tiles', 'Lamp']);
    expect(sortByField(tasks, shop, 'asc').map(t => t.title)).toEqual(['Tiles', 'Paint', 'Lamp']);
  });
  it('removing a field takes its values off the project’s tasks; clearing all removes `fields`', () => {
    const r = setProjectField(base(), 'p', {id: 'f_budget', remove: true});
    expect(projectFields(r, 'p')).toHaveLength(4);
    expect(r.tasks.find(t => t.id === 'b')!.fields).toEqual({f_room: 'Kitchen'});
    expect(editTask(r, 'b', {fields: null}, today).tasks.find(t => t.id === 'b')!.fields).toBeUndefined();
  });
});
describe('Export, erase and restore keep the fields; a value that cannot be read is dropped (TIER 3 stored formats)', () => {
  it('round-trips and reads tolerantly', async () => {
    const r = base(), m = new Map([[TASKS_KEY, JSON.stringify(r)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage), exported = texts[TASKS_KEY]!;
    storage.clear(); storage.setItem(TASKS_KEY, exported);
    const back = readDeviceRecord(storage, TASKS).data;
    expect(projectFields(back, 'p')).toEqual(projectFields(r, 'p'));
    expect(back.tasks.find(t => t.id === 'a')!.fields).toEqual(r.tasks.find(t => t.id === 'a')!.fields);
    const odd = tasksSchema.parse({...r, tasks: r.tasks.map(t => t.id === 'a' ? {...t, fields: {f_budget: 'x'.repeat(201), f_room: 'Hall', 'bad key': 1, f_ordered: false, f_n: Number.NaN}} : t),
      projects: [{...r.projects![0]!, fields: [...projectFields(r, 'p'), {id: 'f_odd', name: '', kind: 'text'}, {id: 'f_kind', name: 'K', kind: 'colour'}]}]});
    expect(odd.tasks.find(t => t.id === 'a')!.fields).toEqual({f_room: 'Hall'});
    expect(projectFields(odd, 'p')).toHaveLength(5);
  });
});
