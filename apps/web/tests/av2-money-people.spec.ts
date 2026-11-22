import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openPhoneRow} from './phone-length-folds';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_MORE_KEY, type MoneyMore} from '../lib/money-more/schema';

/**
 * Session AV lane 2, round 2 (money; Emma's custom split and settle, Wallet's lent and borrowed): Wealth → Spending — a
 * €60 dinner shared three ways (your share €20 counted), Sam settling up (the money back left out of the figures), and
 * money lent with a due day and a reminder, repaid in part — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. On this device only; fictional records; the API offline; the clock Saturday 14 November 2026.
 */
for (const theme of THEMES) test(`${theme}: a shared cost, settle up, money lent`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-12', '60.00', 'Food & drink', 'expense', 'Dinner', 'EUR', 'av2r2-dinner')])});
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await box.getByRole('button', {name: 'Edit Food & drink 60.00 EUR on 2026-11-12'}).click();
  const form = box.getByRole('form', {name: /^Edit Food & drink/});
  await form.locator('summary', {hasText: 'Shared with others'}).click();
  await form.getByRole('button', {name: 'Add a person'}).click();
  await form.getByRole('button', {name: 'Add a person'}).click();
  // Session AV lane 2 (getByLabel('Person 1') also matched the “Take person 1 off” button: the field by its role and exact name, deliberate)
  await form.getByRole('textbox', {name: 'Person 1', exact: true}).fill('Sam');
  await form.getByRole('textbox', {name: 'Person 2', exact: true}).fill('Lee');
  await expect(form.getByLabel('Your share (EUR)')).toHaveValue('20.00');
  await form.getByRole('button', {name: 'Keep the split'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries[0]!.share).toBe('20.00');
  await form.getByRole('button', {name: 'Cancel edit'}).click();
  await expect(box.locator('.spending-bars')).toContainText('€20.00');
  // Between you and others: Sam settles up.
  // Session AV lane 2 (phone-length, deliberate): on a phone "Between you and others" is one row of Spending that says what
  // it holds (tests/phone-length-folds.ts: there and closed on a phone, absent at 1440); it is opened, then checked as before.
  if (isMobile) await expect(box.locator('.phone-fold-toggle').filter({hasText: 'Between you and others'})).toContainText('1 person owes you');
  await openPhoneRow(page, 'Between you and others', box);
  const people = box.locator('.people-money');
  await expect(people).toBeVisible();
  await expect(people).toContainText('Sam owes you €20.00');
  await people.getByRole('button', {name: 'Settle up with Sam: €20.00'}).click();
  await expect.poll(async () => (await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).entries.find(e => e.kind === 'income')).toMatchObject({amount: '20.00', excluded: true, category: 'Refund'});
  await expect(people).not.toContainText('Sam owes you');
  // Money lent, with a due day and a reminder, then repaid in part.
  await people.getByRole('button', {name: '+ Money lent or borrowed'}).click();
  const lend = people.getByRole('form', {name: 'Money lent or borrowed'});
  await lend.getByRole('radio', {name: 'I lent it'}).check();
  await lend.getByLabel('To').fill('Noor');
  await lend.getByLabel('Amount').fill('100');
  await lend.getByLabel('Due — optional').fill('2026-11-16');
  await lend.getByLabel(/^Remind me/).check();
  await lend.getByRole('button', {name: 'Keep it'}).click();
  await expect(people).toContainText('Lent to Noor');
  await expect(people).toContainText('€100.00 left');
  await people.getByRole('button', {name: 'A repayment on lent to Noor'}).click();
  await people.getByLabel('Repaid (EUR)').fill('40');
  await people.getByRole('button', {name: 'Keep', exact: true}).click();
  await expect(people).toContainText('€60.00 left');
  const more = await readRecord<MoneyMore>(page, MONEY_MORE_KEY);
  expect(more.loans).toEqual([expect.objectContaining({kind: 'lent', name: 'Noor', amount: '100.00', due: '2026-11-16', remind: true, repaid: [{date: '2026-11-14', amount: '40.00'}]})]);
  expect(more.owed?.find(o => o.name === 'Sam')?.settled).toBe('2026-11-14');
  const findings = await axe(page, people);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Today names the loan due in two days, in its one money link.
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('.today-money-attention')).toContainText('Noor owes you €60.00, due in 2 days');
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
