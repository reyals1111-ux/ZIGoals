import {expect, test} from '@playwright/test';
import {DAY, freshTasks, storedTasks} from './helpers';
import {TASKS_KEY} from '../../../lib/tasks/schema';

/**
 * Session AL (lane L5): LS-022 / P-LS-39 — 1,000 injected tasks or corrupt bytes are never shown as "Open 0 tasks" with
 * new adds silently lost: the page says it couldn't read them, offers a copy of the raw data, and keeps the readable
 * tasks (open ones first, up to 500) on the person's choice; then new adds are saved. Fresh profile, UTC.
 */
test.use({timezoneId: 'UTC'});
test('LS-022: a list over the cap is salvaged, never dropped', async ({page}) => {
  const many = {version: 1, tasks: Array.from({length: 1000}, (_, i) => ({id: `t${i}`, title: `Fictional ${i}`, priority: 'normal', createdAt: `${DAY}T08:00:00.000Z`}))};
  await freshTasks(page, {extra: {[TASKS_KEY]: JSON.stringify(many)}});
  await page.goto('/app/tasks');
  const notice = page.getByRole('alert').filter({hasText: 'We couldn’t read your tasks on this device'});
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('500 tasks of 1,000 can still be read');
  const download = page.waitForEvent('download');
  await notice.getByRole('button', {name: 'Save a copy of the data'}).click();
  expect((await download).suggestedFilename()).toBe('zigoals-tasks-unreadable-copy.json');
  await notice.getByRole('button', {name: 'Keep the 500 readable tasks'}).click();
  await expect.poll(async () => (await storedTasks(page))?.tasks.length).toBe(500);
});
test('LS-022: corrupt bytes are kept until the person chooses; nothing is written over them', async ({page}) => {
  await freshTasks(page, {extra: {[TASKS_KEY]: '{not json'}});
  await page.goto('/app/tasks');
  await expect(page.getByRole('alert').filter({hasText: 'We couldn’t read your tasks'})).toBeVisible();
  await page.getByRole('form', {name: 'Add a task'}).getByLabel('New task').fill('Fictional new');
  await page.getByRole('form', {name: 'Add a task'}).getByRole('button', {name: 'Add task'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'could not be read, so nothing was changed'})).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), TASKS_KEY)).toBe('{not json');
});
