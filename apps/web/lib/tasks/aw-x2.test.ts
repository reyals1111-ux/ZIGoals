import {describe, expect, test} from 'vitest';
import {addProject, addTask, editTask, finishTask} from './engine';
import {dreadSign, dreadedTasks, hardestFirst} from './dread';
import {daysUnchanged, giveDay, keepOpen, longOpen, openForWords, removeLongOpen} from './long-open';
import {keepOne, pickOne, pickPool, pickTwo} from './pick';
import {dayProgress, dayProgressWords, hoursShare} from './day-progress';
import {hoursWords, monthOf, progressWords, removeTimeTarget, setTimeTarget, targetName, targetProgress, weekOf} from './time-targets';
import {STUCK_CLOSE, STUCK_GUIDE, STUCK_INTRO, stepLines} from './stuck-guide';
import {fitDay} from './layouts';
import {taskPlanSchema} from './plan-record';
import {tasksSchema, type Tasks} from './schema';
import type {FocusSessions} from '../focus-sessions/schema';

/** Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin): the pure parts of the stuck-task tools. Fictional data. */
const TODAY = '2026-11-25', at = new Date('2026-11-20T09:00:00Z');
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: TODAY, allowPast: true});
const empty = (): Tasks => ({version: 1, tasks: []});
const day = (iso: string) => iso.slice(0, 10);

describe('#432 dread: a mark the person sets, and Hardest first', () => {
  const r = tasksSchema.parse({version: 1, tasks: [
    {id: 'a', title: 'Fictional email', priority: 'normal', due: TODAY, createdAt: at.toISOString()},
    {id: 'b', title: 'Fictional tax form', priority: 'normal', due: TODAY, createdAt: at.toISOString(), dread: 3},
    {id: 'c', title: 'Fictional call', priority: 'normal', due: TODAY, createdAt: at.toISOString(), dread: 1},
    {id: 'd', title: 'Fictional letter', priority: 'normal', createdAt: at.toISOString(), dread: 2, doneAt: at.toISOString()},
  ]});
  test('the sign is calm words; nothing when not set', () => {
    expect(dreadSign(r.tasks[1]!)).toBe('Dreading · a lot');
    expect(dreadSign(r.tasks[0]!)).toBeNull();
  });
  test('Hardest first is a stable order, most dreaded first; with no mark nothing moves', () => {
    expect(hardestFirst(r.tasks.slice(0, 3)).map(t => t.id)).toEqual(['b', 'c', 'a']);
    expect(hardestFirst([r.tasks[0]!]).map(t => t.id)).toEqual(['a']);
    expect(dreadedTasks(r).map(t => t.id)).toEqual(['b', 'c']);
  });
  test('the most dreaded task takes the day’s first free time in Fit my day', () => {
    const placed = fitDay(hardestFirst(r.tasks.slice(0, 3)), [], {from: '09:00', until: '18:00'}).placed;
    expect(placed[0]).toMatchObject({start: '09:00'});
    expect(placed[0]!.task.id).toBe('b');
  });
});

