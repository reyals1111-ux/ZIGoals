import {describe, expect, test} from 'vitest';
import {addTask, editMany, editTask, finishTask, oneOfEachGroup, orderAhead, setAside, taskCounts, viewTasks, waitsTurn} from './engine';
import {holdProject, markReviewed, nextInOrder, nextReview, projectTasks, projectsToReview, resumeProject, setProjectInOrder, setReview} from './project-states';
import {groupLabels, removeLabelGroup, setLabelGroup, tasksWithSeveral} from './label-groups';
import {repeatRecord, recordWords} from './repeat-record';
import {describeRecur, firstDue, fromEndWeekday, nextOccurrence, olderDay, workdayOf} from './recurrence';
import {parseTaskLine} from './parse';
import {planSuggestions} from './plan-day';
import {weekCandidates} from './plan-week';
import {focusName, focusedRecord, inFocus, liveFocus} from './focus';
import {undoOfChange} from './undo';
import {matchTasks} from './search';
import {tasksSchema, type Tasks} from './schema';

/** Session AV lane 2 (r6-plan, LEDGER #391–#398; OmniFocus, Capacities): the pure parts of round 6's planning rows. */
const TODAY = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const base = (): Tasks => tasksSchema.parse({version: 1, projects: [
  {id: 'p_house', name: 'Fictional house', colour: 'teal', order: 0},
  {id: 'p_party', name: 'Fictional party', colour: 'blue', order: 1, areaId: 'area_home'},
  {id: 'p_work', name: 'Fictional work', colour: 'grey', order: 2, areaId: 'area_work'},
], areas: [{id: 'area_home', name: 'Home', order: 0}, {id: 'area_work', name: 'Work', order: 1}], tasks: []});
const add = (r: Tasks, id: string, input: Parameters<typeof addTask>[1]) => addTask(r, input, {id, at, today: TODAY, allowPast: true});
const titles = (list: {title: string}[]) => list.map(t => t.title);

describe('a project on hold (LEDGER #392)', () => {
  const r0 = add(add(add(base(), 'a', {title: 'Fictional gutters', due: TODAY, projectId: 'p_house', reminders: [{before: 0}]}), 'b', {title: 'Fictional paint', due: '2026-11-20', projectId: 'p_house'}), 'c', {title: 'Fictional cake', due: TODAY, projectId: 'p_party'});
  const held = holdProject(r0, 'p_house', TODAY, '2026-12-07');
  test('its tasks leave Today, Upcoming, Overdue, the matrix and the counts; they stay in the project and All open', () => {
    expect(titles(viewTasks(held, {kind: 'today'}, TODAY))).toEqual(['Fictional cake']);
    expect(titles(viewTasks(held, {kind: 'upcoming'}, TODAY))).toEqual(['Fictional cake']);
    expect(viewTasks(held, {kind: 'overdue'}, TODAY)).toEqual([]);
    expect(titles(viewTasks(held, {kind: 'matrix'}, TODAY))).toEqual(['Fictional cake']);
    expect(titles(viewTasks(held, {kind: 'project', id: 'p_house'}, TODAY)).sort()).toEqual(['Fictional gutters', 'Fictional paint']);
    expect(viewTasks(held, {kind: 'all'}, TODAY)).toHaveLength(3);
    expect(taskCounts(held, TODAY, '09:00')).toEqual({open: 3, overdue: 0, today: 1});
  });
  test('the plans leave its tasks out; they come back by themselves on the resume day', () => {
    expect(planSuggestions(held, TODAY).map(s => s.task.id)).not.toContain('b');
    expect(planSuggestions(r0, TODAY).map(s => s.task.id)).toContain('b');
    expect(titles(viewTasks(held, {kind: 'today'}, '2026-12-07'))).toContain('Fictional gutters');
    expect(titles(viewTasks(resumeProject(held, 'p_house'), {kind: 'today'}, TODAY))).toContain('Fictional gutters');
    expect(() => holdProject(r0, 'p_house', TODAY, TODAY)).toThrow(/after today/);
    expect(holdProject(r0, 'p_house', TODAY).projects![0]!.hold).toEqual({since: TODAY});
    // Session AV lane 2 (review B6M-9, deliberate): the word is now the prefixed is:hold, so a title with “hold” still matches.
    expect(matchTasks(held, 'is:hold', {today: TODAY}).map(t => t.id).sort()).toEqual(['a', 'b']);
  });
  test('Plan my week leaves a held project’s tasks out', () => {
    const r = add(base(), 'x', {title: 'Fictional sort', projectId: 'p_house', minutes: 60});
    expect(weekCandidates(r, TODAY, '09:00').map(t => t.id)).toEqual(['x']);
    expect(weekCandidates(holdProject(r, 'p_house', TODAY), TODAY, '09:00')).toEqual([]);
  });
});

