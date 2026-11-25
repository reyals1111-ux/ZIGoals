import {expect, test, type Page} from '@playwright/test';
import {applyTheme, axe} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openWealthSection, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {openPhoneRow} from './phone-length-folds';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {BILLS_KEY, type BillsRecord} from '../lib/bills/schema';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_REMOVED_KEY, type MoneyRemoved} from '../lib/money-log/removed';
import {WEALTH_SHEET_KEY} from '../lib/wealth-sheet/schema';

/**
 * Session AW, round 7 X7 (money; Cashew, Money Manager; LEDGER #461–#464), at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. The clock is Saturday 14 November 2026 (tests/ap/ap-money-fixtures.ts); records
 * are fictional. Nothing here moves, so there is no motion to switch off.
 * - #463 Copy an entry (with its split; a transfer copies both sides) dated today or a chosen day, with Undo;
 * - #461 Removed recently behind Spending's folds ("More about your money" on a phone): Put back with its split and its
 *   transfer twin, and Empty now after one more tap; never in Export everything;
 * - #462 a bill that ends ("3 of 24 left"), and an ended bill that has left Upcoming but stays in the Bill tracker;
 * - #464 a credit card's next payment and so far this statement, from the person's own entries.
 */
const THEMES = ['nebula', 'light', 'dark'] as const;
const AT = '2026-01-01T09:00:00.000Z';
const serious = async (page: Page, scope: ReturnType<Page['locator']>) => (await axe(page, scope)).filter(v => v.impact === 'serious' || v.impact === 'critical');
async function openRemoved(page: Page) {
  await openPhoneRow(page, 'More about your money', spending(page));
  const fold = spending(page).locator('.money-removed-fold');
  if (await fold.getAttribute('open') === null) await fold.locator('summary').click();
  return fold;
}

