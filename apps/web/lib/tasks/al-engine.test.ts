import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {
  addProject, addSection, addTask, childrenOf, clearDone, completedLog, editTask, finishMany, finishTask, labelsInUse, moveStep, moveTasks,
  prune, recentlyDone, removeMany, removeProject, removeTask, restoreTasks, saveFilter, skipOccurrence, subtaskProgress, taskState, viewTasks,
} from './engine';
import {LEVEL_WORDS, MAX_TASKS, TASKS, TASKS_KEY, emptyTasks, taskLevel, tasksSchema, type Tasks} from './schema';
import {matchTasks, parseQuery} from './search';
import {applyImport, readCsv, readIcsTodos, readTaskFile, readTickTickCsv, readTodoistCsv, recurFromRrule, tasksCsv} from './import';
import {dueReminders, reminderInstants} from './reminders';
import {salvageTasks, keepSalvaged, addTask as addOnDevice, completeTask, changeTask, readTasks} from './device';
import {readDeviceRecord} from '../device-record';

/** Session AL (Part 8): Tasks at Todoist/TickTick level — the stored format, the engine, search, import/export, reminders. */
const TODAY = '2026-11-04', at = new Date('2026-11-04T09:00:00.000Z');
let n = 0;
const add = (r: Tasks, title: string, extra: Partial<Parameters<typeof addTask>[1]> = {}, id = `t${++n}`) => addTask(r, {title, ...extra}, {id, at, today: TODAY, allowPast: true});
const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, map: m}; };
const day = (iso: string) => iso.slice(0, 10);

describe('TIER 3: the stored format stays additive', () => {
  it('a #53 record reads unchanged; the new fields are optional and kept; an older reader keeps p2 as high', () => {
    const old = {version: 1, tasks: [{id: 'task_1', title: 'Call the bank', priority: 'low', createdAt: at.toISOString()}]};
    const parsed = tasksSchema.parse(old);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(old);
    expect(taskLevel(parsed.tasks[0]!)).toBe(4);
    const r = add(emptyTasks(), 'Medium', {level: 2, labels: ['bills', 'not a label', 'bills'], notes: 'n', recur: {every: 'week', interval: 1}, due: TODAY, reminders: [{before: 15}], health: 'water'});
    expect(r.tasks[0]).toMatchObject({priority: 'high', level: 2, labels: ['bills'], notes: 'n', health: 'water', reminders: [{before: 15}]});
    // An older reader's schema (the #53 one) still reads what this build writes.
    const legacy = z.looseObject({version: z.literal(1), tasks: z.array(z.looseObject({id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), title: z.string().trim().min(1).max(140), priority: z.enum(['high', 'normal', 'low']).catch('normal'), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), goal: z.string().max(120).optional(), time: z.string().optional().catch(undefined), createdAt: z.iso.datetime({offset: true}), doneAt: z.iso.datetime({offset: true}).optional()})).max(500)});
    const read = readDeviceRecord(memory({[TASKS_KEY]: JSON.stringify(r)}), {...TASKS, schema: legacy as never});
    expect(read.unreadable).toBe(false);
    expect((read.data as Tasks).tasks[0]).toMatchObject({priority: 'high', level: 2, labels: ['bills']});
  });
  it('a field this build cannot read is dropped on read, never failing the list', () => {
    const r = tasksSchema.parse({version: 1, tasks: [{id: 'a', title: 'A', priority: 'normal', createdAt: at.toISOString(), level: 9, labels: 'x', recur: {every: 'fortnight'}, reminders: [{before: -1}, {before: 5}], parentId: 'bad id!'}], projects: [{id: 'p', name: 'Home'}, {name: 'broken'}]});
    expect(r.tasks[0]).toMatchObject({reminders: [{before: 5}]});
    expect(r.tasks[0]!.level).toBeUndefined();
    expect(r.tasks[0]!.recur).toBeUndefined();
    expect(r.projects).toEqual([{id: 'p', name: 'Home', colour: 'grey', order: 0}]);
    expect(LEVEL_WORDS[taskLevel(r.tasks[0]!)]).toBe('P3 · Normal');
  });
});