describe('a project and a task in order (LEDGER #393)', () => {
  let r = add(add(add(add(base(), 'v', {title: 'Fictional venue', due: TODAY, projectId: 'p_party', order: 10}), 'i', {title: 'Fictional invitations', due: TODAY, projectId: 'p_party', order: 20}), 'm', {title: 'Fictional music', due: '2026-11-25', projectId: 'p_party', order: 30}), 'w', {title: 'Fictional water plants', due: TODAY, projectId: 'p_party', recur: {every: 'week', interval: 1}, order: 5});
  r = setProjectInOrder(r, 'p_party', true);
  test('only the first open task is in Today, Upcoming and the matrix; the others wait after it; a repeat never waits', () => {
    expect(titles(viewTasks(r, {kind: 'today'}, TODAY)).sort()).toEqual(['Fictional venue', 'Fictional water plants']);
    expect(titles(viewTasks(r, {kind: 'upcoming'}, TODAY)).sort()).toEqual(['Fictional venue', 'Fictional water plants']);
    expect(waitsTurn(r, r.tasks.find(t => t.id === 'm')!)?.title).toBe('Fictional venue');
    expect(nextInOrder(r, 'p_party')?.title).toBe('Fictional venue');
    expect(viewTasks(r, {kind: 'project', id: 'p_party'}, TODAY)).toHaveLength(4);
  });
  test('finishing one brings the next forward', () => {
    const done = finishTask(r, 'v', at, {today: TODAY, doneDay: TODAY});
    expect(titles(viewTasks(done, {kind: 'today'}, TODAY)).sort()).toEqual(['Fictional invitations', 'Fictional water plants']);
    expect(waitsTurn(done, done.tasks.find(t => t.id === 'm')!)?.title).toBe('Fictional invitations');
  });
  test('a task’s subtasks in order: the second waits for the first; a subtask under a waiting task waits too', () => {
    let s = add(add(add(base(), 'p', {title: 'Fictional move'}), 'k1', {title: 'Fictional boxes', parentId: 'p', due: TODAY, order: 1}), 'k2', {title: 'Fictional van', parentId: 'p', due: TODAY, order: 2});
    s = add(s, 'k2a', {title: 'Fictional keys', parentId: 'k2', due: TODAY});
    s = editTask(s, 'p', {inOrder: true}, TODAY);
    expect(orderAhead(s).get('k2')?.id).toBe('k1');
    expect(waitsTurn(s, s.tasks.find(t => t.id === 'k2a')!)?.id).toBe('k1');
    expect(titles(viewTasks(s, {kind: 'today'}, TODAY))).toEqual(['Fictional boxes']);
    expect(setAside(s, s.tasks.find(t => t.id === 'k1')!, TODAY)).toBe(false);
    expect(editTask(s, 'p', {inOrder: null}, TODAY).tasks.find(t => t.id === 'p')!.inOrder).toBeUndefined();
  });
});

describe('focus on some projects (LEDGER #394)', () => {
  const r = add(add(add(base(), 'a', {title: 'Fictional report', due: TODAY, projectId: 'p_work'}), 'b', {title: 'Fictional cake', due: TODAY, projectId: 'p_party'}), 'c', {title: 'Fictional inbox thing', due: TODAY});
  test('only the projects and areas in focus; the Inbox is never hidden; a removed project falls out of the focus', () => {
    const focus = liveFocus({areas: ['area_work']}, r)!;
    expect(r.tasks.filter(t => inFocus(t, focus, r)).map(t => t.id)).toEqual(['a', 'c']);
    expect(focusName(focus, r)).toBe('Work');
    expect(focusName({projects: ['p_party', 'p_house', 'p_work']}, r)).toBe('Fictional party and 2 more');
    expect(focusedRecord(r, {projects: ['p_party']}).tasks.map(t => t.id)).toEqual(['b', 'c']);
    expect(liveFocus({projects: ['p_gone']}, r)).toBeNull();
  });
});

