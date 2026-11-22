import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #261; Structured's copy day and clear day): on the Agenda's Day view, "Copy or clear this
 * day" copies the day's tasks to another day (new tasks, same times) and clears the day (open tasks to no day, nothing
 * deleted), each with Undo. At 390 and 1440 in Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z');
let seeded = addTask(emptyTasks(), {title: 'Fictional groceries', due: '2026-11-23', time: '17:00', minutes: 45}, {id: 'task_fictional-groceries', at, today: '2026-11-23'});
seeded = addTask(seeded, {title: 'Fictional call', due: '2026-11-23', time: '09:30'}, {id: 'task_fictional-call', at, today: '2026-11-23'});
const tasks = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; due?: string; time?: string}[]).map(t => [t.title, t.due ?? null, t.time ?? null]));
const clean = async (page: import('@playwright/test').Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };

for (const theme of THEMES) test(`${theme}: copy a day to another day and clear it, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/agenda?view=day'); await settle(page);
  const tools = page.locator('details.agenda-day-tools');
  await tools.locator('summary').click();
  await clean(page);
  await tools.getByLabel('Copy to').fill('2026-11-25');
  await tools.getByRole('button', {name: /^Copy 2 tasks to Wed, Nov 25/}).click();
  await expect.poll(() => tasks(page)).toEqual([['Fictional groceries', '2026-11-23', '17:00'], ['Fictional call', '2026-11-23', '09:30'], ['Fictional groceries', '2026-11-25', '17:00'], ['Fictional call', '2026-11-25', '09:30']]);
  await expect(page.locator('.tasks-status')).toContainText('Copied 2 tasks to Wed, Nov 25.');
  await page.locator('.tasks-status').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await tasks(page)).length).toBe(2);

  await page.locator('details.agenda-day-tools').getByRole('button', {name: 'Clear this day (2 open tasks)'}).click();
  await expect.poll(() => tasks(page)).toEqual([['Fictional groceries', null, null], ['Fictional call', null, null]]);
  await expect(page.locator('.tasks-status')).toContainText('2 tasks moved to no day');
  await page.locator('.tasks-status').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => tasks(page)).toEqual([['Fictional groceries', '2026-11-23', '17:00'], ['Fictional call', '2026-11-23', '09:30']]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
