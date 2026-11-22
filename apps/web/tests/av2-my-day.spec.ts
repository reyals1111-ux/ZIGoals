import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): Plan my day's "My Day" picks a task for today and
 * leaves its own day alone; it shows in Tasks → Today under "My Day" (with Undo); a pick from the day before that is still
 * open comes back under "From yesterday"; the editor's "Add to My Day" picks a task with a later day — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-20T09:00:00Z');
let seeded = addTask(emptyTasks(), {title: 'Call the fictional bank', level: 1}, {id: 'task_fictional-bank', at, today: '2026-11-20'});
seeded = addTask(seeded, {title: 'Vacuum the fictional hall'}, {id: 'task_fictional-vacuum', at, today: '2026-11-20'});
seeded = addTask(seeded, {title: 'Book the fictional dentist', due: '2026-11-27'}, {id: 'task_fictional-dentist', at, today: '2026-11-20'});
const plan = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:task-plan:v1') ?? '{}') as {myDay?: {day: string; ids: string[]}}).myDay ?? null);
const due = (page: import('@playwright/test').Page) => page.evaluate(() => Object.fromEntries((JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; due?: string}[]).map(t => [t.id, t.due ?? null])));
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: My Day picks for today, From yesterday, and the editor's button`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => {
    localStorage.setItem('zigoals:tasks:v1', v);
    // Picked on Sunday, not finished: Monday offers it back.
    localStorage.setItem('zigoals:task-plan:v1', JSON.stringify({version: 1, myDay: {day: '2026-11-22', ids: ['task_fictional-vacuum']}}));
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  const fold = page.locator('details.tasks-plan-day');
  await expect(fold.locator('summary')).toHaveText('Plan my day 1 suggestion · 1 from yesterday · nothing planned for today yet');
  await fold.locator('summary').click();
  const suggested = fold.getByRole('list', {name: 'Suggested for today'});
  await suggested.getByRole('button', {name: 'Add Call the fictional bank to My Day'}).click();
  await expect.poll(() => plan(page)).toMatchObject({day: '2026-11-23', ids: ['task_fictional-bank']});
  // The task's own day is left alone (it has none).
  await expect.poll(() => due(page)).toEqual({'task_fictional-bank': null, 'task_fictional-vacuum': null, 'task_fictional-dentist': '2026-11-27'});
  const myDay = page.getByRole('list', {name: 'My Day tasks'});
  await expect(myDay.locator('li.task')).toHaveText([/Call the fictional bank/]);
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await plan(page))?.ids ?? []).toEqual([]);
  await expect(myDay).toHaveCount(0);

  // From yesterday: the open pick comes back; adding it puts it in today's My Day.
  const carried = fold.getByRole('list', {name: 'From yesterday'});
  await expect(carried.getByRole('listitem')).toHaveText([/^Vacuum the fictional hallNo day of its own/]);
  await carried.getByRole('button', {name: 'Add Vacuum the fictional hall to My Day'}).click();
  await expect.poll(async () => (await plan(page))?.ids).toEqual(['task_fictional-vacuum']);
  await expect(myDay.locator('li.task')).toHaveText([/Vacuum the fictional hall/]);
  await expect(fold.getByRole('list', {name: 'From yesterday'})).toHaveCount(0);
  await clean(page);

  // The editor: a task with a later day joins My Day and keeps its day.
  await page.goto('/app/tasks?view=upcoming'); await settle(page);
  const row = page.locator('li.task').filter({hasText: 'Book the fictional dentist'});
  await row.getByRole('button', {name: 'Edit “Book the fictional dentist”'}).click();
  await row.getByRole('button', {name: 'Add to My Day'}).click();
  await expect(row.getByRole('button', {name: 'Take out of My Day'})).toBeFocused();
  await expect.poll(async () => (await plan(page))?.ids).toEqual(['task_fictional-vacuum', 'task_fictional-dentist']);
  await page.goto('/app/tasks?view=today'); await settle(page);
  await expect(page.getByRole('list', {name: 'My Day tasks'}).locator('li.task')).toHaveCount(2);
  await expect.poll(() => due(page)).toMatchObject({'task_fictional-dentist': '2026-11-27'});
  await clean(page);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
