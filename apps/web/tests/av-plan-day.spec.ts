import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV, owner follow-up 1 (F-PLAN-DAY; TickTick's suggested tasks, Sunsama's planning step, with no model): Tasks →
 * Today → "Plan my day" offers the overdue task and a priority 1 task with no day, each with why; "Plan for today"
 * moves one to today (with Undo), "Not now" sets the other aside for now (Session AV 1c), and the fold goes when nothing is
 * left to suggest — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-20T09:00:00Z');
const seeded = addTask(addTask(emptyTasks(), {title: 'Water the fictional plants', due: '2026-11-21'}, {id: 'task_fictional-water', at, today: '2026-11-20'}), {title: 'Call the fictional bank', level: 1}, {id: 'task_fictional-bank', at, today: '2026-11-20'});
const due = (page: import('@playwright/test').Page) => page.evaluate(() => Object.fromEntries((JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {id: string; due?: string}[]).map(t => [t.id, t.due ?? null])));
for (const theme of THEMES) test(`${theme}: the overdue task planned for today, the other set aside`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=today'); await settle(page);
  const fold = page.locator('details.tasks-plan-day');
  await expect(fold.locator('summary')).toHaveText('Plan my day 2 suggestions · nothing planned for today yet');
  // Session AV (1c, q1 #38, deliberate): with an overdue suggestion the fold opens itself (it sat closed below the list).
  await expect(fold).toHaveAttribute('open', '');
  const list = fold.getByRole('list', {name: 'Suggested for today'});
  await expect(list.getByRole('listitem')).toHaveText([/^Water the fictional plantsWas planned for Sat, Nov 21/, /^Call the fictional bankPriority 1, no day yet/]);
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await list.getByRole('button', {name: 'Plan Water the fictional plants for today'}).click();
  await expect.poll(() => due(page)).toEqual({'task_fictional-water': '2026-11-23', 'task_fictional-bank': null});
  await expect(fold.locator('summary')).toHaveText('Plan my day 1 suggestion · 1 task planned for today');
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => due(page)).toEqual({'task_fictional-water': '2026-11-21', 'task_fictional-bank': null});
  await list.getByRole('button', {name: 'Plan Water the fictional plants for today'}).click();
  await expect.poll(() => due(page)).toEqual({'task_fictional-water': '2026-11-23', 'task_fictional-bank': null});
  // Session AV (1c, q1 #38, deliberate): "Not now", as it lasts for this tab only (it said "until tomorrow").
  await list.getByRole('button', {name: 'Not now: Call the fictional bank'}).click();
  await expect(fold).toHaveCount(0);
  await page.reload(); await settle(page);
  await expect(page.locator('li.task').filter({hasText: 'Water the fictional plants'})).toHaveCount(1);
  await expect(page.locator('details.tasks-plan-day')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
