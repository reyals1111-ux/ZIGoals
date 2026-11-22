import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {HEALTH_NUMBERS_KEY} from '../lib/health-numbers/store';

/**
 * Session AV lane 2 (health r3; LEDGER #284, Carb Manager): Health → Measurements → Your numbers saves Glucose 5.2 mmol/L
 * "Before lunch" at 12:00 and Glucose 7.8 and Ketones 0.6 "After lunch" at 13:45; the Diary's Lunch shows the three
 * readings as typed, with no range, verdict or index — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways
 * scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
for (const theme of THEMES) test(`${theme}: glucose and ketones beside a meal`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T15:00:00Z')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/health?tab=measurements'); await settle(page);
  await page.getByText('Your numbers: blood pressure and lab values', {exact: true}).click();
  const lab = page.getByRole('form', {name: 'Add lab values'});
  await expect(lab.getByLabel('With a meal (optional)')).toHaveValue('');

  await lab.getByLabel('With a meal (optional)').selectOption('before:Lunch');
  await lab.getByLabel('Time taken (optional)').fill('12:00');
  await lab.getByLabel('Name', {exact: true}).fill('Glucose');
  await lab.getByLabel('Value', {exact: true}).fill('5.2');
  await lab.getByLabel('Unit, as on the sheet').fill('mmol/L');
  await lab.getByRole('button', {name: /^Save/}).click();
  await expect(page.getByRole('status').filter({hasText: 'before lunch: shown beside that meal in the Diary'})).toBeVisible();

  await lab.getByLabel('With a meal (optional)').selectOption('after:Lunch');
  await lab.getByLabel('Time taken (optional)').fill('13:45');
  await lab.getByLabel('Name', {exact: true}).fill('Glucose');
  await lab.getByLabel('Value', {exact: true}).fill('7.8');
  await lab.getByLabel('Unit, as on the sheet').fill('mmol/L');
  await lab.getByRole('button', {name: 'Another value'}).click();
  await lab.getByLabel('Name', {exact: true}).nth(1).fill('Ketones');
  await lab.getByLabel('Value', {exact: true}).nth(1).fill('0.6');
  await lab.getByLabel('Unit, as on the sheet').nth(1).fill('mmol/L');
  await lab.getByRole('button', {name: 'Save 2 values'}).click();
  await expect(page.getByRole('status').filter({hasText: 'after lunch'})).toBeVisible();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HEALTH_NUMBERS_KEY);
  expect(stored.entries.map((e: {name: string; meal?: string; mealWhen?: string; time?: string}) => [e.name, e.meal, e.mealWhen, e.time])).toEqual([['Glucose', 'Lunch', 'before', '12:00'], ['Glucose', 'Lunch', 'after', '13:45'], ['Ketones', 'Lunch', 'after', '13:45']]);
  // Session AV lane 2 (review B3B-7, deliberate): the time in the locale's hour cycle (en-US here: 1:45 PM).
  await expect(page.locator('.your-numbers-marker').filter({hasText: 'Glucose'})).toContainText('after lunch, 1:45 PM');

  await page.goto('/app/health?view=diary'); await settle(page);
  const lunch = page.getByRole('region', {name: /^Lunch diary/});
  const line = lunch.locator('.r3-meal-readings');
  await expect(line).toHaveText('Your readings: Glucose 5.2 mmol/L before (12:00 PM) · Glucose 7.8 mmol/L after (1:45 PM) · Ketones 0.6 mmol/L after (1:45 PM). As you typed them in Your numbers.');
  await expect(line).not.toContainText(/range|inside|outside|index|GKI|normal|high|low/i);
  await expect(page.getByRole('region', {name: /^Breakfast diary/}).locator('.r3-meal-readings')).toHaveCount(0);
  const findings = await axe(page, lunch);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
