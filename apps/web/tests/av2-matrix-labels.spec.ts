import {expect, test} from '@playwright/test';
import {axe, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks, LEDGER #14; TickTick's quadrant filters and several matrices): a label makes a task important,
 * the lines are saved as a named matrix and chosen again; Upcoming says each day's minutes (q1 Minor). Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
let seeded = addTask(emptyTasks(), {title: 'Fictional report', labels: ['work'], due: '2026-11-30'}, {id: 'task_report', at, today});
seeded = addTask(seeded, {title: 'Fictional long job', due: '2026-11-24', minutes: 90}, {id: 'task_long', at, today});
test('label rules, a saved matrix, and the load per day on Upcoming', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=matrix'); await settle(page);
  await page.locator('details.tasks-matrix-rules > summary').click();
  const labels = page.getByRole('textbox', {name: 'Also important with the label'});
  await labels.fill('@work'); await labels.blur();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:matrix-rules') ?? '{}').importantLabels)).toEqual(['work']);
  await expect(page.locator('.tasks-when-lede')).toContainText('or labelled @work');
  await page.getByRole('textbox', {name: 'Save these lines as'}).fill('Work week');
  await page.getByRole('button', {name: 'Save matrix'}).click();
  await expect(page.locator('details.tasks-matrix-rules > summary')).toHaveText('Your own lines · Work week');
  await page.getByRole('combobox', {name: 'Matrix'}).selectOption({label: 'The usual lines'});
  await expect(page.locator('.tasks-when-lede')).not.toContainText('labelled');
  await page.getByRole('combobox', {name: 'Matrix'}).selectOption({label: 'Work week'});
  await expect(page.locator('.tasks-when-lede')).toContainText('or labelled @work');
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  await page.goto('/app/tasks?view=upcoming'); await settle(page);
  await expect(page.locator('.tasks-day-load').first()).toContainText('About 1 h 30 min planned for 1 task');
});
