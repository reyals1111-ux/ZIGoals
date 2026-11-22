import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #14): a timer starts from any task's editor (here a task in Upcoming, which Tasks →
 * Today's planner never shows), and stopping it there adds the minutes to the task's time spent. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
const seeded = addTask(emptyTasks(), {title: 'Draft the fictional plan', due: '2026-11-26'}, {id: 'task_plan', at, today});
const stored = (page: import('@playwright/test').Page) => page.evaluate(() => ({task: JSON.parse(localStorage.getItem('zigoals:tasks:v1')!).tasks[0] as {spent?: number}, plan: JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}') as {timers?: {taskId: string}[]}}));

test('start and stop a timer from a task’s editor', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?task=task_plan'); await settle(page);
  const editor = page.getByRole('form', {name: 'Edit “Draft the fictional plan”'});
  await editor.getByRole('button', {name: 'Start a timer'}).click();
  await expect(editor.getByRole('button', {name: 'Stop the timer'})).toBeFocused();
  await expect.poll(async () => (await stored(page)).plan.timers?.map(t => t.taskId)).toEqual(['task_plan']);
  await expect(editor.getByRole('status').filter({hasText: 'Timing “Draft the fictional plan”'})).toBeVisible();
  await page.clock.fastForward('25:00');
  await editor.getByRole('button', {name: 'Stop the timer'}).click();
  await expect.poll(async () => (await stored(page)).task.spent).toBe(25);
  expect((await stored(page)).plan.timers).toBeUndefined();
  await expect(editor.getByLabel('Time spent (minutes) — optional')).toHaveValue('25');
  await expect(editor.locator('.task-editor-stale')).toHaveCount(0);
  await expect(editor.getByRole('button', {name: 'Start a timer'})).toBeFocused();
});
