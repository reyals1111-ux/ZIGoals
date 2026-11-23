// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {TaskRow} from '../../components/tasks/task-parts';
import TaskR5Fields from '../../components/tasks/task-r5-fields';
import {addTask} from './engine';
import {emptyTasks} from './schema';

/**
 * Session AV lane 2 (fixb5): a task row tells the list when its own editor opens and closes, so Tasks → Today keeps the
 * row in its group while the editor is open ("Doing now" acts at once and would otherwise move the row to Doing, which
 * closed the editor and dropped focus: tests/av2-planned-day.spec.ts). And the editor's "Where and when" controls are named by
 * their own words, the note under each its description (inside the label the note was part of the name).
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });

test('onEditing is told true when the editor opens and false when it closes or the row goes', async () => {
  const today = '2026-11-23', record = addTask(emptyTasks(), {title: 'Fictional tickets', due: today}, {id: 'task_t', at: new Date('2026-11-20T08:00:00Z'), today});
  const task = record.tasks[0]!, said: boolean[] = [];
  const draw = () => root.render(h('ul', null, h(TaskRow, {task, today, record, onToggle: () => undefined, onEdit: () => true, editor: 'inline', onEditing: (on: boolean) => said.push(on)})));
  await act(async () => draw());
  expect(said).toEqual([]);
  const edit = element.querySelector<HTMLButtonElement>('button[aria-label="Edit “Fictional tickets”"]')!;
  await act(async () => edit.click());
  expect(said).toEqual([true]);
  await act(async () => draw()); // a new callback on each render is not a new open
  expect(said).toEqual([true]);
  await act(async () => edit.click());
  expect(said).toEqual([true, false]);
  await act(async () => edit.click());
  await act(async () => root.render(h('ul')));
  expect(said).toEqual([true, false, true, false]);
});

test('Place, Travel before and Plan for are named by their own words, described by their notes', async () => {
  const today = '2026-11-23', record = addTask(emptyTasks(), {title: 'Fictional dentist'}, {id: 'task_d', at: new Date('2026-11-20T08:00:00Z'), today});
  await act(async () => root.render(h(TaskR5Fields, {task: record.tasks[0]!, today, due: '', time: '', value: {place: '', travel: '', bucket: '', block: ''}, onChange: () => undefined})));
  const named = (el: Element) => document.getElementById(el.getAttribute('aria-labelledby')!)!.textContent;
  const described = (el: Element) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent;
  const [place, travel] = [...element.querySelectorAll('input:not([type=hidden])')], bucket = element.querySelector('select')!;
  expect([named(place!), named(travel!), named(bucket)]).toEqual(['Place', 'Travel before (minutes)', 'Plan for']);
  expect(described(place!)).toBe('Written as you type it; nothing is looked up.');
  expect(described(bucket)).toMatch(/^It shows in Upcoming under its week or month/);
});
