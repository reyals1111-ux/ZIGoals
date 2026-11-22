import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {health, healthRecord, openHealth, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #178 follow-up): the Journal's week line for screen readers and the Year in
 * pixels key say the moods in the person's own words (Health → Diary → Your own words for the moods), at 390 and 1440,
 * in Nebula, Light and Dark, axe-clean. NOVA's mood heat card keeps ZIGoals' words (a protected area). Fictional data.
 */
const AT = `${TODAY}T09:00:00.000Z`;
const records = {
  ...healthRecord(health({moods: {version: 1, days: {[TODAY]: {mood: 4, at: AT}}}} as never)),
  [ENERGY_KEY]: {version: 1, days: {[TODAY]: {energy: 3, at: AT}}, checkin: {moodLook: {'4': {word: 'Bright', symbol: '★'}}}},
};
for (const theme of THEMES) test(`${theme}: own mood words in the Journal's week and the year's key`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, records, '/app/journal');
  const week = page.getByRole('list', {name: 'This week\'s check-ins'});
  await expect(week.locator('.sr-only').filter({hasText: 'energy 3 of 5, mood Bright'})).toHaveCount(1);
  await expect(week).not.toContainText('mood Good');
  await page.locator('summary', {hasText: 'Year: one square a day'}).click();
  const key = page.getByRole('list', {name: 'Key'});
  await expect(key.getByRole('listitem').nth(3)).toHaveText('4 Bright (1)');
  await expect(key.getByRole('listitem').nth(4)).toHaveText('5 Great (0)');
  const findings = await axe(page, page.locator('.year-pixels'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
});
