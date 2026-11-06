import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, task} from './helpers';

/**
 * Session AL (lane L5): LS-011 / LS-065 / P-LS-12 — the open page moves on by itself: a task due at 23:00 turns late
 * after 23:00 and a task due today turns overdue after midnight, with no reload. Brussels, fake clock from 22:50.
 */
test.use({timezoneId: 'Europe/Brussels'});
test('LS-011/LS-065: late after its time, overdue after midnight, without a reload', async ({page}) => {
  await freshTasks(page, {at: `${DAY}T21:50:00.000Z`, tasks: record([task('task_late', 'Fictional late call', {due: DAY, time: '23:00'}), task('task_day', 'Fictional day task', {due: DAY})])});
  await page.goto('/app/tasks?view=all');
  const late = page.locator('#task-task_late'), day = page.locator('#task-task_day');
  await expect(late).toContainText('Due today at');
  await page.clock.fastForward('20:00'); // 23:10
  await expect(late).toContainText('Late · today', {timeout: 40_000});
  await expect(page.getByRole('list', {name: 'Overdue tasks'})).toContainText('Fictional late call');
  await page.clock.fastForward('01:00:00'); // 00:10 the next day
  await expect(day).toContainText('Overdue · ', {timeout: 40_000});
  await expect(page.getByRole('list', {name: 'Today tasks'})).toHaveCount(0);
});
