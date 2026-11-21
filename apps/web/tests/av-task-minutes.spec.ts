import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-TASK-MINUTES; Todoist durations, Sunsama's planned time): "for 45 min" in the task line
 * is read as how long the task takes, the row says it, Tasks → Today adds up the day's minutes, and the editor's own
 * field changes it — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const TITLE = 'Write the fictional report';
const read = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; due?: string; minutes?: number}[]).map(t => [t.title, t.due, t.minutes ?? null]));
for (const theme of THEMES) test(`${theme}: 45 minutes from the line, the day's load, then 90 in the editor`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/tasks?view=today'); await settle(page);
  const field = page.getByLabel('New task').first();
  await field.fill(`${TITLE} today for 45 min`);
  const pieces = page.getByRole('list', {name: 'Read from your line'});
  await expect(pieces.getByRole('listitem').filter({hasText: 'for 45 min'})).toContainText('for 45 min is read as the Length');
  await field.press('Enter');
  await expect.poll(() => read(page)).toEqual([[TITLE, '2026-11-23', 45]]);
  const row = page.locator('li.task').filter({hasText: TITLE});
  await expect(row.locator('.task-minutes')).toHaveText('45 min');
  await expect(page.locator('.tasks-day-load')).toHaveText('About 45 min planned for 1 task.');
  await row.getByRole('button', {name: `Edit “${TITLE}”`}).click();
  const editor = page.getByRole('form', {name: `Edit “${TITLE}”`});
  const minutes = editor.getByLabel('Takes (minutes) — optional');
  await expect(minutes).toHaveValue('45');
  await minutes.fill('0');
  await expect(editor.getByRole('alert')).toHaveText('Enter whole minutes from 1 to 1,440, for example 30 or 90.');
  await minutes.fill('90');
  const findings = await axe(page, editor);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect.poll(() => read(page)).toEqual([[TITLE, '2026-11-23', 90]]);
  await expect(row.locator('.task-minutes')).toHaveText('1 h 30 min');
  await expect(page.locator('.tasks-day-load')).toHaveText('About 1 h 30 min planned for 1 task.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
