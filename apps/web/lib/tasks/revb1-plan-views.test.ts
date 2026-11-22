import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import TasksPlanViews from '../../components/tasks/tasks-plan-views';
import {addProject, addTask, editMany} from './engine';
import {emptyTasks, type Tasks} from './schema';

/**
 * Session AV lane 2 (review b1 #7, Major): the Table, Calendar and Timeline are no longer read-only pictures — each task's
 * title is a button that opens its editor, every open Calendar task can be dragged or moved with "Move" (keyboard), and
 * the move is the list's own change (a new day, the time kept). Rendered on the server, as the first paint is.
 */
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
let record: Tasks = addProject(emptyTasks(), {name: 'Fictional move'}, 'project_fictional-move');
record = addTask(record, {title: 'Fictional standup', due: today, time: '10:00', minutes: 30}, {id: 'task_standup', at, today});
record = addTask(record, {title: 'Pack the fictional boxes', due: '2026-11-25', deadline: '2026-11-28', projectId: 'project_fictional-move'}, {id: 'task_boxes', at, today});
const list = {tasks: {data: record, loaded: true, unreadable: false}, today, clock: '08:00', doneDay: (iso: string) => iso.slice(0, 10), toggle: () => true, change: () => true, edit: () => true} as never;
const goals = {open: [], byKey: new Map()} as never;
const html = (kind: 'table' | 'days' | 'timeline') => renderToStaticMarkup(createElement(TasksPlanViews, {kind, list, goals}));

describe('the layouts open and move tasks', () => {
  test('Table: each title is a button that opens the editor', () => {
    const out = html('table');
    expect(out).toMatch(/<th scope="row"><button type="button" class="tasks-plan-task" data-plan-task="task_boxes" aria-expanded="false" dir="auto">Pack the fictional boxes<\/button><\/th>/);
    expect(out).toContain('Choose a task’s name to change it.');
  });
  test('Calendar: titles open the editor; open tasks can be dragged and have a keyboard Move', () => {
    const out = html('days');
    expect(out).toContain('data-plan-task="task_standup"');
    expect(out).toMatch(/<li draggable="true">.*?Fictional standup<\/button><button type="button" class="quiet tasks-plan-move" aria-pressed="false" aria-label="Move “Fictional standup” to another day">Move<\/button><\/li>/);
    expect(out).toContain('Drag it to another day, or use Move.');
  });
  test('Timeline: each bar’s title opens the editor', () => {
    expect(html('timeline')).toMatch(/<span class="tasks-timeline-title"><button type="button" class="tasks-plan-task" data-plan-task="task_boxes"/);
  });
  test('a move gives the task its new day and keeps its time (the change the Calendar makes)', () => {
    const moved = editMany(record, ['task_standup'], () => ({due: '2026-11-24'}), today, {allowPast: true});
    expect(moved.tasks.find(t => t.id === 'task_standup')).toMatchObject({due: '2026-11-24', time: '10:00', minutes: 30});
  });
});
