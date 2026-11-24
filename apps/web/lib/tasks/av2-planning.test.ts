import {describe, expect, it} from 'vitest';
import {addTask, viewTasks} from './engine';
import {emptyTasks, tasksSchema, TASKS, TASKS_KEY, type Tasks} from './schema';
import {dayLoad} from './minutes';
import {
  addArea, addComment, addObjective, addSpent, archiveSection, carryObjectives, chartSeries, commentParts, dayColumns, finishObjective, fitDay, inArea, linkObjective,
  monthGrid, nextFreeSlot, objectiveProgress, overLimit, plannedVsActual, projectsByArea, removeArea, removeObjective, setProjectArea, setTaskExtras, startsEarlyBy, tableRows,
  taskBusy, timelineBars, weekObjectives, weekStart, yearGrid,
} from './layouts';
import {TASK_PLAN, emptyTaskPlan, finishesByDay, goalStreak, harvestDoneLog, setPlanPrefs, startTimer, stopTimer, tidyTimers, timerMinutes} from './plan-record';
import {BUILT_IN_TEMPLATES, TASK_TEMPLATES, applyTemplate, emptyTaskTemplates, saveTemplate, templateFromProject} from './templates';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';
import {taskAgendaItems} from '../agenda/time-items';
import {addProject, addSection} from './engine';

