import {expect, test} from '@playwright/test';
import {NUTRIENT_EXTRAS_KEY, emptyNutrientExtras, rememberExtras} from '../lib/health-vitamins/extras';
import {TODAY, healthRecord, openHealth, withDiary} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (rest, LEDGER #93; Cronometer's many nutrients): the offline library's further nutrients (CoFID's
 * side file) kept with a food show in Health → Targets → Micronutrients → "More from your foods", each in its own unit
 * (g, mg, µg) with its general reference (cholesterol as a limit) — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. The side file itself is checked in lib/food-generic/av2-more.test.ts. Fictional data.
 */
const diary = withDiary([{date: TODAY, meal: 'Breakfast'}]);
const extras = rememberExtras(emptyNutrientExtras(), ['health_diary-ap-0000'], 'health_food-ap-oats', {seleniumUg: 12, phosphorusMg: 410_000, waterMg: 8_200_000, cholesterolMg: 0});

for (const theme of THEMES) test(`${theme}: further nutrients from a library food, in their own units`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, {...healthRecord(diary), [NUTRIENT_EXTRAS_KEY]: extras});
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Targets', exact: true}).click();
  const more = page.getByRole('region', {name: 'More micronutrients'});
  await expect(more.getByRole('heading', {name: 'More from your foods'})).toBeVisible({timeout: 20_000});
  await expect(more).toContainText('Selenium');
  await expect(more).toContainText('12 µg');
  await expect(more).toContainText('general reference 55 µg a day');
  await expect(more).toContainText('410 mg');
  await expect(more).toContainText('Water');
  await expect(more).toContainText('8.2 g');
  await expect(more).toContainText('general reference at most 300 mg a day');
  await expect(more.getByRole('progressbar', {name: 'Selenium: 12 of 55 µg'})).toBeVisible();
  const findings = await axe(page, more);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
