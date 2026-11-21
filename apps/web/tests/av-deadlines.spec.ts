import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-DEADLINES; Things, Todoist Deadlines): a deadline kept apart from the planned day —
 * "deadline Friday" in the task line, the flag on the row, the editor's own field, and Today listing the task from its
 * deadline whatever its planned day — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const TITLE = 'Hand in the fictional form';
for (const theme of THEMES) test(`${theme}: planned tomorrow, deadline Friday, then moved to today and in Today`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/tasks?view=all'); await settle(page);
  const field = page.getByLabel('New task').first();
  await field.fill(`${TITLE} tomorrow deadline friday`);
  const pieces = page.getByRole('list', {name: 'Read from your line'});
  await expect(pieces.getByRole('listitem')).toHaveCount(2);
  await expect(pieces.getByRole('listitem').nth(1)).toContainText('deadline friday');
  await expect(pieces.getByRole('listitem').nth(1)).toContainText('Deadline');
  await field.press('Enter');
  const read = () => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; due?: string; deadline?: string}[]).map(t => [t.title, t.due, t.deadline]));
  await expect.poll(read).toEqual([[TITLE, '2026-11-24', '2026-11-27']]);
  const row = page.locator('li.task').filter({hasText: TITLE});
  await expect(row.locator('.task-deadline')).toHaveText(/^⚑ Deadline \w+, Nov 27$/);
  // The editor's own field: the deadline moved to today; the task is then in Today, though planned for tomorrow.
  await row.getByRole('button', {name: `Edit “${TITLE}”`}).click();
  const editor = page.getByRole('form', {name: `Edit “${TITLE}”`});
  await expect(editor.getByLabel('Deadline — optional')).toHaveValue('2026-11-27');
  await editor.getByLabel('Deadline — optional').fill('2026-11-23');
  await editor.getByRole('button', {name: 'Save'}).click();
  await expect(row.locator('.task-deadline')).toHaveText('⚑ Deadline today');
  await expect.poll(read).toEqual([[TITLE, '2026-11-24', '2026-11-23']]);
  await page.goto('/app/tasks?view=today'); await settle(page);
  const today = page.locator('li.task').filter({hasText: TITLE});
  await expect(today).toHaveCount(1);
  await expect(today.locator('.task-due')).toContainText('Due');
  const findings = await axe(page, page.locator('li.task').first());
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
