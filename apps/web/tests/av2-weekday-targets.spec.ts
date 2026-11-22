import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #88, #97, #107; MyFitnessPal's goals by day, Cronometer's Macro Scheduler): Health →
 * Targets → "Targets by weekday": today's weekday gets its own calories and protein, and the Diary's summary compares the
 * day with them ("(Sunday’s)"); a wrong value is refused at its field — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: today's weekday with its own calories, seen in the Diary`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=targets'); await hydrated(page);
  const targets = page.getByRole('form', {name: 'Personal targets'});
  await targets.getByLabel('Calorie target (kcal)').fill('2000');
  await targets.getByRole('button', {name: 'Save targets'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Targets saved'}).first()).toBeVisible();
  await page.getByText('Targets by weekday (optional)', {exact: true}).click();
  const weekday = await page.evaluate(() => new Date().toLocaleDateString('en-US', {weekday: 'long'}));
  const card = page.getByRole('form', {name: 'Targets by weekday'});
  const day = card.getByRole('group', {name: weekday, exact: true});
  await expect(day.getByLabel('Calories (kcal)')).toHaveAttribute('placeholder', '2000');
  await day.getByLabel('Protein (g)').fill('12.5');
  await card.getByRole('button', {name: 'Save weekday targets'}).click();
  await expect(card.getByRole('alert')).toContainText(`${weekday}: Enter a whole number from 0 to 5,000 g protein, or leave it blank.`);
  await expect(day.getByLabel('Protein (g)')).toBeFocused();
  await day.getByLabel('Protein (g)').fill('140');
  await day.getByLabel('Calories (kcal)').fill('2500');
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await card.getByRole('button', {name: 'Save weekday targets'}).click();
  await expect(card.getByRole('status')).toContainText('Weekday targets saved on this device.');
  const record = await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith('zigoals:food-plus:v1')).map(k => JSON.parse(localStorage.getItem(k)!)));
  expect(Object.values(record[0].weekdays)).toEqual([{kcal: 2500, proteinG: 140}]);

  await page.goto('/app/health?view=diary'); await hydrated(page);
  const summary = page.getByRole('region', {name: 'Daily nutrition summary'});
  await expect(summary).toContainText(`2,500 kcal target (${weekday}’s)`);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  // Clearing goes back to the Targets for every day.
  await page.goto('/app/health?view=targets'); await hydrated(page);
  await page.getByText('Targets by weekday (optional)', {exact: true}).click();
  await page.getByRole('button', {name: 'Clear weekday targets'}).click();
  await expect(page.getByRole('form', {name: 'Targets by weekday'}).getByRole('status')).toContainText('every day uses your Targets');
});
