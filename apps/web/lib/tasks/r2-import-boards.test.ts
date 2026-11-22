import {describe, expect, it} from 'vitest';
import {applyImport, readTaskFile} from './import';
import {readAsanaCsv, readTrelloJson} from './import-boards';
import {emptyTasks} from './schema';
import {restoreTasks} from './engine';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #227; Any.do): Trello's board export (JSON) and Asana's project CSV, in the layouts
 * their vendors document, into a project, sections and tasks. Fictional boards.
 */
const ZONE = 'Europe/Amsterdam', today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const TRELLO = JSON.stringify({
  id: 'b1', name: 'Fictional kitchen redo', closed: false,
  lists: [{id: 'l2', name: 'Doing', closed: false, pos: 2}, {id: 'l1', name: 'To do', closed: false, pos: 1}, {id: 'l3', name: 'Old ideas', closed: true, pos: 3}],
  cards: [
    {id: 'c1', name: 'Pick the tiles', desc: 'Matte, light grey', idList: 'l1', closed: false, due: '2026-11-27T15:30:00.000Z', dueComplete: false, labels: [{name: 'Shop', color: 'green'}, {name: '', color: 'red'}], pos: 1, idMembers: ['m1', 'm2']},
    {id: 'c2', name: 'Measure the walls', desc: '', idList: 'l2', closed: false, due: null, dueComplete: false, labels: [], pos: 1},
    {id: 'c3', name: 'Paint the ceiling', desc: '', idList: 'l1', closed: true, pos: 2},
    {id: 'c4', name: 'Order the sink', desc: '', idList: 'l1', closed: false, due: '2026-11-20T11:00:00.000Z', dueComplete: true, pos: 3},
    {id: 'c5', name: 'A marble top', desc: '', idList: 'l3', closed: false, pos: 1},
    {id: 'c6', name: '   ', idList: 'l1', closed: false, pos: 4},
  ],
  checklists: [{id: 'k1', idCard: 'c2', name: 'Walls', pos: 1, checkItems: [{id: 'i2', name: 'North wall', state: 'incomplete', pos: 2}, {id: 'i1', name: 'East wall', state: 'complete', pos: 1}, {id: 'i3', name: 'South wall', state: 'incomplete', pos: 3}]}],
});
const ASANA = [
  'Task ID,Created At,Completed At,Last Modified,Name,Section/Column,Assignee,Assignee Email,Start Date,Due Date,Tags,Notes,Projects,Parent task,Priority',
  '1201,2026-11-01,,2026-11-02,Book the fictional venue,Planning,Sam Fictional,sam@example.invalid,,2026-12-01,"venue,calls",Ask for the hall,Fictional launch,,High',
  '1203,2026-11-01,,2026-11-02,Call the caterer,Planning,,,,,,,Fictional launch,Book the fictional venue,',
  '1202,2026-11-01,2026-11-03,2026-11-03,Write the guest list,Planning,,,,2026-11-05,,,Fictional launch,,',
  '1204,2026-11-01,,2026-11-02,Print the badges,Week of,,,2026-12-08,,,"Two lines, ""bold""",Fictional launch,,Low',
  '1205,2026-11-01,,2026-11-02,Loose idea,(no section),,,,,,,Fictional launch,,',
].join('\r\n');

describe('Trello board JSON (LEDGER #227)', () => {
  it('the board is a project, open lists are sections in board order, cards tasks, checklist items subtasks', () => {
    const plan = readTrelloJson(TRELLO, {zone: ZONE});
    expect(plan.source).toBe('trello');
    expect(plan.projects).toEqual(['Fictional kitchen redo']);
    expect(plan.tasks.map(t => [t.title, t.section, t.parentRef ?? null])).toEqual([
      ['Pick the tiles', 'To do', null], ['Measure the walls', 'Doing', null], ['North wall', 'Doing', 'c2'], ['South wall', 'Doing', 'c2'],
    ]);
    expect(plan.tasks[0]).toMatchObject({due: '2026-11-27', time: '16:30', labels: ['Shop', 'red'], notes: 'Matte, light grey'});
    // Archived cards and lists, finished cards and items, a card with no name; two members left out.
    expect(plan.skipped).toEqual({done: 2, unreadable: 1, notes: 0, archived: 2, people: 2});
  });
  it('not a board: a plain sentence says so', () => {
    expect(() => readTrelloJson('{"cards": 1}', {zone: ZONE})).toThrow(/no cards and lists/);
    expect(() => readTrelloJson('{oops', {zone: ZONE})).toThrow(/not JSON/);
  });
});
describe('Asana CSV (LEDGER #227)', () => {
  it('Projects is the project, Section/Column the section, Parent task the parent; assignees left out', () => {
    const plan = readAsanaCsv(ASANA);
    expect(plan.source).toBe('asana');
    expect(plan.projects).toEqual(['Fictional launch']);
    expect(plan.tasks.map(t => [t.title, t.section ?? null, t.parentRef ?? null, t.due ?? null, t.level ?? null])).toEqual([
      ['Book the fictional venue', 'Planning', null, '2026-12-01', 1], ['Call the caterer', 'Planning', '1201', null, null], ['Print the badges', 'Week of', null, '2026-12-08', 4], ['Loose idea', null, null, null, null],
    ]);
    expect(plan.tasks[0]).toMatchObject({labels: ['venue', 'calls'], notes: 'Ask for the hall'});
    expect(plan.tasks[2]!.notes).toBe('Two lines, "bold"');
    expect(plan.skipped).toMatchObject({done: 1, people: 1});
  });
  it('a subtask listed before its parent still lands under it', () => {
    const lines = ASANA.split('\r\n'), swapped = [lines[0], lines[2], lines[1]].join('\r\n');
    const plan = readAsanaCsv(swapped), record = applyImport(emptyTasks(), plan, {at, newId: k => `${k}_${Math.random().toString(36).slice(2, 10)}`}).record;
    const parent = record.tasks.find(t => t.title === 'Book the fictional venue')!, child = record.tasks.find(t => t.title === 'Call the caterer')!;
    expect(child.parentId).toBe(parent.id);
  });
});
describe('readTaskFile picks the reader; the import is one change with one Undo', () => {
  it('Trello and Asana by their own marks, then into the record with sections', () => {
    expect(readTaskFile(TRELLO, {fileName: 'board.json', today, zone: ZONE}).source).toBe('trello');
    expect(readTaskFile(ASANA, {fileName: 'launch.csv', today}).source).toBe('asana');
    expect(() => readTaskFile('{"hello": 1}', {fileName: 'x.json', today})).toThrow(/a Trello board \(JSON\), an Asana CSV/);
    let n = 0;
    const out = applyImport(emptyTasks(), readTaskFile(TRELLO, {fileName: 'board.json', today, zone: ZONE}), {at, newId: k => `${k}_${++n}`});
    expect(out.record.projects!.map(p => p.name)).toEqual(['Fictional kitchen redo']);
    expect(out.record.sections!.map(s => s.name)).toEqual(['To do', 'Doing']);
    expect(out.record.tasks.filter(t => t.parentId)).toHaveLength(2);
    // Undo: the tasks the import added are taken back (projects and sections go with the page's change Undo).
    expect(restoreTasks(out.record, [], out.added).tasks).toEqual([]);
  });
});
