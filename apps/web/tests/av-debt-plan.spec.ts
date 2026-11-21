import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-DEBT-PLAN; Undebt.it): the debt planner's own order, one-off extra payments, the plan
 * month by month, the debt-free date as a countdown, and a tracked plan against the balances recorded since — at 390 and
 * 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Example figures (never stored) and the Showcase
 * (labelled fictional); every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
async function openPlanner(page: Page) {
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  await page.getByRole('group', {name: 'More planning tools'}).getByRole('button', {name: 'Paying off debts'}).click();
  return page.getByRole('region', {name: 'Paying off debts: snowball or avalanche'});
}
for (const theme of THEMES) test(`${theme}: your own order, a one-off payment and the plan month by month, from example figures`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  const planner = await openPlanner(page);
  await planner.getByRole('button', {name: 'Try it with example figures'}).click();
  const avalanche = planner.getByRole('article', {name: 'Avalanche'});
  await expect(avalanche.locator('.debt-plan-countdown')).toHaveText(/^in (\d+ years?( and \d+ months?)?|\d+ months?) · after \d+ months$/);
  const before = (await avalanche.locator('.debt-plan-date').textContent())!;
  // Your own order: the car loan first.
  await planner.locator('summary', {hasText: 'Your own order'}).click();
  await planner.getByRole('button', {name: 'Set my own order'}).click();
  const order = planner.getByRole('list', {name: 'Your order, first paid first'});
  await planner.getByRole('button', {name: 'Move Car loan (example) up'}).click();
  await planner.getByRole('button', {name: 'Move Car loan (example) up'}).click();
  await expect(order.getByRole('listitem').first()).toContainText('Car loan (example)');
  const mine = planner.getByRole('article', {name: 'Your order'});
  await expect(mine).toContainText('The order you chose');
  await expect(mine.locator('.debt-plan-date')).toContainText('Debt-free by');
  // A one-off payment in January brings avalanche's date forward.
  await planner.locator('summary', {hasText: 'One-off extra payments'}).click();
  const add = planner.getByRole('form', {name: 'Add a one-off extra payment'});
  await add.getByLabel('Month').fill('2027-01');
  await add.getByLabel(/^Amount/).fill('2000');
  await add.getByRole('button', {name: 'Add payment'}).click();
  await expect(planner.getByRole('list', {name: 'One-off extra payments'})).toContainText(/Jan 2027: €2,000\.00/);
  await expect(avalanche.locator('.debt-plan-date')).not.toHaveText(before);
  // Month by month, in your order: January shows the one-off payment.
  await planner.locator('summary', {hasText: 'Month by month'}).click();
  await planner.getByRole('radio', {name: 'Your order'}).check();
  const table = planner.getByRole('region', {name: 'Table: Your order month by month'});
  await expect(table.getByRole('columnheader').nth(1)).toContainText('Car loan (example)');
  await expect(table.getByRole('row').nth(1).getByRole('rowheader')).toHaveText('Dec 2026');
  await expect(table.getByRole('row').nth(2).getByRole('rowheader')).toHaveText(/^Jan 2027 \+ €2,000\.00 once$/);
  const findings = await axe(page, planner);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:debt-planner:v1'))).toBeNull(); // example figures are never stored
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('Showcase: the kept tax refund counts; a tracked plan is compared with the balances recorded since', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await loadShowcase(page);
  const planner = await openPlanner(page);
  await expect(planner.locator('summary', {hasText: 'One-off extra payments · 1'})).toBeVisible();
  await expect(planner.getByRole('list', {name: 'One-off extra payments'})).toContainText(/Feb 2027: \$1,000\.00/);
  await planner.getByRole('button', {name: 'Track this plan'}).click();
  await expect(planner.getByRole('status').last()).toHaveText('Tracking Avalanche from today, on this device.');
  const progress = planner.getByRole('region', {name: 'Your plan against what you recorded'});
  await expect(progress).toContainText('Its first payment month is Dec 2026');
  // The Showcase keeps its records in the tab's own sessionStorage (lib/showcase-storage.ts), under its prefix.
  const kept = await page.evaluate(() => JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage).find(k => k.startsWith('zigoals:showcase:') && k.endsWith('zigoals:debt-planner:v1')) ?? '') ?? 'null') as {tracked?: {on: string; strategy: string; currency: string; debts: unknown[]; lumps?: unknown[]}} | null);
  expect(kept?.tracked).toMatchObject({on: '2026-11-23', strategy: 'avalanche', currency: 'USD', lumps: [expect.objectContaining({amount: '1000.00'})]});
  expect(kept?.tracked?.debts).toHaveLength(2);
  // Two months on, with no balance recorded since, the accounts show more owed than the plan expected.
  await page.clock.setSystemTime(new Date('2027-01-20T10:00:00+01:00'));
  const later = await openPlanner(page);
  await expect(later.getByRole('region', {name: 'Your plan against what you recorded'})).toContainText(/After 2 months of payments, Avalanche \(tracked since Nov 2026\) expected \$[\d,.]+ owed in all\. Your accounts show \$[\d,.]+: \$[\d,.]+ behind the plan\./);
  await later.getByRole('button', {name: 'Stop tracking this plan'}).click();
  await expect(later.getByRole('region', {name: 'Your plan against what you recorded'})).toHaveCount(0);
});