describe('P-LS-01: projects, sections, subtasks, labels, order', () => {
  it('projects and sections; moving keeps subtasks with their parent; removing a project moves its tasks to the Inbox', () => {
    let r = addProject(emptyTasks(), {name: 'Home', colour: 'green'}, 'p_home');
    expect(() => addProject(r, {name: ' home '})).toThrow('already a project');
    r = addSection(r, 'p_home', 'Kitchen', 's_k');
    r = add(r, 'Paint', {}, 'paint');
    r = add(r, 'Buy brushes', {parentId: 'paint'}, 'brushes');
    r = moveTasks(r, ['paint'], {projectId: 'p_home', sectionId: 's_k'});
    expect(r.tasks.find(t => t.id === 'brushes')).toMatchObject({projectId: 'p_home', parentId: 'paint'});
    expect(viewTasks(r, {kind: 'project', id: 'p_home'}, TODAY).map(t => t.id)).toEqual(['paint']);
    expect(childrenOf(r, 'paint').map(t => t.id)).toEqual(['brushes']);
    expect(subtaskProgress(r, 'paint')).toEqual({done: 0, total: 1});
    r = removeProject(r, 'p_home');
    expect(r.tasks.every(t => !t.projectId && !t.sectionId)).toBe(true);
    expect(r.sections).toEqual([]);
  });
  it('finishing a parent finishes its subtasks; removing removes them; restoreTasks puts all back', () => {
    let r = add(emptyTasks(), 'Trip', {}, 'trip');
    r = add(r, 'Pack', {parentId: 'trip'}, 'pack');
    r = add(r, 'Tickets', {parentId: 'trip'}, 'tickets');
    r = finishTask(r, 'pack', at);
    expect(subtaskProgress(r, 'trip')).toEqual({done: 1, total: 2});
    const before = r.tasks;
    const done = finishTask(r, 'trip', at);
    expect(done.tasks.every(t => t.doneAt)).toBe(true);
    const gone = removeTask(r, 'trip');
    expect(gone.tasks).toEqual([]);
    expect(restoreTasks(gone, before).tasks.map(t => t.id).sort()).toEqual(['pack', 'tickets', 'trip']);
    expect(() => editTask(r, 'trip', {parentId: 'pack'}, TODAY)).toThrow('cannot sit under itself');
  });
  it('manual order with Move up / Move down; labels in use', () => {
    let r = add(add(add(emptyTasks(), 'A', {labels: ['x']}, 'a'), 'B', {labels: ['x', 'y']}, 'b'), 'C', {}, 'c');
    r = moveStep(r, ['a', 'b', 'c'], 'c', -1);
    expect(viewTasks(r, {kind: 'inbox'}, TODAY).map(t => t.id)).toEqual(['a', 'c', 'b']);
    expect(moveStep(r, ['a', 'c', 'b'], 'a', -1)).toBe(r);
    expect(labelsInUse(r)).toEqual([{name: 'x', open: 2}, {name: 'y', open: 1}]);
  });
});

