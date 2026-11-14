import {expect, test} from '@playwright/test';
import {TODAY, TOMORROW, seeded, stored, tasksRecord} from './ap-fixtures';
import {hydrated} from '../ah-helpers';

/**
 * Session AP (owner-approved feature list): Tasks' "This evening" and "Someday", kept in their own device record
 * `zigoals:task-when:v1`, never in the task record. This evening holds only on its date; a task given a day leaves
 * Someday. Draft for the integrator to run.
 */
test.use({timezoneId: 'Europe/Brussels'});
const KEY = 'zigoals:task-when:v1';
const TASKS = tasksRecord([
  {id: 'ap-guitar', title: 'Fictional guitar practice'},
  {id: 'ap-rent', title: 'Fictional rent transfer', due: TODAY, priority: 'high'},
]);
const nav = (page: Parameters<typeof hydrated>[0]) => page.getByRole('navigation', {name: 'Task views'});

test('This evening: for tonight only, its day untouched; tomorrow the task is back in Today', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/tasks?view=evening');
  await expect(nav(page).getByRole('button', {name: 'This evening', exact: true})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Nothing on this evening’s list yet. Choose a task below.')).toBeVisible();
  const form = page.getByRole('form', {name: 'Add a task to this evening'});
  await form.getByRole('combobox', {name: 'Add to this evening'}).selectOption('ap-rent');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(page.getByRole('list', {name: 'This evening'})).toContainText('Fictional rent transfer');
  expect(await stored(page, KEY)).toEqual({version: 1, tasks: {'ap-rent': {evening: TODAY}}});
  const rent = (await stored<{tasks: Record<string, unknown>[]}>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === 'ap-rent')!;
  expect(rent).toMatchObject({due: TODAY}); expect(rent).not.toHaveProperty('evening');
  // The next day the list is empty and the task is overdue in Today, as it was before.
  await page.clock.setSystemTime(new Date(`${TOMORROW}T09:00:00Z`));
  await page.reload(); await hydrated(page);
  await expect(page.getByText('Nothing on this evening’s list yet. Choose a task below.')).toBeVisible();
  await nav(page).getByRole('button', {name: 'Today', exact: true}).click();
  await expect(page.locator('#task-ap-rent')).toBeVisible();
});

test('Someday: tasks with no day; giving one a day takes it out, with Undo back', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': TASKS}, '/app/tasks?view=someday');
  const form = page.getByRole('form', {name: 'Move a task to Someday'});
  const select = form.getByRole('combobox', {name: 'Move to Someday'});
  // A task with a day is not offered.
  await expect(select.locator('option', {hasText: 'Fictional rent transfer'})).toHaveCount(0);
  await select.selectOption('ap-guitar');
  await form.getByRole('button', {name: 'Move', exact: true}).click();
  const list = page.getByRole('list', {name: 'Someday'});
  await expect(list).toContainText('Fictional guitar practice');
  expect(await stored(page, KEY)).toEqual({version: 1, tasks: {'ap-guitar': {someday: true}}});
  await list.getByRole('button', {name: 'Give “Fictional guitar practice” a day'}).click();
  const dayForm = page.getByRole('form', {name: 'A day for “Fictional guitar practice”'});
  await dayForm.getByLabel('Due').fill('2026-11-20');
  await dayForm.getByRole('button', {name: 'Set the day'}).click();
  await expect(page.getByText('Nothing in Someday yet. Choose a task with no day below.')).toBeVisible();
  expect((await stored<{tasks: {id: string; due?: string}[]}>(page, 'zigoals:tasks:v1'))!.tasks.find(t => t.id === 'ap-guitar')!.due).toBe('2026-11-20');
  await page.locator('.aa-toast').last().getByRole('button', {name: 'Undo'}).click();
  await expect(page.getByRole('list', {name: 'Someday'})).toContainText('Fictional guitar practice');
});
