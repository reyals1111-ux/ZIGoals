import {expect, test} from '@playwright/test';
import {DAY, freshTasks, record, storedTasks, task} from './helpers';

/**
 * Session AL (lane L5): C-LS-09 / P-LS-68 — a reminder set on a task shows in the app at its time (Tasks and Today's
 * tasks card), with Done and Dismiss. Device push stays off until the owner switches notifications on. UTC, fake clock.
 */
test.use({timezoneId: 'UTC'});
test('P-LS-68: a reminder 15 minutes before 18:00 shows at 17:45 on Tasks; Done ticks the task', async ({page}) => {
  await freshTasks(page, {at: `${DAY}T17:30:00.000Z`, tasks: record([task('task_mum', 'Fictional call mum', {due: DAY, time: '18:00', reminders: [{before: 15}]})])});
  await page.goto('/app/tasks');
  const reminders = page.getByRole('region', {name: 'Reminders'});
  await expect(page.locator('#task-task_mum')).toContainText('15 minutes before');
  await expect(reminders).toHaveCount(0);
  await page.clock.fastForward('16:00');
  await expect(reminders).toContainText('Fictional call mum', {timeout: 40_000});
  await reminders.getByRole('button', {name: 'Done'}).click();
  await expect.poll(async () => !!(await storedTasks(page))!.tasks[0]!.doneAt).toBe(true);
});
