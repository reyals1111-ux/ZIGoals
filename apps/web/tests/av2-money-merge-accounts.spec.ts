import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY, type Accounts} from '../lib/accounts/schema';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Data Cleanup, LEDGER #387): What you own → "Merge two": merge an old account
 * into its new name — the plan says what moves, the entries of its bank-file name are renamed, an exact double (same day,
 * amount and reference) is offered for removal; after the merge the old one is archived with its history, and Undo puts
 * both back — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
const AT = '2026-01-01T09:00:00.000Z', OLD = '00000000-0000-4000-8000-0000000d0001', NEW = '00000000-0000-4000-8000-0000000d0002';
const account = (id: string, name: string, date: string, value: string, sid: string) => ({id, kind: 'cash', name, currency: 'EUR', snapshots: [{id: sid, date, value, decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});
for (const theme of THEMES) test(`${theme}: merge two accounts, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [account(NEW, 'ING Betaalrekening', '2026-11-01', '95000', '00000000-0000-4000-8000-0000000d9002'), account(OLD, 'ING Current', '2026-09-30', '90000', '00000000-0000-4000-8000-0000000d9001')]},
    [MONEY_LOG_KEY]: moneyLog([{...entry('2026-09-02', '20.00'), account: 'ING Current', ref: 'R1'}, {...entry('2026-09-03', '35.00'), account: 'ING Current', ref: 'R2'}, {...entry('2026-09-02', '20.00'), account: 'ING Betaalrekening', ref: 'R1'}]),
  });
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: 'Merge two accounts in What you own'}).click();
  const panel = page.locator('.money-merge');
  await expect(panel.getByRole('heading', {name: 'Merge two accounts · What you own'})).toBeVisible();
  await panel.getByLabel('Merge', {exact: true}).selectOption({label: 'ING Current (EUR)'});
  await panel.getByLabel('into').selectOption({label: 'ING Betaalrekening (EUR)'});
  await expect(panel.getByRole('list', {name: 'What the merge moves'})).toContainText('1 balance of ING Current goes to ING Betaalrekening.');
  await expect(panel.getByRole('checkbox', {name: /^ING Current/})).toBeChecked();
  await expect(panel).toContainText('2 entries take the name “ING Betaalrekening”.');
  await expect(panel.getByRole('checkbox', {name: /Remove the copy of Groceries/})).toBeChecked();
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Merge ING Current into ING Betaalrekening'}).click();
  await expect(panel.getByRole('status')).toHaveText('ING Current merged into ING Betaalrekening: 1 balance and 1 entry moved, 1 double removed. ING Current is archived with its own history.');
  await expect(panel.getByRole('heading', {name: 'Merge two accounts · What you own'})).toBeFocused();
  const accounts = await readRecord<Accounts>(page, ACCOUNTS_KEY);
  expect(accounts.items.find(a => a.id === OLD)!.archivedAt).toBeTruthy();
  expect(accounts.items.find(a => a.id === NEW)!.snapshots.map(s => s.date)).toEqual(['2026-09-30', '2026-11-01']);
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.map(e => [e.ref, e.account])).toEqual([['R2', 'ING Betaalrekening'], ['R1', 'ING Betaalrekening']]);
  await page.getByRole('button', {name: 'Undo merging ING Current into ING Betaalrekening'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.length).toBe(3);
  expect((await readRecord<Accounts>(page, ACCOUNTS_KEY)).items.find(a => a.id === OLD)!.archivedAt).toBeUndefined();
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
