import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Actual's reconcile, LEDGER #340): What you own → a current account → "Check against
 * my bank": the opening balance starts from the account's own balance, the closing one is typed, entries are ticked
 * until the difference is zero, then marked checked (Spending then shows a quiet "checked" mark) — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z', ACCOUNT = '00000000-0000-4000-8000-0000000f0001';
for (const theme of THEMES) test(`${theme}: check an account against the bank's statement`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [{id: ACCOUNT, kind: 'cash', name: 'Current account', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000f9999', date: '2026-10-01', value: '50000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '42.10', 'Groceries', 'expense', 'Market'), entry('2026-11-11', '7.90', 'Food & drink', 'expense', 'Café'), entry('2026-11-12', '3.00', 'Fun', 'expense', 'Arcade')]),
  });
  await page.goto('/app/wealth'); await hydrated(page);
  // Session AV lane 2 (fixb4; deliberate): on a phone "Accounts, debts & net worth" starts folded, so it is opened first,
  // as tests/av2-money-notices.spec.ts does; the same steps follow.
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  await page.getByRole('button', {name: 'Check Current account against my bank'}).click();
  const panel = page.locator('.money-reconcile');
  await expect(panel.getByRole('heading', {name: 'Check Current account against your bank'})).toBeVisible();
  await expect(panel).toContainText('Started from your own balance on Oct 1, 2026: €500.00.');
  await panel.getByLabel('Statement from').fill('2026-11-01');
  await panel.getByLabel('Closing balance (EUR)').fill('450,00');
  const list = panel.getByRole('list', {name: 'Entries to check'});
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await list.getByRole('checkbox', {name: /Market/}).check();
  await expect(panel.locator('.money-select-total')).toHaveText('1 ticked · −€42.10 · difference −€7.90');
  const mark = panel.getByRole('button', {name: 'Mark 1 as checked'});
  // Session AV lane 2 (fixb4; deliberate): while a difference is left the button is aria-disabled (focusable, it says
  // why), and Playwright's click waits for an enabled button, so it never clicked. As strict: it is aria-disabled, and
  // pressed from the keyboard it says the difference.
  await expect(mark).toHaveAttribute('aria-disabled', 'true');
  await mark.press('Enter');
  await expect(panel.getByRole('status')).toContainText('There is still a difference of −€7.90.');
  await list.getByRole('checkbox', {name: /Café/}).check();
  await expect(panel.locator('.money-select-total')).toHaveText('2 ticked · −€50.00 · it matches your statement');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await panel.getByRole('button', {name: 'Mark 2 as checked'}).click();
  await expect(panel.getByRole('status')).toContainText('2 entries checked against your statement of Nov 14, 2026.');
  await expect(panel.getByRole('button', {name: 'Mark as checked'})).toBeFocused();
  const log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.map(e => e.checked ?? null)).toEqual(['2026-11-14', '2026-11-14', null]);
  await expect(list.getByRole('listitem')).toHaveCount(1);
  // Spending shows the quiet mark on the checked entries.
  await expect(spending(page).getByRole('region', {name: 'This week'}).locator('.money-mark-checked')).toHaveCount(2);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
