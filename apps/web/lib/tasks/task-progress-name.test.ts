// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {TaskRow} from '../../components/tasks/task-parts';
import {addTask} from './engine';
import {emptyTasks} from './schema';

/**
 * Session AV lane 2 (fixb2): a task's subtask count ("☑ 0/2") is named for a screen reader, and the name sits on an element
 * that may carry one: a plain span with aria-label is refused by axe (aria-prohibited-attr, serious), which
 * tests/av2-task-print.spec.ts found on a project's list.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });

test('the subtask count has a role that allows its name', async () => {
  const at = new Date('2026-11-23T08:00:00Z'), today = '2026-11-23';
  let record = addTask(emptyTasks(), {title: 'Fictional move'}, {id: 'task_parent', at, today});
  record = addTask(record, {title: 'Fictional boxes', parentId: 'task_parent'}, {id: 'task_child1', at, today});
  record = addTask(record, {title: 'Fictional van', parentId: 'task_parent'}, {id: 'task_child2', at, today});
  const task = record.tasks.find(t => t.id === 'task_parent')!;
  await act(async () => root.render(h('ul', null, h(TaskRow, {task, today, record, onToggle: () => undefined}))));
  const count = element.querySelector('.task-progress')!;
  expect(count.getAttribute('aria-label')).toBe('0 of 2 subtasks done');
  expect(count.getAttribute('role')).toBe('img');
  expect(count.textContent).toBe('☑ 0/2');
});