describe('P-LS-02 / P-LS-11 / P-LS-12: repeats, past days, late timed tasks', () => {
  it('a repeating task rolls forward with its occurrence kept; Undo puts it back exactly', () => {
    let r = add(emptyTasks(), 'Pay rent', {due: '2026-11-01', recur: {every: 'month', interval: 1, monthDay: 1}}, 'rent');
    const before = r.tasks;
    r = finishTask(r, 'rent', at, {today: TODAY, doneDay: TODAY});
    expect(r.tasks[0]).toMatchObject({due: '2026-12-01', completions: [{at: at.toISOString(), due: '2026-11-01'}]});
    expect(r.tasks[0]!.doneAt).toBeUndefined();
    expect(completedLog(r)[0]).toMatchObject({occurrence: true});
    expect(restoreTasks(r, before).tasks).toEqual(before);
    expect(skipOccurrence(r, 'rent', TODAY).tasks[0]!.due).toBe('2027-01-01');
    const last = add(emptyTasks(), 'Course', {due: TODAY, recur: {every: 'week', interval: 1, left: 1}}, 'c');
    expect(finishTask(last, 'c', at, {today: TODAY, doneDay: TODAY}).tasks[0]!.doneAt).toBe(at.toISOString());
  });
  it('DV-164: a past day is taken with allowPast (overdue) and refused with a message otherwise', () => {
    expect(add(emptyTasks(), 'Late', {due: '2026-11-01'}).tasks[0]!.due).toBe('2026-11-01');
    expect(() => addTask(emptyTasks(), {title: 'Late', due: '2026-11-01'}, {id: 'x', at, today: TODAY})).toThrow('Choose today or a later day');
    expect(editTask(add(emptyTasks(), 'X', {}, 'x'), 'x', {due: '2026-10-01'}, TODAY, {allowPast: true}).tasks[0]!.due).toBe('2026-10-01');
  });
  it('LS-011: a task due today at 23:00 is late at 23:10', () => {
    const t = add(emptyTasks(), 'Late call', {due: TODAY, time: '23:00'}).tasks[0]!;
    expect(taskState(t, TODAY, '22:59')).toBe('today');
    expect(taskState(t, TODAY, '23:10')).toBe('overdue');
    expect(taskState(t, '2026-11-05')).toBe('overdue');
  });
  it('LS-037: done tasks are counted by their local finish day; Clear done; bulk finish and remove', () => {
    let r = tasksSchema.parse({version: 1, tasks: [
      {id: 'old', title: 'Old', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-10-04T23:30:00.000Z'},
      {id: 'new', title: 'New', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-10-05T10:00:00.000Z'},
      {id: 'open', title: 'Open', priority: 'normal', createdAt: at.toISOString()},
    ]});
    // In Auckland 23:30 UTC on 4 Oct is 5 Oct; in UTC it is 4 Oct, 31 days ago.
    expect(recentlyDone(r, TODAY, day).map(t => t.id)).toEqual(['new']);
    expect(prune(r, TODAY, day).tasks.map(t => t.id)).toEqual(['new', 'open']);
    expect(clearDone(r).tasks.map(t => t.id)).toEqual(['open']);
    r = add(r, 'Two', {}, 'two');
    expect(finishMany(r, ['open', 'two'], at).tasks.filter(t => !t.doneAt)).toEqual([]);
    // Adding pruned "old" (finished over 30 days ago).
    expect(removeMany(r, ['open', 'two']).tasks.map(t => t.id)).toEqual(['new']);
  });
});

describe('P-LS-06: views', () => {
  it('Inbox, Today (overdue first), Upcoming, labels, priority, overdue', () => {
    let r = addProject(emptyTasks(), {name: 'Work'}, 'p');
    r = add(r, 'Inbox one', {}, 'i');
    r = add(r, 'Due today', {due: TODAY, projectId: 'p'}, 'd');
    r = add(r, 'Overdue', {due: '2026-11-01', level: 1, labels: ['calls']}, 'o');
    r = add(r, 'Next week', {due: '2026-11-10', labels: ['calls']}, 'n');
    expect(viewTasks(r, {kind: 'inbox'}, TODAY).map(t => t.id)).toEqual(['i', 'o', 'n']);
    expect(viewTasks(r, {kind: 'today'}, TODAY).map(t => t.id)).toEqual(['o', 'd']);
    expect(viewTasks(r, {kind: 'upcoming'}, TODAY).map(t => t.id)).toEqual(['d', 'n']);
    expect(viewTasks(r, {kind: 'label', name: 'calls'}, TODAY).map(t => t.id)).toEqual(['o', 'n']);
    expect(viewTasks(r, {kind: 'priority', level: 1}, TODAY).map(t => t.id)).toEqual(['o']);
    expect(viewTasks(r, {kind: 'overdue'}, TODAY).map(t => t.id)).toEqual(['o']);
    expect(saveFilter(r, 'Calls', '@calls & overdue').filters).toHaveLength(1);
  });
});

describe('P-LS-05: search with operators (LS-005, LS-047, LS-H47)', () => {
  let r = addProject(emptyTasks(), {name: 'Home'}, 'home');
  r = add(r, 'Call the plumber', {due: TODAY, level: 1, projectId: 'home', labels: ['calls']}, 'plumber');
  r = add(r, 'Buy milk', {due: '2026-11-05'}, 'milk');
  for (const i of [11, 12, 13]) r = add(r, `L${i}`, {}, `l${i}`);
  r = add(r, 'Old milk', {due: '2026-11-01'}, 'oldmilk');
  const q = (query: string) => matchTasks(r, query, {today: TODAY}).map(t => t.id).sort();
  it('words, parts of words, accents', () => {
    expect(q('plumber')).toEqual(['plumber']);
    expect(q('L1')).toEqual(['l11', 'l12', 'l13']);
    expect(q('MILK')).toEqual(['milk', 'oldmilk']);
  });
  it('operators: p1, today, overdue, #project, @label, &, |, !, due:, no date', () => {
    expect(q('p1')).toEqual(['plumber']);
    expect(q('milk & today')).toEqual(['oldmilk']);
    expect(q('priority:high')).toEqual(['plumber']);
    expect(q('due:today')).toEqual(['oldmilk', 'plumber']);
    expect(q('overdue')).toEqual(['oldmilk']);
    expect(q('#home')).toEqual(['plumber']);
    expect(q('@calls')).toEqual(['plumber']);
    expect(q('milk | plumber')).toEqual(['milk', 'oldmilk', 'plumber']);
    expect(q('milk !overdue')).toEqual(['milk']);
    expect(q('due:2026-11-05')).toEqual(['milk']);
    expect(q('no date')).toEqual(['l11', 'l12', 'l13']);
    expect(q('due before:2026-11-04')).toEqual(['oldmilk']);
    expect(parseQuery('a & b | c')).toEqual([['a', 'b'], ['c']]);
    expect(q('')).toEqual([]);
  });
});

describe('P-LS-37: import (Todoist, TickTick, .ics to-dos) and CSV export', () => {
  const todoist = 'TYPE,CONTENT,DESCRIPTION,PRIORITY,INDENT,AUTHOR,RESPONSIBLE,DATE,DATE_LANG,TIMEZONE\r\nsection,Kitchen,,,,,,,,\r\ntask,Paint the wall @diy,Use white,1,1,,,every month on the 1st,en,\r\ntask,"Buy brushes, two",,4,2,,,tomorrow 5pm,en,\r\nnote,Check the shop first,,,,,,,,\r\n';
  it('Todoist CSV: sections, subtasks, priorities, labels, repeats, notes', () => {
    const plan = readTodoistCsv(todoist, {project: 'Home', today: TODAY});
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[0]).toMatchObject({title: 'Paint the wall', level: 1, labels: ['diy'], notes: 'Use white', recur: {every: 'month', monthDay: 1}, due: '2026-12-01', project: 'Home', section: 'Kitchen'});
    expect(plan.tasks[1]).toMatchObject({title: 'Buy brushes, two', parentRef: plan.tasks[0]!.ref, due: '2026-11-05', time: '17:00', notes: 'Check the shop first', level: 3});
    let k = 0;
    const applied = applyImport(emptyTasks(), plan, {at, newId: kind => `${kind}_${++k}`});
    expect(applied.added).toHaveLength(2);
    expect(applied.record.projects![0]!.name).toBe('Home');
    expect(applied.record.sections![0]!.name).toBe('Kitchen');
    expect(applied.record.tasks[1]!.parentId).toBe(applied.record.tasks[0]!.id);
    expect(readTaskFile(todoist, {fileName: 'Home_Projects.csv', today: TODAY}).projects).toEqual(['Home Projects']);
  });
  it('TickTick CSV: header lines, lists, tags, priority 0/1/3/5, done ones left out, RRULE', () => {
    const csv = '"Date: 2026-11-04+0000"\n"Version: 7.1"\n"Status: \n0 Normal\n1 Completed\n2 Archived"\n"Folder Name","List Name","Title","Kind","Tags","Content","Is Check list","Start Date","Due Date","Reminder","Repeat","Priority","Status","Created Time","Completed Time","Order","Timezone","Is All Day","Is Floating","Column Name","Column Order","View Mode","taskId","parentId"\n"","Work","Send report","TEXT","work,urgent","Q3","N","","2026-11-06T09:30:00+0000","","RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=FR","5","0","","","","","false","false","Doing","","list","a1",""\n"","Inbox","Done thing","TEXT","","","N","","","","","0","2","","","","","","","","","","a2",""\n';
    const plan = readTickTickCsv(csv);
    expect(plan.tasks).toHaveLength(1);
    expect(plan.skipped.done).toBe(1);
    expect(plan.tasks[0]).toMatchObject({title: 'Send report', level: 1, labels: ['work', 'urgent'], due: '2026-11-06', time: '09:30', recur: {every: 'week', weekdays: [5]}, project: 'Work', section: 'Doing'});
  });
  it('.ics VTODO: folded lines, priority, done ones counted, events ignored', () => {
    const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Party\r\nEND:VEVENT\r\nBEGIN:VTODO\r\nUID:1\r\nSUMMARY:Renew the\r\n  passport\r\nDUE;VALUE=DATE:20261120\r\nPRIORITY:1\r\nCATEGORIES:admin,travel\r\nEND:VTODO\r\nBEGIN:VTODO\r\nSUMMARY:Old\r\nSTATUS:COMPLETED\r\nEND:VTODO\r\nEND:VCALENDAR';
    const plan = readIcsTodos(ics);
    expect(plan.tasks).toEqual([{ref: '1', title: 'Renew the passport', level: 1, due: '2026-11-20', labels: ['admin', 'travel']}]);
    expect(plan.skipped.done).toBe(1);
    expect(recurFromRrule('FREQ=MONTHLY;BYDAY=-1FR')).toEqual({every: 'month', interval: 1, nth: {n: -1, weekday: 5}});
    expect(recurFromRrule('FREQ=HOURLY')).toBeNull();
    expect(() => readTaskFile('hello', {fileName: 'x.txt', today: TODAY})).toThrow('not one ZIGoals reads');
  });
  it('the cap: an import never goes over 500', () => {
    const plan = {source: 'ics' as const, tasks: Array.from({length: 10}, (_, i) => ({ref: `${i}`, title: `T${i}`})), skipped: {done: 0, unreadable: 0, notes: 0}, projects: []};
    const full = tasksSchema.parse({version: 1, tasks: Array.from({length: MAX_TASKS - 3}, (_, i) => ({id: `x${i}`, title: 'x', priority: 'normal', createdAt: at.toISOString()}))});
    let k = 0;
    const out = applyImport(full, plan, {at, newId: kind => `${kind}_${++k}`});
    expect(out.added).toHaveLength(3); expect(out.overCap).toBe(7);
  });
  it('CSV export is spreadsheet-safe and reads back', () => {
    const r = add(emptyTasks(), '=HYPERLINK("x")', {labels: ['a'], due: TODAY, recur: {every: 'day', interval: 1}});
    const csv = tasksCsv(r), rows = readCsv(csv);
    expect(rows[1]![0]).toBe('\'=HYPERLINK("x")');
    expect(rows[1]![7]).toBe('Every day');
    expect(rows[0]).toContain('Labels');
  });
  it('the CSV and ICS readers under random input (seeded fuzz) never throw an unexpected error', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const bits = ['"', ',', '\n', '\r\n', 'TYPE', 'CONTENT', 'task', 'BEGIN:VTODO', 'END:VTODO', 'SUMMARY:', 'DUE:', '2026', 'RRULE:FREQ=WEEKLY;BYDAY=', 'MO', '﻿', '=cmd', 'List Name', 'Title', '@', '#', ' '];
    for (let i = 0; i < 1500; i++) {
      const text = Array.from({length: Math.floor(rnd() * 40)}, () => rnd() < 0.8 ? bits[Math.floor(rnd() * bits.length)] : String.fromCharCode(Math.floor(rnd() * 600))).join('');
      expect(() => readCsv(text)).not.toThrow();
      expect(() => readIcsTodos(text)).not.toThrow();
      try { const plan = readTaskFile(text, {fileName: 'f.csv', today: TODAY}); let k = 0; applyImport(emptyTasks(), plan, {at, newId: kind => `${kind}_${++k}`}); }
      catch (e) { expect((e as Error).message).toMatch(/not one ZIGoals reads|not a Todoist|not a TickTick|over 2 MB/); }
    }
  });
});

