import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {BILLS_KEY} from '../lib/bills/schema';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {WEALTH_SHEET_KEY} from '../lib/wealth-sheet/schema';

/**
 * Session AV lane 2, round 2 (money; Emma, Wallet): an entry well above its payee's usual named in Spending with "That's
 * fine"; a bill due today offered with one tap to record it (never recorded by itself) and Undo; an account below its
 * own line named on Wealth and on Today's one money line — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records; the API offline.
 */
const A1 = '00000000-0000-4000-8000-0000000000a1', at = '2026-11-01T10:00:00.000Z';
for (const theme of THEMES) test(`${theme}: above the usual, a bill to record, a balance line`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const usual = ['2026-09-05', '2026-09-20', '2026-10-04', '2026-10-18'].map(d => entry(d, '42.00', 'Groceries', 'expense', 'Market'));
  await seedDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([...usual, entry('2026-11-12', '168.00', 'Groceries', 'expense', 'Market', 'EUR', 'av2r2-big')]),
    [BILLS_KEY]: {version: 1, dismissed: [], bills: [{id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-14', origin: 'manual', createdAt: '2026-09-01T10:00:00.000Z'}]},
    [ACCOUNTS_KEY]: {version: 1, items: [{id: A1, kind: 'cash', name: 'Checking', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-0000000000a1', date: '2026-11-10', value: '42000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]},
    [WEALTH_SHEET_KEY]: {version: 1, limits: {[A1]: {below: '500.00'}}},
  });
  // Today's money line names the entry and the account, in its one link.
  await page.goto('/app'); await hydrated(page);
  const line = page.locator('.today-money-attention');
  await expect(line).toContainText('Market above its usual');
  await expect(line.getByRole('link')).toHaveCount(1);
  // Spending: the unusual line, and "That's fine".
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page), unusual = box.getByRole('list', {name: 'Entries above their usual'});
  await expect(unusual).toContainText(/Market €168\.00 on .+ is well above its usual €42\.00/);
  const findings = await axe(page, unusual);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await unusual.getByRole('button', {name: /^That's fine: Market/}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.find(e => e.id === 'av2r2-big')?.fine).toBe(true);
  await expect(unusual).toHaveCount(0);
  // Wealth names the account below its line.
  // Session AV lane 2 (on a phone "Accounts, debts & net worth" starts folded, so it is opened first, as tests/g1b-networth-share.spec.ts does, deliberate)
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  await expect(page.getByRole('list', {name: 'Balances past your own lines'})).toContainText(/Checking: €420\.00 on .+ is below your line of €500\.00\./);
  // Upcoming bills: Gym due today, one tap records it, with Undo.
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  const due = bills.locator('.bills-to-record');
  await expect(due).toContainText('Gym');
  await due.getByRole('button', {name: /^Record Gym of /}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.note === 'Gym' && e.date === '2026-11-14').length).toBe(1);
  await expect(due).toContainText('Gym recorded: €30.00');
  await page.getByRole('button', {name: 'Undo recording Gym'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.filter(e => e.note === 'Gym').length).toBe(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
