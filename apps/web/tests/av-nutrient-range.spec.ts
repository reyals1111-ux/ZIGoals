import {expect, test} from '@playwright/test';
import {createEmptyHealth, logHealthItem, saveFood, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {addLocalDays} from '../lib/local-date';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-NUTRIENT-RANGE; Cronometer's chosen range): the nutrient report averages iron over 7
 * days (8 mg), 30 days (6 mg, from the 14 days with a value) and a chosen From–To (the first week alone: 4 mg) — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const TODAY = '2026-11-23', AT = '2026-11-01T10:00:00.000Z';
let h: HealthData = saveFood(createEmptyHealth(), {id: 'health_fictional-bowl-01', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: {kcal: 500, proteinMg: 20000, carbsMg: 60000, fatMg: 15000, ironMg: 4}, createdAt: AT, updatedAt: AT});
for (let i = 0; i < 14; i++) h = logHealthItem(h, {id: `health_fictional-bowl-${String(i).padStart(2, '0')}a`, sourceId: 'health_fictional-bowl-01', sourceKind: 'food', date: addLocalDays(TODAY, -i), meal: 'Lunch', quantityMilli: i < 7 ? 2000 : 1000}, AT);
for (const theme of THEMES) test(`${theme}: iron over 7 days, 30 days and a chosen week`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T12:00:00+01:00`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(h)] as const);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Targets', exact: true}).click();
  await page.getByRole('button', {name: 'Open the nutrient report'}).click();
  const report = page.locator('[data-region="nutrient-report"]'), period = report.getByRole('group', {name: 'Report period'});
  const iron = report.getByRole('region', {name: 'Minerals'}).getByRole('listitem').filter({hasText: 'Iron'});
  await period.getByRole('button', {name: '7-day average'}).click();
  await expect(iron).toContainText(/8 mg.*average of 7 days with a value, of 7 logged/s);
  await period.getByRole('button', {name: '30 days'}).click();
  await expect(iron).toContainText(/6 mg.*average of 14 days with a value, of 14 logged/s);
  await expect(report.getByRole('status').filter({hasText: 'Averages of'})).toContainText('(30 days)');
  // q3 #47 (Minor): averages are rounded (never "130.997 g"), and Sources reads the same 30 days as the averages.
  expect(await report.locator('.health-micro-list small').allTextContents()).not.toContainEqual(expect.stringMatching(/\d\.\d{2,} (g|mg|µg)/));
  await iron.getByRole('button', {name: 'Where Iron came from'}).click();
  await expect(iron.getByRole('group', {name: 'Where Iron came from'})).toContainText('From the same 30 days as the averages.');
  await expect(iron.getByRole('group', {name: 'Days to read'})).toHaveCount(0);
  await period.getByRole('button', {name: 'Choose dates'}).click();
  const dates = report.getByRole('group', {name: 'Dates to average'});
  await dates.getByLabel('From').fill('2026-11-10');
  await dates.getByLabel('To').fill('2026-11-16');
  await expect(iron).toContainText(/4 mg.*average of 7 days with a value, of 7 logged/s);
  const findings = await axe(page, report);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
