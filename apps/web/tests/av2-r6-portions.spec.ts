import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {FOOD_PLUS_KEY} from '../lib/food-plus/schema';

/**
 * Session AV lane 2, round 6 (r6-body; Lifesum, LEDGER #418): Health → Diary shows no portion counter until one is chosen;
 * "Choose what to count" turns on Vegetables and Fish and adds an own "Nuts"; one tap counts a portion for the diary's
 * day (kept as `portions` in `zigoals:food-plus:v1`); an aim of 5 a day reads "2 today · your aim 5 a day"; nothing says
 * "off track" — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const portions = (page: import('@playwright/test').Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? 'null') as {portions?: unknown} | null)?.portions ?? null, FOOD_PLUS_KEY);
for (const theme of THEMES) test(`${theme}: portion counters in the diary`, async ({page, isMobile}) => {
  await page.clock.install({time: new Date('2026-11-23T12:00:00+01:00')});
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=diary'); await hydrated(page);
  const box = page.locator('section.r6-portions');
  await expect(box).toContainText('None is on until you choose it');
  await expect(box.getByRole('button', {name: /^One more/})).toHaveCount(0);
  await box.getByRole('button', {name: 'Choose what to count'}).click();
  await box.getByRole('checkbox', {name: 'Vegetables'}).check();
  await box.getByRole('checkbox', {name: 'Fish'}).check();
  await box.getByLabel(/A counter of your own/).fill('Nuts');
  await box.getByRole('button', {name: 'Add', exact: true}).click();
  await box.getByRole('group', {name: 'Aim for Vegetables'}).getByLabel('Vegetables: portions').fill('5');
  await box.getByRole('button', {name: 'Save the aim for Vegetables'}).click();
  await box.getByRole('button', {name: 'Done'}).click();
  await expect(box.getByRole('button', {name: 'Change your counters'})).toBeFocused();

  await box.getByRole('button', {name: 'One more: Vegetables'}).click();
  await box.getByRole('button', {name: 'One more: Vegetables'}).click();
  await box.getByRole('button', {name: 'One more: Nuts'}).click();
  await expect(box.locator('.r6-portion').filter({hasText: 'Vegetables'})).toContainText('2 today · your aim 5 a day');
  await expect.poll(() => portions(page)).toMatchObject({counters: [{id: 'veg', aim: {n: 5, per: 'day'}}, {id: 'fish'}, {name: 'Nuts'}], days: {'2026-11-23': {veg: 2}}});
  await box.getByRole('button', {name: 'One fewer: Vegetables'}).click();
  await expect(box.locator('.r6-portion').filter({hasText: 'Vegetables'})).toContainText('1 today');
  await expect(box).not.toContainText(/off track|behind|missed/i);
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
