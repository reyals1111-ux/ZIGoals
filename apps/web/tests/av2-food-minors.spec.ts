import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {HEALTH_STORAGE_KEY, createEmptyHealth, logHealthItem, saveFood} from '../lib/health';
import {saveMealFromDiary} from '../lib/health-daily';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';

/**
 * Session AV lane 2 (food; QUALITY.md "Not fixed" Minors of q3): a meal planned on Mondays and Thursdays for two weeks
 * is one group in Meals & planning (q3 #29), the day's open plan shows above the Diary's meals with "Log it", and the
 * visit report draws each symptom's level over the range (q3 #48). At 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const AT = '2026-11-22T08:00:00.000Z';
// The saved meal is made from an entry on 21 Nov, so the Diary of 23 Nov starts empty.
let h = saveFood(createEmptyHealth(), {id: 'health_food-minor-001', name: 'Fictional oats', brand: '', servingGrams: 60, nutrients: {kcal: 230, proteinMg: 8000, carbsMg: 40_000, fatMg: 4000}, createdAt: AT, updatedAt: AT});
h = logHealthItem(h, {id: 'health_log-minor-001', sourceId: 'health_food-minor-001', sourceKind: 'food', date: '2026-11-21', meal: 'Breakfast', quantityMilli: 1000}, AT);
const health = saveMealFromDiary(h, 'health_saved-minor-001', 'Morning bowl', '2026-11-21', 'Breakfast', AT);
const symptoms = {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}], days: {'2026-11-18': {headache: 3}, '2026-11-20': {headache: 1}}};
for (const theme of THEMES) test(`${theme}: repeat plans grouped, today's plan on the Diary, a symptom chart in the report`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v, s, sv]) => { localStorage.setItem(k!, v!); localStorage.setItem(s!, sv!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health), SYMPTOMS_KEY, JSON.stringify(symptoms)]);
  await page.goto('/app/health?view=planning'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Plan a meal'});
  await form.getByLabel('Planned saved meal').selectOption({label: 'Morning bowl'});
  await form.getByLabel('Plan date').fill('2026-11-23');
  const days = form.getByRole('group', {name: 'Repeat on (optional)'});
  await days.getByLabel('Mon').check();
  await days.getByLabel('Thu').check();
  await form.getByRole('combobox', {name: /^For/}).selectOption('2');
  await form.getByRole('button', {name: 'Save plan'}).click();
  const group = page.locator('.health-plan-group');
  await expect(group).toHaveCount(1);
  await expect(group.locator('summary')).toContainText('Morning bowl Breakfast · 4 days, Nov 23 to Dec 3 · 0 logged');
  await group.locator('summary').click();
  await expect(group.getByRole('button', {name: 'Log planned Morning bowl'})).toHaveCount(4);
  expect(await axe(page, group).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);

  await page.goto('/app/health?view=diary'); await hydrated(page);
  const planned = page.getByRole('region', {name: 'Planned for this day'});
  await expect(planned).toContainText('Breakfast · Morning bowl');
  await planned.getByRole('button', {name: 'Log planned Morning bowl to breakfast'}).click();
  await expect(page.getByRole('region', {name: 'Breakfast diary'})).toContainText('Fictional oats');
  await expect(planned).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});

  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  const builder = page.locator('.report-builder'), include = builder.getByRole('group', {name: 'Include'});
  const boxes = include.getByRole('checkbox');
  await expect(boxes).toHaveCount(9);
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
  await include.getByRole('checkbox', {name: /^Symptoms and factors/}).check();
  await builder.getByRole('button', {name: 'Show the report'}).click();
  const sym = page.getByRole('article', {name: 'Report'}).getByRole('region', {name: 'Symptoms and factors'});
  await expect(sym.getByRole('img', {name: 'Fictional headache: 2 days rated, highest Strong'})).toBeVisible();
  expect(await axe(page, sym).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);
});
