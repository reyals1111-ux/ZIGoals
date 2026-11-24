import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, readRecord, seedDevice, TODAY} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {DEBT_PLANNER_KEY, type DebtPlannerRecord} from '../lib/debt-planner/store';
import {BILLS_KEY, type BillsRecord} from '../lib/bills/schema';

/**
 * Session AV lane 2 (money; Undebt.it): the planner's further orders (Cash Flow Index), Debt Blaster, "debt-free by a
 * month", one consolidation loan and the plan as CSV; Wealth's "What you owe" at a glance (owed after a payment, paid
 * off, the trend); the bill tracker's "Mark paid", history, autopay and the debt minimum beside the bills — at 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records; the API offline.
 */
const AT = '2026-01-01T09:00:00.000Z';
const loan = (id: string, name: string, snaps: [string, string][], payments: [string, string][] = []) => ({id, kind: 'loan', name, currency: 'EUR', ratePercent: name === 'Car loan' ? '6.5' : '19.9',
  snapshots: snaps.map(([date, value], i) => ({id: id.replace(/.{4}$/, `${i}aaa`), date, value, decimals: 2})), payments: payments.map(([date, value], i) => ({id: id.replace(/.{4}$/, `${i}bbb`), date, value, decimals: 2})), createdAt: AT, updatedAt: AT});
const CAR = '00000000-0000-4000-8000-00000000c001', CARD = '00000000-0000-4000-8000-00000000c002', OLD = '00000000-0000-4000-8000-00000000c003';
for (const theme of THEMES) test(`${theme}: more orders, Debt Blaster, debt-free by, consolidation, debts at a glance, the bill tracker`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [loan(CAR, 'Car loan', [['2025-11-01', '900000'], ['2026-11-01', '600000']], [['2026-11-05', '25000']]), loan(CARD, 'Card', [['2026-10-01', '150000']]), loan(OLD, 'Old store card', [['2026-02-01', '80000'], ['2026-09-01', '0']])]},
    [DEBT_PLANNER_KEY]: {version: 1, currency: 'EUR', extra: '50.00', debts: {[CAR]: {minimum: '250.00'}, [CARD]: {minimum: '45.00'}}},
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-03', origin: 'manual', createdAt: '2026-06-01T09:00:00.000Z'}]},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-10-03', '30.00', 'Health', 'expense', 'Gym')]),
  });
  await page.goto('/app/wealth/calculator'); await hydrated(page);
  await page.getByRole('group', {name: 'More planning tools'}).getByRole('button', {name: 'Paying off debts'}).click();
  const planner = page.getByRole('region', {name: 'Paying off debts: snowball or avalanche'});
  await planner.locator('summary', {hasText: 'More orders'}).click();
  await planner.getByRole('button', {name: 'Use Cash Flow Index (lowest first)'}).click();
  await expect(planner.getByRole('article', {name: 'Your order'})).toBeVisible();
  expect(await readRecord<DebtPlannerRecord>(page, DEBT_PLANNER_KEY)).toMatchObject({method: 'cfi', shown: 'custom'});
  await planner.locator('summary', {hasText: 'Debt Blaster'}).click();
  const blast = planner.getByRole('form', {name: 'Debt Blaster'});
  await blast.getByLabel(/^Raise the extra by/).fill('25');
  await blast.getByRole('button', {name: 'Use it in my plan'}).click();
  expect((await readRecord<DebtPlannerRecord>(page, DEBT_PLANNER_KEY)).stepUp).toEqual({amount: '25.00', every: 3});
  await planner.locator('summary', {hasText: 'Debt-free by a month?'}).click();
  await planner.getByLabel('Debt-free by').fill('2027-12');
  await expect(planner.locator('.debt-tools')).toContainText(/An extra of about €[\d,.]+ a month on top of the minimums gets there/);
  await planner.locator('summary', {hasText: 'One consolidation loan?'}).click();
  await planner.getByLabel('Yearly rate (%)').fill('8.9');
  await expect(planner.locator('.debt-tools')).toContainText(/One loan: €[\d,.]+ a month for 60 months/);
  const findings = await axe(page, planner.locator('.debt-tools'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const [csv] = await Promise.all([page.waitForEvent('download'), planner.getByRole('button', {name: 'Download the plan (CSV)'}).click()]);
  expect(csv.suggestedFilename()).toBe(`debt-plan-${TODAY}.csv`);
  // Wealth's "What you owe": owed after the payment, paid off, a trend.
  await page.goto('/app/wealth'); await hydrated(page);
  // Session AV lane 2 (on a phone "Accounts, debts & net worth" starts folded, so it is opened first, as tests/g1b-networth-share.spec.ts does, deliberate)
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  const glance = page.getByRole('group', {name: 'YOUR DEBTS AT A GLANCE'});
  await expect(glance).toContainText('€7,250.00 owed');
  await expect(glance).toContainText(/debt-free by \w+ \d{4}/);
  await expect(page.locator('.accounts-owed-now').first()).toContainText('after 1 payment since (until your next statement)');
  await glance.locator('summary', {hasText: 'Paid off (1)'}).click();
  await expect(glance).toContainText('Old store card paid off on');
  // The bill tracker: Gym marked paid in the money log, the car loan's minimum already paid this month.
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  await bills.locator('summary', {hasText: 'Bill tracker'}).click();
  const tracker = bills.getByRole('region', {name: 'Bill tracker'});
  await expect(tracker).toContainText('Car loan · debt minimum · a payment is recorded this month');
  await tracker.getByRole('button', {name: /^Mark Gym of .* paid$/}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.note === 'Gym').length).toBe(2);
  await tracker.getByRole('button', {name: 'Mark the Card minimum paid'}).click();
  await expect(tracker.getByRole('status')).toContainText('Card: a payment of €45.00 recorded');
  await tracker.getByLabel('Paid automatically').check();
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills[0]!.autopay).toBe(true);
  await expect(tracker.getByRole('list', {name: 'Gym: the last 12 months'})).toContainText('paid');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
