import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (r5-body; LEDGER #369, Productive; TIER 3 (PWA)): Settings → Notifications → "One reminder for each
 * part of the day" — off by default; when ticked, the morning, afternoon and evening start times show (08:30, 12:30,
 * 18:00 until changed), a time inside the quiet hours says it will not ring, and the choice is kept in zigoals:notify:v1.
 * Unticking "Habits due" hides it. 320 / 1440 in Nebula, Light and Dark, axe-clean. Nothing is sent from a test.
 */
const prefs = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:notify:v1') ?? 'null') as {habitParts?: Record<string, unknown>; types?: Record<string, boolean>} | null);

for (const theme of THEMES) for (const width of [320, 1440]) test(`${theme} ${width}: one reminder for each part of the day`, async ({page}) => {
  await applyTheme(page, theme);
  await offline(page);
  await page.setViewportSize({width, height: 900});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/settings#notifications'); await settle(page);
  const card = page.locator('#notifications');
  await card.scrollIntoViewIfNeeded();
  const parts = card.getByRole('group', {name: 'Habit reminders'});
  const choice = parts.getByRole('checkbox', {name: 'One reminder for each part of the day'});
  await expect(choice).not.toBeChecked();
  await expect(parts.getByLabel('Morning starts at')).toHaveCount(0);
  await choice.check();
  await expect.poll(async () => (await prefs(page))?.habitParts).toEqual({on: true});
  await expect(parts.getByLabel('Morning starts at')).toHaveValue('08:30');
  await expect(parts.getByLabel('Afternoon starts at')).toHaveValue('12:30');
  await expect(parts.getByLabel('Evening starts at')).toHaveValue('18:00');
  await parts.getByLabel('Evening starts at').fill('19:15');
  await expect.poll(async () => (await prefs(page))?.habitParts).toEqual({on: true, evening: '19:15'});
  await parts.getByLabel('Morning starts at').fill('05:30');
  await expect(parts).toContainText('Inside your quiet hours, so it will not ring.');
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await card.getByRole('switch', {name: 'Habits due'}).click();
  await expect(card.getByRole('group', {name: 'Habit reminders'})).toHaveCount(0);
});
