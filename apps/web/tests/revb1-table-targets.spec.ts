import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #8): at 320 px the Tasks Table's Done box sits in a 44 × 44 px target and its sort
 * buttons are at least 44 px each way. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam', viewport: {width: 320, height: 800}});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
const seeded = addTask(emptyTasks(), {title: 'Write the fictional report', due: today, minutes: 60}, {id: 'task_report', at, today});

test('the Table’s Done box and sort buttons are 44 px targets at 320 px', async ({page}) => {
  await offline(page);
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=table'); await settle(page);
  const table = page.getByRole('table');
  const box = await table.locator('label.tasks-table-box').first().boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  for (const name of ['Task', 'Spent', 'Day']) {
    const b = await table.getByRole('button', {name, exact: true}).boundingBox();
    expect(b!.width, name).toBeGreaterThanOrEqual(44); expect(b!.height, name).toBeGreaterThanOrEqual(44);
  }
  // The label is the box's: a tap on its edge marks the task done.
  await table.locator('label.tasks-table-box').first().click({position: {x: 3, y: 3}});
  await expect.poll(() => page.evaluate(() => !!JSON.parse(localStorage.getItem('zigoals:tasks:v1')!).tasks[0].doneAt)).toBe(true);
});
