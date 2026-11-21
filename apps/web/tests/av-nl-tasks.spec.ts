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