describe('P-LS-68: reminders', () => {
  it('an offset before the due time; a day-only task at 09:00; done ones never', () => {
    let r = add(emptyTasks(), 'Call mum', {due: TODAY, time: '18:00', reminders: [{before: 15}]}, 'call');
    r = add(r, 'Bins', {due: TODAY, reminders: [{before: 0}]}, 'bins');
    const list = reminderInstants(r, 'UTC');
    expect(list.map(x => new Date(x.at).toISOString())).toEqual(['2026-11-04T09:00:00.000Z', '2026-11-04T17:45:00.000Z']);
    expect(dueReminders(r, Date.parse('2026-11-04T17:50:00Z'), 'UTC').map(x => x.task.id)).toEqual(['bins', 'call']);
    expect(dueReminders(finishTask(r, 'call', at), Date.parse('2026-11-04T17:50:00Z'), 'UTC').map(x => x.task.id)).toEqual(['bins']);
  });
});

describe('P-LS-39 / P-LS-36: unreadable lists are salvaged, never dropped; the record round-trips', () => {
  it('LS-022: 1,000 injected tasks read as the first 500 (open first) with the raw kept; corrupt JSON keeps its bytes', () => {
    const many = {version: 1, tasks: Array.from({length: 1000}, (_, i) => ({id: `t${i}`, title: `Task ${i}`, priority: 'normal', createdAt: at.toISOString(), ...(i < 10 ? {doneAt: at.toISOString()} : {})})).concat([{id: 'bad', title: '', priority: 'normal', createdAt: 'x'} as never])};
    const storage = memory({[TASKS_KEY]: JSON.stringify(many)});
    expect(readTasks(storage)).toBeNull();
    const s = salvageTasks(storage)!;
    expect(s).toMatchObject({total: 1001, dropped: 1, overCap: 500});
    expect(s.readable.tasks).toHaveLength(MAX_TASKS);
    expect(s.readable.tasks.every(t => !t.doneAt)).toBe(true);
    keepSalvaged(s.readable, storage);
    expect(readTasks(storage)!.tasks).toHaveLength(MAX_TASKS);
    const broken = memory({[TASKS_KEY]: '{not json'});
    expect(salvageTasks(broken)).toMatchObject({raw: '{not json', total: 0});
    expect(broken.map.get(TASKS_KEY)).toBe('{not json');
  });
  it('serialize → parse round-trips every field (for the encrypted backup and the readable export)', () => {
    let r = addProject(emptyTasks(), {name: 'Home', colour: 'teal'}, 'p');
    r = addSection(r, 'p', 'Kitchen', 's');
    r = saveFilter(r, 'Urgent', 'p1 & today', 'f');
    r = add(r, 'Everything', {level: 2, projectId: 'p', sectionId: 's', labels: ['a', 'b'], due: TODAY, time: '10:00', recur: {every: 'week', interval: 2, weekdays: [1, 3], left: 4}, reminders: [{before: 60}], notes: 'Line 1\nLine 2', habit: 'h1', health: 'sleep', goal: 'private:g', order: 20}, 'all');
    r = add(r, 'Sub', {parentId: 'all'}, 'sub');
    r = {...r, labelColors: {a: 'red'}};
    const back = tasksSchema.parse(JSON.parse(JSON.stringify(r)));
    expect(back).toEqual(tasksSchema.parse(r));
    expect(readDeviceRecord(memory({[TASKS_KEY]: JSON.stringify(r)}), TASKS).data).toEqual(back);
  });
  it('the device writer for ZIGi/NOVA: change and complete a repeating task with an Undo that restores it', () => {
    const storage = memory();
    addOnDevice({title: 'Rent', due: TODAY, recur: {every: 'month', interval: 1, monthDay: 4}}, {storage, at, today: TODAY, id: 'rent'});
    const done = completeTask('rent', {storage, at});
    expect(readTasks(storage)!.tasks[0]!.due).toBe('2026-12-04');
    done.undo();
    expect(readTasks(storage)!.tasks[0]!.due).toBe(TODAY);
    const changed = changeTask('rent', {title: 'Pay rent', level: 1}, {storage, at});
    expect(changed.task).toMatchObject({title: 'Pay rent', level: 1, priority: 'high'});
    changed.undo();
    expect(readTasks(storage)!.tasks[0]!.title).toBe('Rent');
  });
});