for (const theme of THEMES) test(`${theme}: copy an entry, then remove and put back (its split, its transfer twin), then empty`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const split = {...entry('2026-11-13', '12.50', 'Groceries', 'expense', 'Market', 'EUR', 'x7-split'), parts: [{amount: '8.00', category: 'Groceries'}, {amount: '4.50', category: 'Home'}]};
  const out = {...entry('2026-11-12', '200.00', 'Other', 'expense', 'To savings', 'EUR', 'x7-out'), transfer: 'x7-in'};
  const into = {...entry('2026-11-12', '200.00', 'Other income', 'income', 'From checking', 'EUR', 'x7-in'), transfer: 'x7-out'};
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([split, out, into])});
  await page.goto('/app/wealth'); await hydrated(page);
  const section = spending(page);

  // #463: Copy, dated today; Undo takes it out again.
  await section.getByRole('button', {name: 'Copy Groceries 12.50 EUR on 2026-11-13'}).click();
  const copyForm = section.getByRole('form', {name: 'Copy Groceries €12.50'});
  await expect(copyForm.getByLabel('Copy to the day')).toBeFocused();
  await expect(copyForm.getByLabel('Copy to the day')).toHaveValue('2026-11-14');
  expect(await serious(page, copyForm)).toEqual([]);
  await copyForm.getByRole('button', {name: 'Copy', exact: true}).click();
  await expect(section.locator('.spending-status')).toHaveText('Copied: Groceries €12.50 on Sat, Nov 14.');
  let log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries).toHaveLength(4);
  expect(log.entries[3]).toMatchObject({kind: 'expense', amount: '12.50', category: 'Groceries', note: 'Market', date: '2026-11-14', parts: [{amount: '8.00', category: 'Groceries'}, {amount: '4.50', category: 'Home'}]});
  expect(log.entries[3]!.id).not.toBe('x7-split');
  await page.getByRole('button', {name: 'Undo the copy of Groceries'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.length).toBe(3);
  // A chosen day; a later day is refused in plain words.
  await section.getByRole('button', {name: 'Copy Groceries 12.50 EUR on 2026-11-13'}).click();
  await copyForm.getByLabel('Copy to the day').fill('2026-11-01');
  await copyForm.getByRole('button', {name: 'Copy', exact: true}).click();
  await expect(section.locator('.spending-status')).toHaveText('Copied: Groceries €12.50 on Sun, Nov 1.');
  // A transfer copies both sides, paired with each other.
  await section.getByRole('button', {name: 'Copy Other income 200.00 EUR on 2026-11-12'}).click();
  await section.getByRole('form', {name: /^Copy Other income/}).getByRole('button', {name: 'Copy', exact: true}).click();
  await expect(section.locator('.spending-status')).toHaveText('Copied: Other income €200.00 on Sat, Nov 14, both sides of the transfer.');
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  const copies = log.entries.filter(e => e.date === '2026-11-14');
  expect(copies.map(e => e.kind).sort()).toEqual(['expense', 'income']);
  expect(copies[0]!.transfer).toBe(copies[1]!.id);
  expect(copies[1]!.transfer).toBe(copies[0]!.id);

  // #461: Remove keeps the entry in Removed recently; Put back restores it with its split.
  await section.getByRole('button', {name: 'Remove Groceries 12.50 EUR on 2026-11-13'}).click();
  await expect(page.getByText('Removed: Groceries €12.50.')).toBeVisible();
  const fold = await openRemoved(page);
  const item = fold.locator('.money-removed-list li').filter({hasText: 'Market'});
  await expect(item).toContainText('kept 30 more days, until Dec 14, 2026 · split in 2');
  expect(await serious(page, fold)).toEqual([]);
  await item.getByRole('button', {name: 'Put back Groceries 12.50 EUR on 2026-11-13'}).click();
  await expect(section.locator('.spending-status')).toHaveText('Put back: Groceries €12.50 on Nov 13, 2026.');
  await expect(fold.getByRole('heading', {name: 'Removed in the last 30 days'})).toBeFocused();
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.find(e => e.id === 'x7-split')).toEqual(split);
  // Both sides of a transfer removed: Put back brings the pair back together.
  await section.getByRole('button', {name: 'Remove Other 200.00 EUR on 2026-11-12'}).click();
  await expect(fold.locator('.money-removed-list li')).toHaveCount(1);
  await section.getByRole('button', {name: 'Remove Other income 200.00 EUR on 2026-11-12'}).first().click();
  await expect(fold.locator('.money-removed-list li')).toHaveCount(2);
  await fold.getByRole('button', {name: 'Put back Other 200.00 EUR on 2026-11-12'}).click();
  await expect(section.locator('.spending-status')).toHaveText('Put back: Other €200.00 on Nov 12, 2026, with the other side of its transfer.');
  log = await readRecord<MoneyLog>(page, MONEY_LOG_KEY);
  expect(log.entries.find(e => e.id === 'x7-out')!.transfer).toBe('x7-in');
  expect(log.entries.find(e => e.id === 'x7-in')!.transfer).toBe('x7-out');
  // Empty now asks once more, then clears the list for good.
  await section.getByRole('button', {name: 'Remove Groceries 12.50 EUR on 2026-11-13'}).click();
  await expect(fold.locator('.money-removed-list li')).toHaveCount(1);
  await fold.getByRole('button', {name: 'Empty now…'}).click();
  await fold.getByRole('group', {name: 'Empty Removed recently'}).getByRole('button', {name: 'Empty now', exact: true}).click();
  await expect(section.locator('.spending-status')).toHaveText('Removed recently is empty: 1 entry gone for good.');
  await expect(fold).toContainText('Nothing removed in the last 30 days.');
  expect((await readRecord<MoneyRemoved>(page, MONEY_REMOVED_KEY)).items).toEqual([]);
  // Keyboard: Copy opens with Enter, and Cancel closes it.
  await section.getByRole('button', {name: /^Copy Other 200\.00 EUR/}).first().focus();
  await page.keyboard.press('Enter');
  await expect(section.getByRole('form', {name: /^Copy Other/})).toBeVisible();
  await section.getByRole('form', {name: /^Copy Other/}).getByRole('button', {name: 'Cancel'}).click();
  await expect(section.getByRole('form', {name: /^Copy Other/})).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});

