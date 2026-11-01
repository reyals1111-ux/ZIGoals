// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import TasksWidget from '../../components/nova/widgets/tasks';
import {TASKS_KEY} from '../tasks/schema';

/**
 * Session AK lane P7 (exploratory round 3, EX3-2): NOVA's Tasks widget on a fresh start. Adding the first task turns the
 * empty start into the list; the add form must stay the same element, so the title field keeps the focus (a remounted
 * form dropped it to the page, where NOVA's single-key shortcuts take the next letter). Nothing leaves the test.
 */
let root: Root, host: HTMLElement;
const settle = async () => { for (let i = 0; i < 10; i++) await act(async () => { await new Promise(r => setTimeout(r, 5)); }); };
const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
  });
};
beforeEach(() => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); localStorage.clear(); });

test('EX3-2: the first task added from the empty widget keeps the focus in the title field', async () => {
  await act(async () => root.render(h(TasksWidget, {size: 'M'})));
  await settle();
  const title = () => host.querySelector<HTMLInputElement>('.tasks-add input:not([type])')!;
  expect(host.textContent).toContain('Your list starts here');
  const first = title();
  first.focus();
  await type(first, 'Water the plants');
  await act(async () => { first.form!.requestSubmit(); });
  await settle();
  expect(JSON.parse(localStorage.getItem(TASKS_KEY) ?? '{}').tasks).toHaveLength(1);
  expect(host.querySelector('[aria-label="Today’s tasks"]')?.textContent).toContain('Water the plants');
  // The same field, still focused, ready for the next task.
  expect(title()).toBe(first);
  expect(document.activeElement).toBe(first);
});
