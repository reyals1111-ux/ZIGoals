import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {noSideScroll, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi, LEDGER #298): Wealth → Your wealth over time → Net worth by source → "What
 * moved your net worth in Nov 2026": the accounts that moved it most since the end of last month, up or down, each with
 * its amount (a debt that grew moves it down), and a new account named apart — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z';
const acct = (id: string, kind: string, name: string, snaps: [string, string][]) => ({id, kind, name, currency: 'EUR', snapshots: snaps.map(([date, value], i) => ({id: `${id.slice(0, -4)}${9000 + i}`, date, value, decimals: 2})), payments: [], createdAt: AT, updatedAt: AT});
for (const theme of THEMES) test(`${theme}: what moved net worth this month`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[ACCOUNTS_KEY]: {version: 1, items: [
    acct('00000000-0000-4000-8000-0000000f0001', 'savings', 'Savings', [['2026-10-20', '500000'], ['2026-11-12', '560000']]),
    acct('00000000-0000-4000-8000-0000000f0002', 'credit-card', 'Card', [['2026-10-30', '20000'], ['2026-11-13', '45000']]),
    acct('00000000-0000-4000-8000-0000000f0003', 'savings', 'New pot', [['2026-11-02', '100000']]),
  ]}});
  await page.goto('/app/wealth'); await hydrated(page);
  const movers = page.getByRole('region', {name: 'What moved your net worth in Nov 2026'});
  if (!(await movers.isVisible())) await openDeskFold(page, 'Your wealth over time');
  await expect(movers).toBeVisible();
  await expect(movers.locator('.networth-movers-total')).toHaveText('+€350.00 in EUR since the end of last month, from 2 accounts and sources.');
  const items = movers.locator('.networth-movers-list li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('Savings');
  await expect(items.first()).toContainText('+€600.00');
  await expect(items.nth(1)).toContainText('Card (a debt: it grew)');
  await expect(items.nth(1)).toContainText('−€250.00');
  await expect(movers).toContainText('New this month in EUR, so not counted as a move: New pot.');
  const findings = await axe(page, movers);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
