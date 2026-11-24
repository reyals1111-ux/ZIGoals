import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';
import {SUPPLEMENTS_KEY} from '../lib/supplements/schema';

/**
 * Session AV lane 2 (food, LEDGER #92, #98; Bearable's symptoms against doses, Cronometer's custom charts and reports):
 * Health → Insights → Compare offers a dose taken and a symptom as factors, and calories, protein and a symptom's level as
 * outcomes; Settings → Your data → Make a report has "Nutrition (from the food diary)" with the averages a day. At 390
 * and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const symptoms = {version: 1, items: [{id: 'nausea', name: 'Fictional nausea', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}], days: {'2026-11-10': {nausea: 2}, '2026-11-11': {nausea: 0}, '2026-11-12': {nausea: 1}}};
const supplements = {version: 1, items: [{id: 'supp_fictional-dose', name: 'Fictional weekly dose', kind: 'medication', times: ['08:00'], weekdays: 127, createdAt: '2026-11-08T10:00:00.000Z'}],
  log: [{itemId: 'supp_fictional-dose', date: '2026-11-10', slot: '08:00', status: 'taken', at: '2026-11-10T08:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: doses and symptoms in Compare; nutrition in the report`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-14T10:00:00Z')});
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([a, av, b, bv]) => { localStorage.setItem(a!, av!); localStorage.setItem(b!, bv!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [SYMPTOMS_KEY, JSON.stringify(symptoms), SUPPLEMENTS_KEY, JSON.stringify(supplements)]);
  // One diary entry today (a quick add), so the diary's calories and protein are outcomes and the report has nutrition.
  await page.goto('/app/health'); await hydrated(page);
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  await form.getByLabel('Calories (kcal)').fill('600');
  await form.getByRole('group', {name: 'Protein, carbs and fat (optional)'}).getByLabel('Protein (g)').fill('35');
  await form.getByRole('button', {name: 'Log calories'}).click();
  await expect(page.getByText('600 kcal and protein logged.').first()).toBeVisible();

  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Compare: does one thing go with another?').click();
  const factor = page.getByLabel('On days with…'), outcome = page.getByLabel('…what was');
  await expect(factor.locator('optgroup[label="Supplements and medication"] option')).toHaveText(['Took “Fictional weekly dose”']);
  await expect(factor.locator('optgroup[label="Symptoms and factors"] option')).toHaveText(['Had “Fictional nausea” (level 1 or more)']);
  await expect(outcome.locator('option', {hasText: 'Calories logged'})).toHaveCount(1);
  await expect(outcome.locator('option', {hasText: 'Fictional nausea (0–3)'})).toHaveCount(1);
  await factor.selectOption({label: 'Took “Fictional weekly dose”'});
  await outcome.selectOption({label: 'Fictional nausea (0–3)'});
  const explorer = page.locator('.compare-explorer');
  await expect(explorer).toContainText(/\d+ days? with/);
  expect(await axe(page, explorer).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);

  await page.goto('/app/settings/data'); await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  const builder = page.locator('.report-builder'), include = builder.getByRole('group', {name: 'Include'});
  const boxes = include.getByRole('checkbox');
  await expect(boxes).toHaveCount(9);
  for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck();
  await include.getByRole('checkbox', {name: /^Nutrition \(from the food diary\)/}).check();
  await builder.getByRole('button', {name: 'Show the report'}).click();
  const sheet = page.getByRole('article', {name: 'Report'});
  const nutrition = sheet.getByRole('region', {name: 'Nutrition'});
  await expect(nutrition).toContainText('1 day with food logged');
  await expect(nutrition.getByRole('row', {name: /^Calories 600 kcal 1$/})).toBeVisible();
  await expect(nutrition.getByRole('row', {name: /^Protein 35 g 1$/})).toBeVisible();
  await expect(nutrition.getByRole('row', {name: /^Fiber — 0$/})).toBeVisible();
  expect(await axe(page, sheet).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
