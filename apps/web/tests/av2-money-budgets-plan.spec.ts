import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY, type BudgetsRecord} from '../lib/budgets/schema';
import {FI_MODEL_KEY} from '../lib/fi-model/store';

/**
 * Session AV lane 2 (money; YNAB's targets and assign mode, Monarch's flex and non-monthly budgets, groups, CSV and
 * scenarios, Copilot's suggested budgets): Budgets → "Plan November 2026" — a weekly target that makes Groceries
 * underfunded, "Fund what is underfunded" with Undo, the 3-month average offered, Dining flexible, money moved, the month
 * as CSV; then Financial freedom's life event and two scenarios side by side — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a weekly target, quick-assign, flexible, money moved, CSV, scenarios`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('2026-08-03', '250.00'), entry('2026-09-03', '280.00'), entry('2026-10-03', '320.00'), entry('2026-11-02', '60.00'), entry('2026-11-04', '30.00', 'Dining')]),
    [BUDGETS_KEY]: {version: 1, budgets: [{id: 'g', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since: '2026-11'}, {id: 'd', category: 'Dining', currency: 'EUR', monthly: '100.00', rollover: false, since: '2026-11'}]},
  });
  const section = await openWealthSection(page, 'budgets', 'Budgets by category');
  const plan = section.getByRole('region', {name: 'Plan Nov 2026'});
  await expect(plan).toContainText('Underfunded: nothing');
  // Groceries: €70 a week, 5 weeks start in November → €350 needed, €50 underfunded.
  await plan.getByRole('button', {name: 'Plan Groceries'}).click();
  const options = plan.getByRole('form', {name: 'Groceries target and options'});
  await options.getByLabel('Target').selectOption('weekly');
  await options.getByLabel('Amount (EUR)').fill('70');
  await options.getByRole('button', {name: 'Save options'}).click();
  await expect(plan).toContainText('Underfunded: €50.00');
  await expect(plan.getByRole('form', {name: 'Groceries this month'})).toContainText('Suggested: €284.00, your average over the last 3 months.');
  const findings = await axe(page, plan);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await plan.getByRole('button', {name: 'Fund what is underfunded'}).click();
  await expect(plan.getByRole('status')).toContainText('Funded what was underfunded: 1 budget changed for Nov 2026.');
  await expect(plan).toContainText('Underfunded: nothing');
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).budgets[0]).toMatchObject({need: {kind: 'weekly', amount: '70.00'}, months: {'2026-11': '350.00'}});
  // Dining flexible: one "Flexible left".
  await plan.getByRole('button', {name: 'Plan Dining'}).click();
  const dining = plan.getByRole('form', {name: 'Dining target and options'});
  await dining.getByLabel('Bucket').selectOption('flexible');
  await dining.getByRole('button', {name: 'Save options'}).click();
  await expect(plan).toContainText('Flexible left: €70.00 (1 budget)');
  // Move €20 from Dining to Groceries.
  await plan.locator('summary', {hasText: 'Move money between budgets'}).click();
  const move = plan.getByRole('form', {name: 'Move money between budgets'});
  await move.getByLabel('From').selectOption({label: 'Dining (€70.00 left)'});
  await move.getByLabel('To').selectOption({label: 'Groceries'});
  await move.getByLabel('Amount').fill('20');
  await move.getByRole('button', {name: 'Move'}).click();
  await expect(plan).toContainText('Flexible left: €50.00 (1 budget)');
  expect((await readRecord<BudgetsRecord>(page, BUDGETS_KEY)).moves).toMatchObject([{month: '2026-11', from: 'd', to: 'g', amount: '20.00'}]);
  // The month as CSV.
  const [file] = await Promise.all([page.waitForEvent('download'), plan.getByRole('button', {name: 'Download this month (CSV)'}).click()]);
  expect(file.suggestedFilename()).toBe('budgets-2026-11.csv');
  // Financial freedom: a life event, two scenarios side by side.
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  await page.getByRole('group', {name: 'More planning tools'}).getByRole('button', {name: 'Financial freedom'}).click();
  const fi = page.getByRole('region', {name: 'Financial freedom'});
  const event = fi.getByRole('form', {name: 'Add a life event'});
  await event.getByLabel('Event').fill('New car');
  await event.getByLabel('In year').fill('3');
  await event.getByLabel(/^Amount/).fill('15000');
  await event.getByRole('button', {name: 'Add event'}).click();
  // Session AV lane 2 (the planner writes money with its cents, as the rest of Financial freedom does: the whole line, deliberate)
  await expect(fi.locator('.fi-events')).toContainText('New car · −€15,000.00 in year 3');
  const save = fi.getByRole('form', {name: 'Save as a scenario'});
  await save.getByLabel('Scenario name').fill('With the car');
  await save.getByRole('button', {name: 'Save as a scenario'}).click();
  await fi.getByLabel(/^Added each month/).fill('900');
  await save.getByLabel('Scenario name').fill('Saving more');
  await save.getByRole('button', {name: 'Save as a scenario'}).click();
  await expect(fi.locator('.fi-scenario-table tbody tr')).toHaveCount(2);
  expect(((await readRecord<{scenarios: {name: string; inputs: {monthlyContribution: number}}[]}>(page, FI_MODEL_KEY)).scenarios).map(s => [s.name, s.inputs.monthlyContribution])).toEqual([['With the car', 500], ['Saving more', 900]]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
