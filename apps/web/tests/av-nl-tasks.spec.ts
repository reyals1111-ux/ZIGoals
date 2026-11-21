import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-NL-TASKS; Todoist's quick add, the rehearsal's Sanne): a Dutch task line is read as an
 * English one is — the pieces highlighted under the field, the title in the person's own words — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean and without sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: "Bel de tandarts morgen om 9 uur elke maandag p1" reads as a Monday repeat at 09:00`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/tasks'); await settle(page);
  const field = page.getByLabel('New task').first();
  await field.fill('Bel de tandarts om 9 uur elke maandag p1');
  const pieces = page.getByRole('list', {name: 'Read from your line'});
  await expect(pieces.getByRole('listitem')).toHaveCount(3);
  await expect(pieces).toContainText('om 9 uur');
  await expect(pieces).toContainText('elke maandag');
  await expect(page.locator('.tasks-smart-preview')).toContainText('Will add “Bel de tandarts”');
  await expect(page.locator('.tasks-smart-help')).toContainText('in English or Dutch');
  const findings = await axe(page, page.locator('form').filter({has: field}));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await field.press('Enter');
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; time?: string; due?: string; level?: number; recur?: {every: string; weekdays?: number[]}}[]).map(t => [t.title, t.time, t.due, t.level, t.recur?.every, t.recur?.weekdays?.join()]))).toEqual([['Bel de tandarts', '09:00', '2026-11-23', 1, 'week', '1']]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

/**
 * Session AV (1c, q1 #2, #15 and #17, fresh-agent review; Todoist NL): a Dutch "2 uur" is a length, one typed line with
 * commas offers several tasks, and the global Quick add takes a Dutch to-do line with its deadline and minutes.
 */
test('Dutch length, one line as three tasks, and Quick add keeps a deadline and minutes', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/tasks'); await settle(page);
  const field = page.getByLabel('New task').first();
  await field.fill('Rapport schrijven 2 uur');
  await expect(page.locator('.tasks-smart-preview')).toHaveText('Will add “Rapport schrijven” · Takes 2 h.');
  await field.fill('melk, brood en eieren');
  await page.getByRole('button', {name: 'Make 3 tasks'}).click();
  const pasted = page.locator('.tasks-paste-list');
  await expect(pasted).toBeFocused();
  await expect(pasted).toContainText('3 tasks from your line');
  await pasted.getByRole('button', {name: 'Add 3 tasks'}).click();
  const titles = () => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}').tasks as {title: string; deadline?: string; minutes?: number}[]).map(t => [t.title, t.deadline ?? null, t.minutes ?? null]));
  await expect.poll(titles).toEqual([['melk', null, null], ['brood', null, null], ['eieren', null, null]]);
  await page.locator('.quick-add-trigger:visible').first().click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'}), line = dialog.getByRole('textbox', {name: 'Type a line'});
  await line.fill('taak: rapport af deadline vrijdag 45 minuten');
  await dialog.getByRole('button', {name: 'Preview'}).click();
  await expect(dialog).toContainText('Will add a task: “rapport af”');
  await expect(dialog).toContainText('deadline Fri');
  await expect(dialog).toContainText('takes 45 min');
  await dialog.getByRole('button', {name: 'Add task'}).click();
  await expect.poll(titles).toContainEqual(['rapport af', '2026-11-27', 45]);
});