describe('P-LS-42 and P-LS-05 (for lane L6): the goal card line and searchTasks on this device', () => {
  it('nextActionsSummary says how many and which is next', async () => {
    const {nextActionsSummary} = await import('./engine');
    let r = add(emptyTasks(), 'Buy running shoes', {goal: 'private:g1'}, 'shoes');
    expect(nextActionsSummary(r, 'g1', TODAY)).toBe('1 open task · Buy running shoes');
    r = add(r, 'Sign up for the 10K', {goal: 'private:g1', due: '2026-11-01'}, 'sign');
    expect(nextActionsSummary(r, 'g1', TODAY)).toBe('2 open tasks · next: Sign up for the 10K (overdue)');
    expect(nextActionsSummary(emptyTasks(), 'g1', TODAY)).toMatch(/^No next action yet/);
  });
  it('searchTasks reads this device and returns hits that open the task', async () => {
    const {searchTasks} = await import('./search');
    const storage = memory({[TASKS_KEY]: JSON.stringify(add(emptyTasks(), 'Call the plumber', {due: TODAY, level: 1}, 'plumber'))});
    expect(await searchTasks('plumber', {storage, today: TODAY})).toEqual([{id: 'plumber', title: 'Call the plumber', detail: 'Task · today · Inbox', href: '/app/tasks?task=plumber'}]);
    expect(await searchTasks('p1 & today', {storage, today: TODAY})).toHaveLength(1);
    expect(await searchTasks('p2', {storage, today: TODAY})).toEqual([]);
    expect(await searchTasks('x', {storage: memory({[TASKS_KEY]: '{bad'}), today: TODAY})).toEqual([]);
  });
});
