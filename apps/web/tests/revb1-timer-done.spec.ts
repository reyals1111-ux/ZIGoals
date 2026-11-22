import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #2, Major): ticking Done on a task whose timer runs stops the timer and adds its minutes to
 * the task's time spent, as Stop does (they used to be lost). Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
const seeded = addTask(emptyTasks(), {title: 'Write the fictional report', due: today, minutes: 60}, {id: 'task_report', at, today});

test('Done while timing keeps the minutes', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T08:50:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(({tasks, since}) => {
    localStorage.setItem('zigoals:tasks:v1', tasks);
    localStorage.setItem('zigoals:task-plan:v1', JSON.stringify({version: 1, timers: [{taskId: 'task_report', since}]}));
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  }, {tasks: JSON.stringify(seeded), since: Date.parse('2026-11-23T08:10:00+01:00')});
  await page.goto('/app/tasks?view=today'); await settle(page);
  await expect(page.getByRole('list', {name: 'Timers running'})).toContainText('Write the fictional report · 40 min of 1 h planned');
  await page.getByRole('checkbox', {name: 'Mark “Write the fictional report” done'}).first().check();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1')!).tasks.find((t: {id: string}) => t.id === 'task_report')?.spent)).toBe(40);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:task-plan:v1')!).timers)).toBeUndefined();
  await expect(page.getByRole('list', {name: 'Timers running'})).toHaveCount(0);
  await expect(page.locator('body')).toContainText('Timer stopped: 40 min added to its time spent.');
});