describe('a project review (LEDGER #395)', () => {
  test('every N weeks from the day it was set; Reviewed sets the next turn; listed with open, waiting and held tasks', () => {
    let r = add(add(base(), 'v', {title: 'Fictional venue', projectId: 'p_party', order: 1}), 'i', {title: 'Fictional invitations', projectId: 'p_party', order: 2});
    r = setProjectInOrder(setReview(r, 'p_party', 2, '2026-11-01'), 'p_party', true);
    expect(nextReview(r.projects![1]!, TODAY)).toBe('2026-11-15');
    expect(projectsToReview(r, TODAY).map(p => p.id)).toEqual(['p_party']);
    expect(projectTasks(r, 'p_party', TODAY)).toMatchObject({open: [{id: 'v'}], waiting: [{task: {id: 'i'}, on: 'Fictional venue'}], held: []});
    const done = markReviewed(r, 'p_party', TODAY);
    expect(projectsToReview(done, TODAY)).toEqual([]);
    expect(nextReview(done.projects![1]!, TODAY)).toBe('2026-12-07');
    expect(setReview(done, 'p_party', null, TODAY).projects![1]!.review).toBeUndefined();
    expect(() => setReview(r, 'p_party', 0, TODAY)).toThrow();
  });
});

describe('a repeat’s record (LEDGER #396)', () => {
  test('done in the last 3 months, by its day and after it, and the average days between finishes, beside the rule', () => {
    let r = add(base(), 'r', {title: 'Fictional bins', due: '2026-10-26', recur: {every: 'week', interval: 1, weekdays: [1]}});
    for (const [day, when] of [['2026-10-26', '2026-10-26T09:00:00Z'], ['2026-11-02', '2026-11-04T09:00:00Z'], ['2026-11-09', '2026-11-09T09:00:00Z'], ['2026-11-16', '2026-11-20T09:00:00Z']] as const) {
      r = editTask(r, 'r', {due: day}, TODAY, {allowPast: true});
      r = finishTask(r, 'r', new Date(when), {today: TODAY, doneDay: when.slice(0, 10)});
    }
    const rec = repeatRecord(r.tasks[0]!, TODAY, iso => iso.slice(0, 10))!;
    expect(rec).toMatchObject({done: 4, onDay: 2, late: 2, average: 8.3});
    expect(recordWords(rec)).toBe('Every week on Mon · done 4 times in the last 3 months (2 by its day, 2 after it) · on average every 8.3 days.');
    expect(recordWords(repeatRecord({recur: {every: 'day', interval: 3}}, TODAY, iso => iso)!)).toBe('Every 3 days · not done yet in the last 3 months.');
    expect(repeatRecord({}, TODAY, iso => iso)).toBeNull();
  });
});

describe('label groups (LEDGER #397) and the Select bar (LEDGER #391)', () => {
  const grouped = setLabelGroup(base(), {id: 'g', name: 'Where', labels: groupLabels('@home, @office errand')});
  test('one label of a group: quick add keeps the last typed, an edit keeps the new one, the bar’s add takes the other away', () => {
    expect(oneOfEachGroup(['home', 'office', 'calls'], [], grouped.labelGroups)).toEqual(['office', 'calls']);
    expect(oneOfEachGroup(['home', 'office'], ['home'], grouped.labelGroups)).toEqual(['office']);
    let r = add(add(grouped, 'a', {title: 'Fictional printer', labels: ['home', 'office']}), 'b', {title: 'Fictional stamps', labels: ['home', 'calls']});
    expect(r.tasks.find(t => t.id === 'a')!.labels).toEqual(['office']);
    expect(parseTaskLine('Fictional thing @home @office', TODAY).labels).toEqual(['home', 'office']);
    r = editMany(r, ['a', 'b'], t => ({labels: [...(t.labels ?? []), 'errand']}), TODAY, {allowPast: true});
    expect(r.tasks.map(t => t.labels)).toEqual([['errand'], ['calls', 'errand']]);
    r = editMany(r, ['a', 'b'], t => ({labels: (t.labels ?? []).filter(l => l !== 'errand')}), TODAY, {allowPast: true});
    expect(r.tasks.map(t => t.labels)).toEqual([undefined, ['calls']]);
  });
  test('a group is refused without a name, with one label, or with a label of another group; removing it keeps the labels', () => {
    expect(() => setLabelGroup(grouped, {id: 'h', name: 'Energy', labels: ['low']})).toThrow(/two labels/);
    expect(() => setLabelGroup(grouped, {id: 'h', name: 'Other', labels: ['home', 'park']})).toThrow(/already in “Where”/);
    expect(() => setLabelGroup(grouped, {id: 'h', name: ' ', labels: ['a', 'b']})).toThrow(/name/);
    const r = tasksSchema.parse({...base(), tasks: [{id: 't', title: 'Fictional', priority: 'normal', createdAt: at.toISOString(), labels: ['home', 'office']}], labelGroups: grouped.labelGroups});
    expect(tasksWithSeveral(r, grouped.labelGroups![0]!)).toBe(1);
    expect(removeLabelGroup(r, 'g').labelGroups).toBeUndefined();
    expect(removeLabelGroup(r, 'g').tasks[0]!.labels).toEqual(['home', 'office']);
  });
  test('the Select bar: any day or no day (a repeat keeps its day), in one change; Undo brings a removed group back', () => {
    let r = add(add(base(), 'a', {title: 'Fictional one', due: TODAY, time: '10:00'}), 'b', {title: 'Fictional two'});
    r = editMany(r, ['a', 'b'], () => ({due: '2026-12-01'}), TODAY, {allowPast: true});
    expect(r.tasks.map(t => t.due)).toEqual(['2026-12-01', '2026-12-01']);
    r = editMany(r, ['a', 'b'], () => ({due: null, time: null}), TODAY, {allowPast: true});
    expect(r.tasks.map(t => [t.due, t.time])).toEqual([[undefined, undefined], [undefined, undefined]]);
    const after = removeLabelGroup(grouped, 'g');
    expect(undoOfChange(grouped, after)(after).labelGroups).toEqual(grouped.labelGroups);
    expect(undoOfChange(base(), grouped)(grouped).labelGroups).toBeUndefined();
  });
});

