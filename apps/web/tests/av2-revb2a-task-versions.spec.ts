import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (review b2a #5, privacy): removing a task removes its earlier versions from this device's planning
 * record (`zigoals:task-plan:v1` → `versions`), so the old words are not left in Export everything; Undo puts the task
 * and its versions back. Another task's versions stay. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam', viewport: {width: 1280, height: 900}});
const at = new Date('2026-11-23T07:00:00Z');
const seeded = addTask(addTask(emptyTasks(), {title: 'Write the fictional letter'}, {id: 'task_letter', at, today: '2026-11-23'}), {title: 'Water the fictional plants'}, {id: 'task_plants', at, today: '2026-11-23'});
const plan = {version: 1, versions: [
  {id: 'tv-letter1', taskId: 'task_letter', title: 'Write the fictional letter', notes: 'a private fictional line', savedAt: '2026-11-22T08:00:00.000Z'},
  {id: 'tv-plants1', taskId: 'task_plants', title: 'Water the plants', savedAt: '2026-11-22T09:00:00.000Z'},
]};
const versions = (page: import('@playwright/test').Page) => page.evaluate(() => ((JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}').versions ?? []) as {id: string}[]).map(v => v.id));

test('a removed task takes its earlier versions with it; Undo brings both back', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T08:40:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([t, p]) => { localStorage.setItem('zigoals:tasks:v1', t!); localStorage.setItem('zigoals:task-plan:v1', p!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [JSON.stringify(seeded), JSON.stringify(plan)]);
  await page.goto('/app/tasks'); await settle(page);
  await page.getByRole('button', {name: 'Remove the task “Write the fictional letter”'}).first().click();
  await expect.poll(() => versions(page)).toEqual(['tv-plants1']);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:task-plan:v1'))).not.toContain('a private fictional line');
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(() => versions(page)).toEqual(['tv-letter1', 'tv-plants1']);
});