for (const theme of THEMES) test(`${theme}: a bill that ends — 3 of 24 left, and an ended bill leaves Upcoming`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[BILLS_KEY]: {version: 1, dismissed: [], bills: [
    {id: 'phone', title: 'Phone contract', amount: '25.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-20', origin: 'manual', createdAt: AT},
    {id: 'gym', title: 'Gym', amount: '30.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-10-03', origin: 'manual', createdAt: AT, ends: {on: '2026-10-31'}},
  ]}});
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  const upcoming = bills.getByRole('region', {name: 'Upcoming', exact: true});
  await expect(upcoming.locator('.bills-row').filter({hasText: 'Gym'})).toHaveCount(0);
  await bills.locator('.bill-tracker-fold summary').click();
  const gym = bills.locator('.bill-tracker-bill').filter({hasText: 'Gym'});
  await expect(gym).toContainText('Ended: the last payment was on Oct 3, 2026');
  const phone = bills.locator('.bill-tracker-bill').filter({hasText: 'Phone contract'});
  await phone.getByRole('button', {name: 'Edit Phone contract'}).click();
  const form = phone.getByRole('form', {name: 'Edit Phone contract'});
  await form.getByLabel('When it ends').selectOption('after');
  await expect(form.getByLabel('First payment on')).toHaveValue('2026-11-20');
  await form.getByLabel('Number of payments').fill('24');
  await form.getByLabel('First payment on').fill('2025-02-20');
  expect(await serious(page, form)).toEqual([]);
  await form.getByRole('button', {name: 'Save bill'}).click();
  await expect(bills.locator('.bill-tracker .bills-status')).toHaveText('Phone contract saved. 3 of 24 left · the last on Jan 20, 2027');
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills.find(b => b.id === 'phone')!.ends).toEqual({after: 24, from: '2025-02-20'});
  await expect(upcoming.locator('.bills-row').filter({hasText: 'Phone contract'}).first()).toContainText('3 of 24 left · the last on Jan 20, 2027');
  // Ending on 1 Dec: only the 20 Nov payment is left in the next 60 days.
  await phone.getByRole('button', {name: 'Edit Phone contract'}).click();
  await form.getByLabel('When it ends').selectOption('on');
  await form.getByLabel('Last payment on or before').fill('2026-12-01');
  await form.getByRole('button', {name: 'Save bill'}).click();
  await bills.getByRole('radio', {name: 'Next 60 days'}).check();
  await expect(upcoming.locator('.bills-row').filter({hasText: 'Phone contract'})).toHaveCount(1);
  await expect(upcoming.locator('.bills-row').filter({hasText: 'Phone contract'})).toContainText('1 payment left · the last on Nov 20, 2026');
  // A bill added by hand can end too; a missing count is refused in plain words.
  await bills.getByRole('button', {name: '+ Add a bill by hand'}).click();
  const add = bills.getByRole('form', {name: 'Add a bill by hand'});
  await add.getByLabel('Name').fill('Sofa instalments');
  await add.getByLabel('Amount').fill('80');
  await add.getByLabel('When it ends').selectOption('after');
  await add.getByRole('button', {name: 'Save bill'}).click();
  await expect(add.getByRole('alert')).toHaveText('Enter how many payments, from 1 to 600.');
  await add.getByLabel('Number of payments').fill('12');
  expect(await serious(page, add)).toEqual([]);
  await add.getByRole('button', {name: 'Save bill'}).click();
  expect((await readRecord<BillsRecord>(page, BILLS_KEY)).bills.find(b => b.title === 'Sofa instalments')!.ends).toEqual({after: 12, from: '2026-11-14'});
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});

for (const theme of THEMES) test(`${theme}: a credit card's next payment and so far this statement, from the person's own entries`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const CARD = '00000000-0000-4000-8000-0000000e7001', NEW = '00000000-0000-4000-8000-0000000e7002';
  const card = (id: string, name: string) => ({id, kind: 'credit-card', name, currency: 'EUR', snapshots: [{id: id.replace(/.{4}$/, '9999'), date: '2026-11-10', value: '45000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});
  const on = (date: string, amount: string, account: string) => ({...entry(date, amount, 'Shopping', 'expense', 'Shop'), account});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [card(CARD, 'Everyday Card'), card(NEW, 'New Card')]},
    [WEALTH_SHEET_KEY]: {version: 1, cards: {[CARD]: {statementDay: 5, dueDay: 25}, [NEW]: {statementDay: 5, dueDay: 25}}},
    [MONEY_LOG_KEY]: moneyLog([on('2026-10-05', '999.00', 'Everyday Card'), on('2026-10-10', '300.00', 'Everyday Card'), on('2026-11-02', '112.30', 'Everyday Card'), on('2026-11-10', '40.00', 'Everyday Card'), on('2026-11-11', '70.00', 'Main bank')]),
  });
  await page.goto('/app/wealth'); await hydrated(page);
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  const row = page.locator('.accounts-row').filter({hasText: 'Everyday Card'});
  const line = row.locator('.accounts-card-statement');
  await expect(line).toHaveText('Next payment on Nov 25: €412.30 (statement of Nov 5) · So far this statement: €40.00. From your own entries on this card; not advice.');
  await expect(line).toHaveAttribute('data-private-amount');
  await page.getByRole('button', {name: 'Hide amounts', exact: true}).click();
  await expect(line).toHaveCSS('filter', 'blur(7px)');
  await page.getByRole('button', {name: 'Show amounts', exact: true}).click();
  // Unknown is said in words, never as 0.
  await expect(page.locator('.accounts-row').filter({hasText: 'New Card'}).locator('.accounts-card-statement')).toHaveText(/^Next payment: not known yet, as no entry in your money log is on this card\./);
  expect(await serious(page, page.locator('.accounts-section'))).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
