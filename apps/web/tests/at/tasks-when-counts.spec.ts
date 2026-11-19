import {expect, test} from '@playwright/test';
import {seeded, tasksRecord, TODAY} from '../ap/ap-fixtures';

/**
 * Session AT (ADR-043 D7; AP D16c): the Tasks menu shows how many tasks are on This evening and in Someday, as it does
 * for its other views, and the number follows a move at once; an empty list shows no number.
 */
test.use({timezoneId: 'Europe/Brussels'});
const TASKS = tasksRecord([
  {id: 'at-a', title: 'Fictional sketch'}, {id: 'at-b', title: 'Fictional letter'}, {id: 'at-c', title: 'Fictional call', due: TODAY},
]);
const nav = (page: Parameters<typeof seeded>[0]) => page.getByRole('navigation', {name: 'Task views'});

test('D7: Someday and This evening carry their counts in the menu, and they follow a move', async ({page}) => {
  await seeded(page, {'zigoals:tasks:v1': TASKS, 'zigoals:task-when:v1': {version: 1, tasks: {'at-a': {someday: true}, 'at-b': {someday: true}, 'at-c': {evening: TODAY}}}}, '/app/tasks?view=someday');
  await expect(nav(page).getByRole('button', {name: 'Someday 2', exact: true})).toBeVisible();
  await expect(nav(page).getByRole('button', {name: 'This evening 1', exact: true})).toBeVisible();
  await page.getByRole('list', {name: 'Someday'}).getByRole('button', {name: 'Take “Fictional sketch” out of Someday'}).click();
  await expect(nav(page).getByRole('button', {name: 'Someday 1', exact: true})).toBeVisible();
  await page.getByRole('list', {name: 'Someday'}).getByRole('button', {name: 'Take “Fictional letter” out of Someday'}).click();
  await expect(nav(page).getByRole('button', {name: 'Someday', exact: true})).toBeVisible();
});
