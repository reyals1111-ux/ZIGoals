import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {readRecord, seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {openDeskFold} from './ao/folds';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {WEALTH_SHEET_KEY, type WealthSheet} from '../lib/wealth-sheet/schema';

/**
 * Session AV lane 2 (money; Kubera's net-worth sheet): Wealth → each account's "Sheet" — a mortgage secured on the home
 * (the home's row shows its equity), a joint account at 50 % in a group of its own, an update reminder, money in for the
 * annual return, a PDF kept with an account; "Your sheet" with the total at your shares and one total from a rate you
 * type — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z';
const acct = (id: string, kind: string, name: string, currency: string, date: string, value: string) => ({id, kind, name, currency, snapshots: [{id: `${id.slice(0, -4)}9999`, date, value, decimals: 2}], payments: [], createdAt: AT, updatedAt: AT});
const HOME = '00000000-0000-4000-8000-0000000a0001', MORT = '00000000-0000-4000-8000-0000000b0001', JOINT = '00000000-0000-4000-8000-0000000c0001', USD = '00000000-0000-4000-8000-0000000d0001';
for (const theme of THEMES) test(`${theme}: equity, a 50 % share and a group, a reminder, money in, a document, one total`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[ACCOUNTS_KEY]: {version: 1, items: [acct(HOME, 'property', 'Home', 'EUR', '2026-03-01', '40000000'), acct(MORT, 'mortgage', 'Mortgage', 'EUR', '2026-11-01', '25000000'), acct(JOINT, 'savings', 'Joint savings', 'EUR', '2026-10-20', '1000000'), acct(USD, 'investment', 'US fund', 'USD', '2026-11-10', '500000')]}});
  await page.goto('/app/wealth'); await hydrated(page);
  // Session AV lane 2 (on a phone "Accounts, debts & net worth" starts folded, so it is opened first, as tests/g1b-networth-share.spec.ts does, deliberate)
  if (isMobile) await openDeskFold(page, 'Accounts, debts & net worth');
  // The mortgage secured on the home: the home's row shows its equity.
  await page.getByRole('button', {name: 'Sheet options for Mortgage'}).click();
  await page.getByRole('group', {name: 'SHEET · Mortgage'}).getByLabel('Secured on').selectOption({label: 'Home'});
  await expect(page.locator('.accounts-equity')).toHaveText('Equity €150,000.00 (value less Mortgage €250,000.00)');
  // The joint account at 50 %, in its own group, reminded monthly, with money in.
  await page.getByRole('button', {name: 'Sheet options for Joint savings'}).click();
  const joint = page.getByRole('group', {name: 'SHEET · Joint savings'});
  await joint.getByLabel(/^Your share/).fill('50');
  await joint.getByLabel(/^Your group/).fill('Savings');
  // Session AV lane 2 (the exact name, deliberate). Polish4: the form's submit is “Save” (it read “Keep”, which elsewhere in the app means “do not remove”)
  await joint.getByRole('button', {name: 'Save', exact: true}).click();
  await joint.getByLabel('Remind me to update it').selectOption('month');
  await joint.locator('summary', {hasText: 'Money in and out'}).click();
  // Session AV lane 2 (getByLabel('On') also matched "Your group — optional", "Remind me to update it" and more: the money
  // in or out form's own fields, by role and exact name, deliberate)
  const flow = joint.getByRole('form', {name: 'Joint savings: money in or out'});
  await flow.getByLabel(/^Amount \(EUR\)/).fill('9000');
  await flow.getByRole('textbox', {name: 'On', exact: true}).fill('2025-11-14');
  await flow.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(joint).toContainText(/Annual return \(IRR\): [\d.,]+ % a year/);
  await joint.locator('summary', {hasText: 'Documents'}).click();
  await joint.locator('input[type=file]').setInputFiles({name: 'statement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% fictional statement\n')});
  await expect(joint).toContainText('statement.pdf kept on this device with Joint savings.');
  const sheet = await readRecord<WealthSheet>(page, WEALTH_SHEET_KEY);
  expect(sheet).toMatchObject({secures: {[MORT]: HOME}, share: {[JOINT]: 50}, group: {[JOINT]: 'Savings'}, every: {[JOINT]: 'month'}, flows: {[JOINT]: [{date: '2025-11-14', amount: '9000.00', kind: 'in'}]}});
  // Your sheet: the total at your shares, the groups, one total from a rate you type.
  const yours = page.getByRole('region', {name: 'Your sheet'});
  await expect(yours).toContainText('At your shares: €155,000.00');
  await expect(yours.getByRole('table')).toContainText('Savings');
  const rate = yours.getByRole('form', {name: 'Your exchange rate'});
  await rate.getByLabel(/^is \(EUR\)/).fill('0.92');
  await rate.getByRole('button', {name: 'Keep my rate'}).click();
  await expect(yours).toContainText('One total in EUR: €159,600.00');
  await expect(yours).toContainText('typed by you');
  const findings = await axe(page, yours);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
