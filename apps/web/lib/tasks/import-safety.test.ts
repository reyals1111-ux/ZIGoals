import {describe, expect, it} from 'vitest';
import {applyImport, listsOverCap, readIcsTodos, readTickTickCsv, type ImportPlan} from './import';
import {MAX_PROJECTS, MAX_SECTIONS, MAX_SUBTASK_DEPTH, breakParentLoops, emptyTasks, tasksSchema, type Tasks} from './schema';
import {childrenOf, descendants} from './engine';

/**
 * Session AL (security delta review B; TIER 3 (stored format), no shape change). SB-3: no import or restore can make a
 * task its own parent or close a loop of parents (that hid the task and made the page recurse without end). SB-4: an
 * import stops making lists and sections at the caps the record keeps, so no task is left pointing at a dropped list.
 * Fictional data only.
 */
const at = new Date('2026-11-08T09:00:00.000Z');
const ids = () => { let n = 0; return (kind: 'task' | 'project' | 'section') => `${kind}_${++n}`; };
const task = (id: string, parentId?: string) => ({id, title: `Fictional ${id}`, priority: 'normal', createdAt: at.toISOString(), ...(parentId ? {parentId} : {})});
const ics = (...todos: string[]) => ['BEGIN:VCALENDAR', ...todos.flatMap(t => ['BEGIN:VTODO', ...t.split('|'), 'END:VTODO']), 'END:VCALENDAR'].join('\r\n');

describe('SB-3: a task is never its own parent', () => {
  it('an .ics to-do whose RELATED-TO is its own UID is added as a top-level task', () => {
    const plan = readIcsTodos(ics('UID:x|RELATED-TO:x|SUMMARY:Fictional self'));
    const {record} = applyImport(emptyTasks(), plan, {at, newId: ids()});
    expect(record.tasks).toHaveLength(1);
    expect(record.tasks[0]!.parentId).toBeUndefined();
  });
  it('a TickTick row whose parentId is its own taskId is added as a top-level task; a real parent still holds', () => {
    const csv = ['"Folder Name","List Name","Title","Status","taskId","parentId"', '"","Home","Fictional parent","0","p1",""', '"","Home","Fictional self","0","t1","t1"', '"","Home","Fictional child","0","c1","p1"'].join('\n');
    const {record} = applyImport(emptyTasks(), readTickTickCsv(csv), {at, newId: ids()});
    const byTitle = new Map(record.tasks.map(t => [t.title, t]));
    expect(byTitle.get('Fictional self')!.parentId).toBeUndefined();
    expect(byTitle.get('Fictional child')!.parentId).toBe(byTitle.get('Fictional parent')!.id);
  });
  it('an .ics 2-cycle (A under B, B under A) stores no loop', () => {
    const {record} = applyImport(emptyTasks(), readIcsTodos(ics('UID:a|RELATED-TO:b|SUMMARY:Fictional A', 'UID:b|RELATED-TO:a|SUMMARY:Fictional B')), {at, newId: ids()});
    expect(breakParentLoops(record)).toBe(record);
    for (const t of record.tasks) expect(descendants(record, t.id).map(d => d.id)).not.toContain(t.id);
  });
  it('on read (a restore or another tab): a self-parent, a 2-cycle and a 3-cycle each lose one link; a missing parent reads as top-level', () => {
    const read = tasksSchema.parse({version: 1, tasks: [task('self', 'self'), task('a', 'b'), task('b', 'a'), task('x', 'z'), task('y', 'x'), task('z', 'y'), task('orphan', 'gone'), task('kid', 'a')]});
    const parent = Object.fromEntries(read.tasks.map(t => [t.id, t.parentId ?? null]));
    expect(parent).toEqual({self: null, a: null, b: 'a', x: null, y: 'x', z: 'y', orphan: null, kid: 'a'});
    expect(tasksSchema.parse(read)).toEqual(read);
  });
  it('a record with no loop is returned as it is (same object)', () => {
    const record = {version: 1, tasks: [task('p'), task('c', 'p')]} as Tasks;
    expect(breakParentLoops(record)).toBe(record);
  });
  it('the page’s subtask walk is bounded: the depth guard is set and childrenOf never names the task itself', () => {
    expect(MAX_SUBTASK_DEPTH).toBeGreaterThanOrEqual(5);
    const read = tasksSchema.parse({version: 1, tasks: [task('self', 'self')]});
    expect(childrenOf(read, 'self')).toEqual([]);
  });
});

describe('SB-4: an import honours the 100-list and 300-section caps', () => {
  const tickTick = (lists: number, perList = 1, section?: (i: number) => string) => ['"List Name","Title","Status","taskId","Column Name"',
    ...Array.from({length: lists}, (_, i) => Array.from({length: perList}, (_, j) => `"Fictional list ${i}","Fictional task ${i}-${j}","0","t${i}-${j}","${section ? section(i * perList + j) : ''}"`)).flat()].join('\n');
  it('120 lists: 100 are made, the tasks of the other 20 go to the Inbox, and every projectId resolves', () => {
    const plan = readTickTickCsv(tickTick(120));
    expect(listsOverCap(emptyTasks(), plan)).toBe(20);
    const {record, added, merged} = applyImport(emptyTasks(), plan, {at, newId: ids()});
    expect(added).toHaveLength(120);
    expect(record.projects).toHaveLength(MAX_PROJECTS);
    const lists = new Set(record.projects!.map(p => p.id));
    for (const t of record.tasks) if (t.projectId) expect(lists.has(t.projectId), t.title).toBe(true);
    expect(record.tasks.filter(t => !t.projectId)).toHaveLength(20);
    expect(merged).toEqual({lists: 20, sections: 0, tasks: 20});
  });
  it('a record already near the cap: only the room left is used', () => {
    let record: Tasks = emptyTasks();
    record = applyImport(record, readTickTickCsv(tickTick(95)), {at, newId: ids()}).record;
    const plan = readTickTickCsv(tickTick(10).replace(/Fictional list (\d+)/g, 'Other list $1'));
    expect(listsOverCap(record, plan)).toBe(5);
    const out = applyImport(record, plan, {at, newId: (k => (kind: 'task' | 'project' | 'section') => `${kind}_n${k()}`)((() => { let n = 0; return () => ++n; })())});
    expect(out.record.projects).toHaveLength(MAX_PROJECTS);
    expect(out.merged.lists).toBe(5);
    const lists = new Set(out.record.projects!.map(p => p.id));
    for (const t of out.record.tasks) if (t.projectId) expect(lists.has(t.projectId)).toBe(true);
  });
  it('sections past 300 are merged into their list (the task keeps its list, loses only the section)', () => {
    const plan: ImportPlan = {source: 'ticktick', skipped: {done: 0, unreadable: 0, notes: 0}, projects: ['Fictional'], tasks: Array.from({length: 310}, (_, i) => ({ref: `r${i}`, title: `Fictional ${i}`, project: 'Fictional', section: `Column ${i}`}))};
    const {record, merged} = applyImport(emptyTasks(), plan, {at, newId: ids()});
    expect(record.sections).toHaveLength(MAX_SECTIONS);
    const sections = new Set(record.sections!.map(s => s.id));
    for (const t of record.tasks) { expect(t.projectId).toBe(record.projects![0]!.id); if (t.sectionId) expect(sections.has(t.sectionId)).toBe(true); }
    expect(merged).toEqual({lists: 0, sections: 10, tasks: 10});
  });
});