describe('the second-to-last weekday and the last working day (LEDGER #398)', () => {
  test('the days themselves', () => {
    expect(fromEndWeekday(2026, 11, 2, 5)).toBe('2026-11-20');
    expect(fromEndWeekday(2026, 2, 5, 1)).toBeNull();
    expect(workdayOf(2026, 1, 'last')).toBe('2026-01-30');
    expect(workdayOf(2026, 8, 'first')).toBe('2026-08-03');
  });
  test('in quick add and the editor, English and Dutch; described; next ones', () => {
    const a = parseTaskLine('Fictional report every second-to-last Friday', TODAY);
    expect(a).toMatchObject({title: 'Fictional report', recur: {every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}}});
    expect(a.due).toBe(firstDue(a.recur!, TODAY));
    expect(a.due).toBe('2026-12-18');
    expect(parseTaskLine('Fictional pay every last workday', TODAY)).toMatchObject({title: 'Fictional pay', recur: {workday: 'last'}, due: '2026-11-30'});
    expect(parseTaskLine('Fictional pay every month on the last working day', TODAY).recur).toMatchObject({workday: 'last'});
    expect(parseTaskLine('Fictional pay every first business day', TODAY)).toMatchObject({recur: {workday: 'first'}, due: '2026-12-01'});
    expect(parseTaskLine('Fictional report elke voorlaatste vrijdag', TODAY).recur).toMatchObject({fromEnd: {n: 2, weekday: 5}});
    expect(parseTaskLine('Fictional loon elke laatste werkdag', TODAY).recur).toMatchObject({workday: 'last'});
    expect(parseTaskLine('Fictional report every next-to-last Friday', TODAY).recur).toMatchObject({fromEnd: {n: 2}});
    expect(parseTaskLine('Fictional report every third last Monday', TODAY).recur).toMatchObject({fromEnd: {n: 3, weekday: 1}});
    expect(parseTaskLine('Fictional walk every weekday', TODAY).recur).toEqual({every: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5]});
    expect(parseTaskLine('Fictional review every last Friday', TODAY).recur).toMatchObject({nth: {n: -1, weekday: 5}});
    expect(describeRecur({every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}})).toBe('Every month on the second-to-last Friday');
    expect(describeRecur({every: 'month', interval: 2, workday: 'last'})).toBe('Every 2 months on the last working day');
    expect(nextOccurrence({every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}, monthDay: 18}, '2026-12-18', '2026-12-18', '2026-12-18')?.due).toBe('2027-01-22');
    expect(nextOccurrence({every: 'month', interval: 1, workday: 'last', monthDay: -1}, '2026-01-30', '2026-01-30', '2026-01-30')?.due).toBe('2026-02-27');
  });
  test('kept with a plain monthDay an older build follows, never in nth', () => {
    expect(olderDay({every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}, nth: {n: 1, weekday: 1}}, '2026-12-18')).toEqual({every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}, monthDay: 18});
    expect(olderDay({every: 'month', interval: 1, workday: 'first'}, '2026-12-01')).toEqual({every: 'month', interval: 1, workday: 'first', monthDay: 1});
    const parsed = parseTaskLine('Fictional report every second-to-last Friday', TODAY);
    const r = add(base(), 'x', {title: parsed.title, due: parsed.due, recur: parsed.recur});
    expect(r.tasks[0]!.recur).toEqual({every: 'month', interval: 1, fromEnd: {n: 2, weekday: 5}, monthDay: 18});
    const moved = finishTask(r, 'x', new Date('2026-12-18T09:00:00Z'), {today: '2026-12-18', doneDay: '2026-12-18'});
    expect(moved.tasks[0]!.due).toBe('2027-01-22');
  });
});
