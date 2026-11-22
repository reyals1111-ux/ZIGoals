import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {health, healthRecord, openHealth, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (rest, LEDGER #178; Daylio's custom moods): with your own word for a mood (“Sunny” for 5), the
 * Journal's Year in pixels says it in its year sentence, its key and each square's title — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. The saved image's key is unit-tested
 * (lib/year-pixels/av2-own-words.test.ts). Fictional data.
 */
const moods = {version: 1, days: {[TODAY]: {mood: 5, at: `${TODAY}T09:00:00.000Z`}}};
for (const theme of THEMES) test(`${theme}: the Year in pixels in your own mood words`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, {...healthRecord(health({moods} as never)), [ENERGY_KEY]: {version: 1, days: {}, checkin: {moodLook: {'5': {word: 'Sunny'}}}}}, '/app/journal');
  await page.locator('summary', {hasText: 'Year: one square a day'}).click();
  const summary = page.locator('.year-pixels-summary');
  await expect(summary).toContainText('1 day with a mood rating.');
  await expect(summary).toContainText('Sunny 1');
  await expect(page.getByRole('list', {name: 'Key'})).toContainText('5 Sunny (1)');
  await expect(page.locator(`[role="gridcell"][aria-label*="mood Sunny, 5 of 5"]`)).toHaveCount(1);
  const findings = await axe(page, page.locator('.year-pixels-fold'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
