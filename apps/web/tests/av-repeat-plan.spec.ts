import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, logHealthItem, saveFood, HEALTH_STORAGE_KEY} from '../lib/health';
import {saveMealFromDiary} from '../lib/health-daily';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-REPEAT-PLAN; Cronometer's repeat items): Health → Meals & planning → "Plan a meal"
 * with "Repeat on" Monday and Thursday for 2 weeks makes four ordinary plans, each still logged only when eaten — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const AT = '2026-11-22T08:00:00.000Z';
let h = saveFood(createEmptyHealth(), {id: 'health_fictional-oats-01', name: 'Fictional oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: null, carbsMg: null, fatMg: null}, createdAt: AT, updatedAt: AT});
h = logHealthItem(h, {id: 'health_fictional-log-001', sourceId: 'health_fictional-oats-01', sourceKind: 'food', date: '2026-11-22', meal: 'Breakfast', quantityMilli: 1000}, AT);
const health = saveMealFromDiary(h, 'health_fictional-meal-01', 'Morning bowl', '2026-11-22', 'Breakfast', AT);
const plans = (page: Page) => page.evaluate(k => ((JSON.parse(localStorage.getItem(k) ?? '{}').daily?.plans ?? []) as {date: string; meal: string; loggedAt?: string}[]).map(p => [p.date, p.meal, !!p.loggedAt]).sort(), HEALTH_STORAGE_KEY);
for (const theme of THEMES) test(`${theme}: the morning bowl on Mondays and Thursdays for two weeks`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T08:00:00+01:00')});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('tab', {name: 'Meals & planning', exact: true}).click();
  const form = page.getByRole('form', {name: 'Plan a meal'});
  await form.getByLabel('Planned saved meal').selectOption({label: 'Morning bowl'});
  await form.getByLabel('Plan date').fill('2026-11-23');
  const days = form.getByRole('group', {name: 'Repeat on (optional)'});
  await days.getByLabel('Mon').check();
  await days.getByLabel('Thu').check();
  await form.getByRole('combobox', {name: /^For/}).selectOption('2');
  await expect(form).toContainText('From the plan date: 4 plans, each logged only when you eat it.');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save plan'}).click();
  await expect.poll(() => plans(page)).toEqual([['2026-11-23', 'Breakfast', false], ['2026-11-26', 'Breakfast', false], ['2026-11-30', 'Breakfast', false], ['2026-12-03', 'Breakfast', false]]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
