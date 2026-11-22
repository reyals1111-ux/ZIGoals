import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {noSideScroll, readRecord, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {BILLS_KEY, type BillsRecord} from '../lib/bills/schema';
import {WEALTH_SHEET_KEY, type WealthSheet} from '../lib/wealth-sheet/schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's credit card dashboard, LEDGER #293): a credit card's Sheet keeps its
 * limit, statement day and due day; its row in What you owe then says what is used of the limit, the share, what is
 * available and the next days; "Add a payment reminder" puts an ordinary bill in Upcoming bills — at 390 and 1440 in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026; fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z', CARD = '00000000-0000-4000-8000-0000000e0001';
for (const theme of THEMES) test(`${theme}: a credit card's limit, share used, statement and due day, and a reminder`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[ACCOUNTS_KEY]: {version: 1, items: [{id: CARD, kind: 'credit-card', name: 'Everyday Card', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000e9999', date: '2026-11-10', value: '45000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]}});
  await page.goto('/app/wealth'); await hydrated(page);
  // Before anything is typed, the row teaches.
  await expect(page.locator('.accounts-card-line')).toHaveText('Add its limit and days under Sheet to see how much of it is used.');
  await page.getByRole('button', {name: 'Sheet options for Everyday Card'}).click();
  const form = page.getByRole('form', {name: 'Everyday Card: limit and days'});
  await form.getByLabel(/^Credit limit/).fill('2000');
  await form.getByLabel(/^Statement day/).fill('5');
  await form.getByLabel(/^Payment due day/).fill('25');
  await form.getByRole('button', {name: 'Keep', exact: true}).click();
  expect((await readRecord<WealthSheet>(page, WEALTH_SHEET_KEY)).cards).toEqual({[CARD]: {limit: '2000.00', statementDay: 5, dueDay: 25}});
  await expect(page.locator('.accounts-card-line')).toHaveText('€450.00 of €2,000.00 used (23%) · €1,550.00 available · statement Dec 5, 2026 · due Nov 25, 2026');
  // A payment reminder on the due day, for what is owed now.
  await form.getByRole('button', {name: 'Add a payment reminder on Nov 25, 2026'}).click();
  await expect(form.getByRole('status')).toContainText('A payment reminder for €450.00 on Nov 25, 2026 is in Upcoming bills.');
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills).toEqual([expect.objectContaining({id: `card-${CARD}`, title: 'Everyday Card payment', amount: '450.00', cadence: 'monthly', nextDue: '2026-11-25'})]);
  await expect(form.getByText('A payment reminder is in Upcoming bills.', {exact: true})).toBeFocused();
  // A day outside 1–31 is refused in plain words.
  await form.getByLabel(/^Statement day/).fill('40');
  await form.getByRole('button', {name: 'Keep', exact: true}).click();
  await expect(form.getByRole('alert')).toHaveText('A day of the month is 1 to 31.');
  const findings = await axe(page, page.locator('.accounts-section'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