describe('#434 open for a long time, with Keep, Give it a day and Remove', () => {
  let r = add(add(add(empty(), 'old', {title: 'Fictional shed'}), 'new', {title: 'Fictional stamps'}), 'rep', {title: 'Fictional bins', due: '2026-09-01', recur: {every: 'week', interval: 1}});
  r = tasksSchema.parse({...r, tasks: r.tasks.map(t => t.id === 'new' ? t : {...t, createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-08-01T09:00:00.000Z'})});
  test('only one-off top-level tasks unchanged for the days chosen, oldest first; a repeat never', () => {
    expect(longOpen(r, TODAY, 60, day).items.map(t => t.id)).toEqual(['old']);
    expect(longOpen(r, TODAY, 90, day).items.map(t => t.id)).toEqual(['old']);
    expect(longOpen(r, '2026-10-15', 90, day).items).toEqual([]);
    expect(daysUnchanged(r.tasks.find(t => t.id === 'old')!, TODAY, day)).toBe(116);
    expect(openForWords(116)).toBe('Unchanged for about 4 months');
    expect(openForWords(64)).toBe('Unchanged for 64 days');
  });
  test('Keep touches its last change only; Give it a day plans it; Remove takes it away', () => {
    const kept = keepOpen(r, 'old', TODAY, new Date(`${TODAY}T10:00:00Z`));
    expect(longOpen(kept, TODAY, 60, day).items).toEqual([]);
    expect(longOpen(kept, '2027-01-25', 60, day).items.map(t => t.id)).toEqual(['new', 'old']);
    const {updatedAt: _a, ...before} = r.tasks.find(t => t.id === 'old')!, {updatedAt: _b, ...after} = kept.tasks.find(t => t.id === 'old')!;
    void _a; void _b;
    expect(after).toEqual(before);
    expect(giveDay(r, 'old', '2026-11-28', TODAY).tasks.find(t => t.id === 'old')!.due).toBe('2026-11-28');
    expect(() => giveDay(r, 'old', '2026-11-01', TODAY)).toThrow();
    expect(removeLongOpen(r, 'old').tasks.some(t => t.id === 'old')).toBe(false);
  });
});

describe('#435 pick one for me, and This or that', () => {
  let r = addProject(empty(), {name: 'Fictional house'}, 'p_house');
  r = add(add(add(add(r, 'a', {title: 'A', due: TODAY}), 'b', {title: 'B', due: '2026-11-20'}), 'c', {title: 'C', due: '2026-12-01', projectId: 'p_house'}), 'd', {title: 'D', labels: ['calls']});
  r = add(r, 'sub', {title: 'Sub', due: TODAY, parentId: 'a'});
  test('today’s pool is planned for today or earlier (and My Day’s picks); subtasks and done tasks are left out', () => {
    expect(pickPool(r, TODAY, {kind: 'today'}).map(t => t.id).sort()).toEqual(['a', 'b']);
    expect(pickPool(r, TODAY, {kind: 'today'}, new Set(['d'])).map(t => t.id).sort()).toEqual(['a', 'b', 'd']);
    expect(pickPool(r, TODAY, {kind: 'project', id: 'p_house'}).map(t => t.id)).toEqual(['c']);
    expect(pickPool(r, TODAY, {kind: 'label', name: 'calls'}).map(t => t.id)).toEqual(['d']);
    const done = finishTask(r, 'a', new Date(`${TODAY}T10:00:00Z`));
    expect(pickPool(done, TODAY, {kind: 'today'}).map(t => t.id)).toEqual(['b']);
  });
  test('Another never offers the one on show, and goes round every task before repeating; it changes nothing', () => {
    const pool = pickPool(r, TODAY, {kind: 'today'}), first = pickOne(pool, new Set(), 0)!;
    const second = pickOne(pool, new Set([first.id]), 0, first.id)!;
    expect(second.id).not.toBe(first.id);
    expect(pickOne(pool, new Set(pool.map(t => t.id)), 0.99, second.id)!.id).toBe(first.id);
    expect(pickOne([], new Set(), 0.5)).toBeNull();
    expect(pickOne([pool[0]!], new Set([pool[0]!.id]), 0.5, pool[0]!.id)!.id).toBe(pool[0]!.id);
  });
  test('This or that keeps the one chosen against the next until one is left', () => {
    const pool = [...pickPool(r, TODAY, {kind: 'today'}, new Set(['d']))];
    const two = pickTwo(pool, new Set(), [0, 0]);
    expect(new Set(two.map(t => t.id)).size).toBe(2);
    const seen = new Set(two.map(t => t.id)), next = keepOne(pool, seen, two[0]!, 0)!;
    expect(seen.has(next.id)).toBe(false);
    expect(keepOne(pool, new Set([...seen, next.id]), two[0]!, 0)).toBeNull();
  });
});

describe('#436 today’s progress and where the day is, side by side, never “behind”', () => {
  let r = add(add(add(add(empty(), 'a', {title: 'A', due: TODAY}), 'b', {title: 'B', due: TODAY}), 'c', {title: 'C', due: '2026-11-24'}), 'z', {title: 'Z', due: '2026-11-30'});
  r = finishTask(r, 'a', new Date(`${TODAY}T10:00:00Z`));
  test('done today against today’s tasks; nothing before the first planned task', () => {
    expect(dayProgress(r, TODAY, '13:30', [{from: '09:00', to: '18:00'}], day)).toEqual({done: 1, total: 3, share: 50, hours: 'during'});
    expect(dayProgress(add(empty(), 'x', {title: 'X'}), TODAY, '10:00', [{from: '09:00', to: '18:00'}], day)).toBeNull();
  });
  test('the hours: before, during (a lunch break does not count), after, and a day off', () => {
    expect(hoursShare([{from: '09:00', to: '12:00'}, {from: '13:00', to: '17:00'}], '12:30')).toEqual({share: 43, hours: 'during'});
    expect(hoursShare([{from: '09:00', to: '18:00'}], '07:00')).toEqual({share: 0, hours: 'before', starts: '09:00'});
    expect(hoursShare([{from: '09:00', to: '18:00'}], '19:00')).toEqual({share: 100, hours: 'after'});
    expect(hoursShare([], '12:00')).toEqual({share: null, hours: 'off'});
  });
  test('the words are two facts and never a judgement', () => {
    const w = dayProgressWords({done: 4, total: 7, share: 60, hours: 'during'});
    expect(w).toEqual({tasks: '4 of 7 of today’s tasks done', hours: 'the day is 60 % through'});
    expect(dayProgressWords({done: 3, total: 3, share: 100, hours: 'after'}).tasks).toBe('All 3 of today’s tasks done');
    for (const p of [{done: 0, total: 9, share: 95, hours: 'during' as const}, {done: 1, total: 2, share: null, hours: 'off' as const}]) expect(JSON.stringify(dayProgressWords(p))).not.toMatch(/behind|late|only|should|track/i);
  });
});

describe('#437 time targets met from the dated focus blocks of a project’s, an area’s or a label’s tasks', () => {
  let r = addProject(empty(), {name: 'Fictional book'}, 'p_book');
  r = tasksSchema.parse({...r, areas: [{id: 'area_work', name: 'Fictional work', order: 0}], projects: r.projects!.map(p => ({...p, areaId: 'area_work'}))});
  r = add(add(add(r, 'w', {title: 'Chapter one', projectId: 'p_book', labels: ['writing']}), 's', {title: 'Outline', parentId: 'w'}), 'o', {title: 'Other', labels: ['calls']});
  const block = (id: string, dayOn: string, taskId: string, minutes: number) => ({id: `focus_${id}-aaaaaaaa`, startedAt: `${dayOn}T09:00:00.000Z`, endedAt: `${dayOn}T09:30:00.000Z`, day: dayOn, plannedMinutes: 25, focusedSeconds: minutes * 60, awaySeconds: 0, outcome: 'grown' as const, taskId});
  const focus: FocusSessions = {version: 1, sessions: [block('1', '2026-11-23', 'w', 25), block('2', '2026-11-24', 's', 50), block('3', '2026-11-22', 'w', 40), block('4', '2026-11-25', 'o', 30)]};
  let plan = taskPlanSchema.parse({version: 1});
  plan = setTimeTarget(plan, {kind: 'label', of: 'writing', minutes: 300, per: 'week'}, 'tt_w');
  plan = setTimeTarget(plan, {kind: 'project', of: 'p_book', minutes: 600, per: 'month'}, 'tt_p');
  plan = setTimeTarget(plan, {kind: 'area', of: 'area_work', minutes: 60, per: 'week'}, 'tt_a');
  test('the week is Monday to Sunday; the month its own days', () => {
    expect(weekOf(TODAY)).toEqual({from: '2026-11-23', to: '2026-11-29'});
    expect(monthOf('2026-02-10')).toEqual({from: '2026-02-01', to: '2026-02-28'});
  });
  test('a label counts its own tasks; a project and an area also a subtask through its parent', () => {
    const [w, p, a] = plan.timeTargets!.map(t => targetProgress(t, r, focus, TODAY));
    expect(w!.spent).toBe(25); // only the labelled task, this week (Sunday's block is last week's)
    expect(p!.spent).toBe(115); // this month, the subtask's block too
    expect(a!.spent).toBe(75);
    expect(progressWords(w!)).toBe('25 min of 5 h this week');
    expect(progressWords(a!)).toBe('1 h 15 of 1 h this week: reached');
    expect(progressWords({spent: 0, target: plan.timeTargets![0]!})).toBe('Nothing yet of 5 h this week');
    expect(targetProgress(plan.timeTargets![0]!, r, null, TODAY).spent).toBe(0);
  });
  test('the same project, area or label keeps one target; limits are said plainly; Remove leaves no empty list', () => {
    const again = setTimeTarget(plan, {kind: 'label', of: 'writing', minutes: 240, per: 'week'}, 'tt_x');
    expect(again.timeTargets!.length).toBe(3);
    expect(again.timeTargets!.find(t => t.of === 'writing')).toMatchObject({id: 'tt_w', minutes: 240});
    expect(() => setTimeTarget(plan, {kind: 'label', of: 'x', minutes: 20_000, per: 'week'}, 'tt_y')).toThrow(/168 hours/);
    expect(removeTimeTarget(removeTimeTarget(removeTimeTarget(plan, 'tt_w'), 'tt_p'), 'tt_a').timeTargets).toBeUndefined();
    expect(targetName({kind: 'project', of: 'gone'}, r)).toBeNull();
    expect([hoursWords(190), hoursWords(45), hoursWords(300)]).toEqual(['3 h 10', '45 min', '5 h']);
  });
});

describe('#448 the stuck-task guide: four questions, a strategy each, in English and Dutch', () => {
  test('every answer has its question, strategy and action in both languages, and nothing promises', () => {
    expect(STUCK_GUIDE.map(a => a.id)).toEqual(['big', 'unclear', 'dread', 'time']);
    expect(new Set(STUCK_GUIDE.map(a => a.action))).toEqual(new Set(['steps', 'first-step', 'focus', 'day']));
    for (const a of STUCK_GUIDE) {
      expect(a.question.en.endsWith('?') && a.question.nl.endsWith('?')).toBe(true);
      expect(a.strategy.en.length).toBe(a.strategy.nl.length);
      for (const line of [...a.strategy.en, ...a.strategy.nl, a.actionLabel.en, a.actionLabel.nl]) expect(line.trim().length).toBeGreaterThan(5);
    }
    const all = JSON.stringify([STUCK_GUIDE, STUCK_INTRO, STUCK_CLOSE]);
    expect(all).not.toMatch(/guarantee|will make you|cure|diagnos|anxiety disorder|garantie/i);
    expect(STUCK_GUIDE.flatMap(a => a.strategy.nl).join(' ').replace(/“[^”]*”/g, '')).not.toMatch(/\b(?:the|your|and|with)\b/);
  });
  test('steps typed one per line: bullets and numbers dropped, blanks ignored, capped', () => {
    expect(stepLines('- Open the file\n\n2) Write one line\n• Send it\n')).toEqual(['Open the file', 'Write one line', 'Send it']);
    expect(stepLines(Array.from({length: 12}, (_, i) => `Step ${i}`).join('\n')).length).toBe(8);
  });
  test('the guide’s day change counts as a move only when it puts the task off', () => {
    const r = editTask(add(empty(), 't', {title: 'Fictional tax form', due: TODAY}), 't', {due: '2026-11-28'}, TODAY);
    expect(r.tasks[0]!.moved).toBe(1);
  });
});

describe('#432, #433 found by the Tasks filter', () => {
  test('is:dreaded, dread:3 and is:moved', async () => {
    const {matchTasks} = await import('./search');
    const r = tasksSchema.parse({version: 1, tasks: [
      {id: 'a', title: 'Fictional email', priority: 'normal', createdAt: at.toISOString(), moved: 3},
      {id: 'b', title: 'Fictional tax form', priority: 'normal', createdAt: at.toISOString(), dread: 3},
      {id: 'c', title: 'Fictional call', priority: 'normal', createdAt: at.toISOString(), dread: 1, moved: 1},
    ]});
    const ids = (q: string) => matchTasks(r, q, {today: TODAY}).map(t => t.id);
    expect(ids('is:dreaded')).toEqual(['b', 'c']);
    expect(ids('dread:3')).toEqual(['b']);
    expect(ids('is:moved')).toEqual(['a']);
    expect(ids('dreaded')).toEqual([]);
  });
});