/** Session AV lane 2 (tasks, LEDGER #7–#10, #12–#14, #17, #20–#30): planning and layouts. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z'), doneDay = (iso: string) => iso.slice(0, 10);
let seq = 0;
const ids = () => `x${++seq}`;
const add = (r: Tasks, input: Parameters<typeof addTask>[1], id: string) => addTask(r, input, {id, at, today, allowPast: true});

describe('Plan my day around the Agenda and the next free slot (LEDGER #21, #24)', () => {
  it('places untimed tasks between fixed items, each for its minutes; a background task takes no slot', () => {
    let r = add(emptyTasks(), {title: 'Fictional standup', due: today, time: '10:00', minutes: 30}, 'm');
    r = add(r, {title: 'Write', due: today, minutes: 60}, 'w');
    r = add(r, {title: 'Email', due: today}, 'e');
    r = add(r, {title: 'Laundry', due: today, minutes: 90}, 'l');
    r = setTaskExtras(r, 'l', {parallel: true}, at);
    const busy = [...taskBusy(r, today), {start: 11 * 60, end: 12 * 60, title: 'Fictional event'}];
    const fit = fitDay(viewTasks(r, {kind: 'today'}, today), busy, {from: '09:05', until: '13:00'});
    expect(fit.placed.map(p => [p.task.id, p.start, p.end])).toEqual([['e', '09:15', '09:45'], ['w', '12:00', '13:00']]);
    expect(fit.left).toEqual([]);
    expect(nextFreeSlot(30, busy, '10:10', '18:00')).toBe('10:30');
    expect(nextFreeSlot(120, busy, '10:10', '12:30')).toBeNull();
  });
  it('the Agenda draws a timed task until its own minutes end (30 without)', () => {
    let r = add(emptyTasks(), {title: 'Long', due: today, time: '09:00', minutes: 90}, 'a');
    r = add(r, {title: 'Short', due: today, time: '11:00'}, 'b');
    expect(taskAgendaItems(r, today, today, today, doneDay).map(i => i.minutes)).toEqual([90, 30]);
  });
});

describe('Workload, timers, planned vs actual, background tasks (LEDGER #25–#27)', () => {
  it('warns past the day limit; a background task adds no minutes', () => {
    expect(overLimit(300, 240)).toEqual({over: true, by: 60});
    expect(overLimit(200, 240).over).toBe(false);
    let r = add(emptyTasks(), {title: 'A', due: today, minutes: 60}, 'a');
    r = setTaskExtras(add(r, {title: 'B', due: today, minutes: 120}, 'b'), 'b', {parallel: true}, at);
    expect(dayLoad(r, today)).toEqual({tasks: 2, timed: 1, minutes: 60});
  });
  it('runs several timers at once and adds the minutes to the task', () => {
    let plan = startTimer(startTimer(emptyTaskPlan(), 'a', 0), 'b', 60_000);
    expect(plan.timers).toHaveLength(2);
    const stopped = stopTimer(plan, 'a', 25 * 60_000);
    expect(stopped.minutes).toBe(25);
    plan = stopped.plan;
    expect(plan.timers!.map(t => t.taskId)).toEqual(['b']);
    expect(timerMinutes(0, 10_000)).toBe(1);
    let r = add(emptyTasks(), {title: 'A', due: today, minutes: 30}, 'a');
    r = addSpent(addSpent(r, 'a', 25), 'a', 10);
    expect(r.tasks[0]!.spent).toBe(35);
    expect(plannedVsActual(r.tasks)).toEqual({planned: 30, actual: 35, withBoth: 1});
    expect(tidyTimers(plan, emptyTasks()).timers).toBeUndefined();
  });
});

describe('Week objectives (LEDGER #22, #23)', () => {
  it('adds, links, finishes, carries and removes; a removed objective leaves its tasks', () => {
    let r = add(emptyTasks(), {title: 'Draft', due: today}, 't');
    r = addObjective(r, {week: '2026-11-25', title: 'Finish the fictional report'}, 'o1');
    expect(weekObjectives(r, weekStart(today)).map(o => o.week)).toEqual(['2026-11-23']);
    r = linkObjective(r, 't', 'o1');
    expect(objectiveProgress(r, 'o1')).toMatchObject({done: 0});
    r = carryObjectives(r, today, ids);
    expect(weekObjectives(r, '2026-11-30').map(o => o.title)).toEqual(['Finish the fictional report']);
    r = finishObjective(r, 'o1', true, at);
    expect(r.objectives!.find(o => o.id === 'o1')!.doneAt).toBe(at.toISOString());
    r = removeObjective(r, 'o1');
    expect(r.tasks[0]!.objective).toBeUndefined();
    expect(() => addObjective(r, {week: today, title: ' '}, 'o3')).toThrow();
  });
});

describe('Daily goal and streak, finishes kept past 30 days (LEDGER #9, #13)', () => {
  it('counts finishes into the log up to yesterday, once, and reads the streak', () => {
    const r = tasksSchema.parse({version: 1, tasks: [
      {id: 'a', title: 'a', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-11-21T10:00:00.000Z'},
      {id: 'b', title: 'b', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-11-22T10:00:00.000Z'},
      {id: 'c', title: 'c', priority: 'normal', createdAt: at.toISOString(), doneAt: '2026-11-23T07:00:00.000Z'},
    ]});
    const plan = harvestDoneLog(emptyTaskPlan(), r, today, doneDay);
    expect(plan.doneLog).toEqual({through: '2026-11-22', days: {'2026-11-21': 1, '2026-11-22': 1}});
    expect(harvestDoneLog(plan, r, today, doneDay)).toBe(plan);
    // After the tasks leave the list, the log keeps the days.
    const later = finishesByDay(plan, emptyTasks(), doneDay);
    expect([...later]).toEqual([['2026-11-21', 1], ['2026-11-22', 1]]);
    const by = finishesByDay(plan, r, doneDay);
    expect(goalStreak(by, 1, today)).toEqual({current: 3, best: 3, today: 1, reached: true});
    expect(goalStreak(by, 2, today).current).toBe(0);
    expect(setPlanPrefs(emptyTaskPlan(), {dailyGoal: 3, dayLimit: 240}).dailyGoal).toBe(3);
  });
  it('the year as 53 weeks with levels', () => {
    const y = yearGrid(new Map([['2026-11-20', 2], ['2026-11-21', 8]]), today);
    expect(y.weeks).toHaveLength(53);
    expect([y.total, y.activeDays, y.max]).toEqual([10, 2, 8]);
    expect(y.weeks.flat().find(d => d.day === '2026-11-21')!.level).toBe(4);
  });
});

describe('Layouts: table, 3 days, month, timeline, chart (LEDGER #7, #12, #13, #29, #30)', () => {
  let r = addProject(emptyTasks(), {name: 'Fictional move'}, 'p1');
  r = add(r, {title: 'Boxes', due: '2026-11-24', projectId: 'p1', level: 1, minutes: 30}, 'a');
  r = add(r, {title: 'Keys', due: '2026-11-25', time: '10:00', deadline: '2026-11-28', projectId: 'p1'}, 'b');
  r = add(r, {title: 'Call', due: '2026-11-20', labels: ['calls']}, 'c');
  it('sorts the table by any column, created and changed included', () => {
    expect(tableRows(r, today, 'priority', 'asc').map(t => t.id)[0]).toBe('a');
    expect(tableRows(r, today, 'due', 'desc').map(t => t.id)).toEqual(['b', 'a', 'c']);
    expect(tableRows(r, today, 'title', 'asc', 'p1').map(t => t.id)).toEqual(['a', 'b']);
    expect(tableRows(r, today, 'created', 'asc')).toHaveLength(3);
  });
  it('3 days put overdue ones on today; the month grid has whole weeks', () => {
    const cols = dayColumns(r, today, today, 3);
    expect(cols.map(c => [c.day, [...c.timed, ...c.allDay].map(t => t.id)])).toEqual([['2026-11-23', ['c']], ['2026-11-24', ['a']], ['2026-11-25', ['b']]]);
    const month = monthGrid(r, '2026-11', doneDay, 'p1');
    expect(month[0]![0]!.day).toBe('2026-10-26');
    expect(month.every(w => w.length === 7)).toBe(true);
    expect(month.flat().find(d => d.day === '2026-11-25')!.tasks.map(t => t.id)).toEqual(['b']);
  });
  it('the timeline runs from the day to the deadline', () => {
    const t = timelineBars(r, today, 'p1');
    expect(t.bars.map(b => [b.task.id, b.start, b.end])).toEqual([['a', '2026-11-24', '2026-11-24'], ['b', '2026-11-25', '2026-11-28']]);
  });
  it('a chart from your lists', () => {
    expect(chartSeries(r, 'project', 'open', {today, byDay: new Map(), doneDay})).toEqual([{label: 'Fictional move', value: 2}, {label: 'Inbox', value: 1}]);
    expect(chartSeries(r, 'week', 'done', {today, byDay: new Map([['2026-11-23', 3]]), doneDay}).at(-1)).toEqual({label: '2026-11-23', value: 3});
    expect(chartSeries(r, 'label', 'open', {today, byDay: new Map(), doneDay})[0]).toEqual({label: '(no label)', value: 2});
  });
});

describe('Areas, sections, start early, comments (LEDGER #8, #12, #17, #20, #28)', () => {
  it('areas group projects and narrow tasks; removing one keeps its projects', () => {
    let r = addProject(addProject(emptyTasks(), {name: 'Job'}, 'p1'), {name: 'House'}, 'p2');
    r = addArea(r, 'Work', 'a1');
    r = setProjectArea(r, 'p1', 'a1');
    expect(projectsByArea(r).map(g => [g.area?.name ?? null, g.projects.map(p => p.id)])).toEqual([['Work', ['p1']], [null, ['p2']]]);
    expect(inArea(r, {projectId: 'p1'}, 'a1')).toBe(true);
    expect(() => addArea(r, 'work', 'a2')).toThrow();
    r = removeArea(r, 'a1');
    expect(r.projects!.find(p => p.id === 'p1')!.areaId).toBeUndefined();
    r = archiveSection(addSection(r, 'p1', 'Done part', 's1'), 's1', true);
    expect(r.sections![0]!.archived).toBe(true);
  });
  it('start early shows a task in Today that many days before its day', () => {
    let r = add(emptyTasks(), {title: 'Pack', due: '2026-11-26'}, 'p');
    expect(viewTasks(r, {kind: 'today'}, today).map(t => t.id)).toEqual([]);
    r = setTaskExtras(r, 'p', {early: 3}, at);
    expect(viewTasks(r, {kind: 'today'}, today).map(t => t.id)).toEqual(['p']);
    expect(startsEarlyBy(r.tasks[0]!, today)).toBe(true);
    expect(() => setTaskExtras(r, 'p', {early: 90}, at)).toThrow();
  });
  it('comments keep text and open only web links', () => {
    const r = addComment(add(emptyTasks(), {title: 'A'}, 'a'), 'a', 'See https://example.com/x and javascript:alert(1)', {id: 'c1', at});
    expect(r.tasks[0]!.comments).toEqual([{id: 'c1', at: at.toISOString(), text: 'See https://example.com/x and javascript:alert(1)'}]);
    expect(commentParts(r.tasks[0]!.comments![0]!.text).filter(p => p.href).map(p => p.href)).toEqual(['https://example.com/x']);
  });
});

describe('Templates (LEDGER #10, #17)', () => {
  it('a built-in template makes a project with sections, subtasks and days from the start day', () => {
    const moving = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-moving')!;
    const {record, projectId} = applyTemplate(emptyTasks(), moving, {start: today, today, at, ids});
    const mine = record.tasks.filter(t => t.projectId === projectId);
    expect(mine).toHaveLength(moving.items.length);
    expect(record.sections!.filter(s => s.projectId === projectId).map(s => s.name)).toEqual(['Six weeks before', 'A month before', 'Two weeks before', 'Moving day']);
    expect(mine.find(t => t.title === 'Hand over the keys')!.due).toBe('2027-01-04');
    expect(mine.filter(t => t.parentId)).toHaveLength(3);
  });
  it('a project saved as a template and used again keeps its order, sections and spacing', () => {
    let r = addSection(addProject(emptyTasks(), {name: 'Fictional trip'}, 'p'), 'p', 'Before', 's');
    r = add(r, {title: 'Book', due: '2026-12-01', projectId: 'p', sectionId: 's', minutes: 20}, 'a');
    r = add(r, {title: 'Go', due: '2026-12-08', projectId: 'p', level: 1}, 'b');
    const t = templateFromProject(r, 'p', {id: 't1', at});
    expect(t.items).toEqual([{title: 'Book', section: 'Before', offset: 0, minutes: 20}, {title: 'Go', offset: 7, level: 1}]);
    const store = saveTemplate(emptyTaskTemplates(), t);
    const again = applyTemplate(r, store.items[0]!, {start: '2027-03-01', today, at, ids});
    expect(again.record.tasks.filter(x => x.projectId === again.projectId).map(x => x.due)).toEqual(['2027-03-01', '2027-03-08']);
  });
});

describe('Export, erase and restore keep every new field (TIER 3 stored formats)', () => {
  it('the task list\'s new fields and the two new records round-trip', async () => {
    let r = addArea(addProject(emptyTasks(), {name: 'P'}, 'p'), 'Work', 'a1');
    r = setProjectArea(r, 'p', 'a1');
    r = add(r, {title: 'A', due: today, projectId: 'p', reminders: [{before: 0, at: '2026-11-23T20:00'}]}, 't');
    r = addComment(addSpent(setTaskExtras(r, 't', {early: 2, parallel: true}, at), 't', 15), 't', 'note', {id: 'c', at});
    r = linkObjective(addObjective(r, {week: today, title: 'O'}, 'o'), 't', 'o');
    r = archiveSection(addSection(r, 'p', 'S', 's'), 's', true);
    const plan = setPlanPrefs(harvestDoneLog(startTimer(emptyTaskPlan(), 't', 5), r, today, doneDay), {defaultReminder: 15, dayLimit: 240, dailyGoal: 3});
    const templates = saveTemplate(emptyTaskTemplates(), templateFromProject(r, 'p', {id: 'tp', at}));
    const m = new Map<string, string>([[TASKS_KEY, JSON.stringify(r)], [TASK_PLAN.key, JSON.stringify(plan)], [TASK_TEMPLATES.key, JSON.stringify(templates)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage);
    const exported = {tasks: texts[TASKS_KEY]!, plan: storage.getItem(TASK_PLAN.key)!, templates: storage.getItem(TASK_TEMPLATES.key)!};
    storage.clear();
    expect(readDeviceRecord(storage, TASKS).data.tasks).toEqual([]);
    storage.setItem(TASKS_KEY, exported.tasks); storage.setItem(TASK_PLAN.key, exported.plan); storage.setItem(TASK_TEMPLATES.key, exported.templates);
    const back = readDeviceRecord(storage, TASKS).data, task = back.tasks.find(t => t.id === 't')!;
    expect([task.reminders, task.early, task.parallel, task.spent, task.objective, task.comments?.length]).toEqual([[{before: 0, at: '2026-11-23T20:00'}], 2, true, 15, 'o', 1]);
    expect([back.areas, back.projects![0]!.areaId, back.sections![0]!.archived, back.objectives!.map(o => o.id)]).toEqual([[{id: 'a1', name: 'Work', order: 0}], 'a1', true, ['o']]);
    expect(readDeviceRecord(storage, TASK_PLAN).data).toEqual(plan);
    expect(readDeviceRecord(storage, TASK_TEMPLATES).data).toEqual(templates);
  });
});
