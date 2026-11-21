import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase} from './ah-helpers';
import {openFold} from './phone-nav';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV Part 7 (ADR-045 F-YEAR; Rocket Money's yearly total): Wealth → Upcoming bills says what the confirmed bills
 * come to in a year, per currency, labelled an estimate; with no bill there is no such line. Showcase example (labelled
 * fictional), three themes, 320 px, axe.
 */
for (const theme of THEMES) test(`${theme}: "A year of these bills (an estimate)" beside a typical month, in the Showcase`, async ({page}) => {
  await applyTheme(page, theme);
  await offline(page);
  await loadShowcase(page);
  await page.setViewportSize({width: 320, height: 800});
  await page.goto('/app/wealth'); await hydrated(page);
  await openFold(page, 'Upcoming bills');
  const totals = page.locator('.bills-totals').first();
  await expect(totals).toContainText('A typical month (an estimate)');
  const year = totals.locator('div').filter({hasText: 'A year of these bills'});
  await expect(year).toContainText('(an estimate)');
  await expect(year.locator('dd')).toContainText(/[€$]\s?\d/);
  await expect(page.getByText('Fictional Showcase entries.').first()).toBeVisible();
  // Session AV (fresh-agent check q1, F-YEAR row 8; Rocket Money): each bill row also says its own yearly cost.
  await expect(page.locator('.bills-row').filter({hasText: 'Music · SHOWCASE DATA'}).first()).toContainText('monthly · about €119.88 a year');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await axe(page, totals)).filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

test('no bills: no yearly line', async ({page}) => {
  await offline(page);
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app/wealth'); await hydrated(page);
  await openFold(page, 'Upcoming bills');
  await expect(page.locator('.bills-totals').first()).toContainText('No bills yet');
  await expect(page.getByText('A year of these bills')).toHaveCount(0);
});
