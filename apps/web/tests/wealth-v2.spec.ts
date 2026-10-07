import {expect, test, type Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, positionSchema, privateGoalSchema, type Platform} from '../lib/positions';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {ACCOUNTS_KEY, W_REMINDERS_KEY} from '../lib/w-device-keys';
import {openFold} from './phone-nav';

// Session W Part 12: accounts and debts on this device, net worth per currency (never converted), a debt's payoff from
// the person's own figures, and a contribution plan's reminder whose "Fund now" opens the Goal's form filled in.
// Fictional records; third parties answer 503; the clock is fixed.
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-01', AT = '2026-09-30T08:00:00.000Z';
function platform(): Platform {
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: [],
    plan: {amount: '25000', asset: 'EUR', decimals: 2, cadence: 'monthly', nextDate: TODAY, active: true, timeZone: 'Europe/Brussels'}});
  const position = positionSchema.parse({id: 'p1', providerId: 'Fictional cash', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'EUR', denom: 'eur', quantity: '150000', decimals: 2, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry', assetClass: 'Cash', valuationMode: 'manual', valuation: {value: '150000', currency: 'EUR', decimals: 2, source: 'MANUAL', observedAt: AT}});
  // A plan with its own time zone is a finance v4 record.
  return {...emptyPlatform(), schemaVersion: 4, goals: [goal], positions: [position], allocations: [{goalId: '7', positionId: 'p1', quantity: '150000'}]};
}
async function seed(page: Page, extra: Record<string, string> = {}, time = `${TODAY}T08:00:00.000Z`) {
  await page.clock.install({time: new Date(time)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[PLATFORM_KEY]: JSON.stringify(platform()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...extra});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('accounts and debts: net worth per currency with Wealth\'s valued holding as its own line; a payoff from the person\'s own rate', async ({page}) => {
  await seed(page);
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await expect(section).toContainText('Accounts stay on this device until account sync carries them.');
  const add = async (kind: string, name: string, currency: string, balance: string, rate = '') => {
    await section.getByRole('button', {name: 'Add an account or debt', exact: true}).click();
    const form = section.getByRole('form', {name: 'Add an account or debt'});
    await form.getByLabel('Kind').selectOption({label: kind});
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Currency').fill(currency);
    await form.getByLabel(/Balance now|What you owe now/).fill(balance);
    if (rate) await form.getByLabel(/Yearly rate/).fill(rate);
    await form.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(section.getByRole('status')).toHaveText(`${name} added.`);
  };
  await add('Savings', 'Fictional savings', 'EUR', '5200');
  await add('Loan', 'Fictional car loan', 'EUR', '1200', '6');
  await add('Cash', 'Fictional dollars', 'usd', '99.99');
  const eur = section.getByRole('article', {name: 'Net worth in EUR'});
  await expect(eur.locator('.accounts-worth-net')).toHaveText('€5,500.00');
  await expect(eur).toContainText('Holdings in Wealth€1,500.00');
  await expect(eur).toContainText('Debts€1,200.00');
  await expect(section.getByRole('article', {name: 'Net worth in USD'}).locator('.accounts-worth-net')).toHaveText('$99.99');
  await expect(section).toContainText('never converted between currencies');
  const loan = section.locator('.accounts-row').filter({hasText: 'Fictional car loan'});
  await loan.locator('summary', {hasText: 'When would it be paid off?'}).click();
  await loan.getByLabel(/Monthly payment/).fill('100');
  await expect(loan.getByRole('status')).toContainText('At your rate of 6 % a year and 100 EUR a month: paid off in about 13 months');
  await loan.getByRole('button', {name: 'Record a payment on Fictional car loan', exact: true}).click();
  await loan.getByRole('form', {name: 'Payment on Fictional car loan'}).getByLabel(/Payment/).fill('100');
  await loan.getByRole('form', {name: 'Payment on Fictional car loan'}).getByRole('button', {name: 'Save', exact: true}).click();
  await expect(section.getByRole('status').filter({hasText: 'payment recorded for 2026-10-01'})).toBeVisible();
  const saved = await stored(page, ACCOUNTS_KEY);
  expect(saved.items.map((a: {name: string; currency: string; kind: string}) => [a.name, a.kind, a.currency])).toEqual([['Fictional savings', 'savings', 'EUR'], ['Fictional car loan', 'loan', 'EUR'], ['Fictional dollars', 'cash', 'USD']]);
  expect(saved.items[1].payments.map((p: {value: string; date: string}) => [p.date, p.value])).toEqual([['2026-10-01', '10000']]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /bank|plaid|token/i.test(k)))).toEqual([]);
});

test('a contribution reminder: set on the Goal, a calm card on Today once due, "Fund now" opens the form filled in, "Not today" puts it off', async ({page}) => {
  await seed(page);
  await page.goto('/app/goals/tracked/7');
  const plan = page.locator('#contribution-plan');
  await plan.locator('summary').first().click();
  const reminder = plan.getByRole('form', {name: 'Contribution reminder'});
  await reminder.getByLabel('Remind me on this device at').fill('09:30');
  await reminder.getByRole('button', {name: 'Set reminder', exact: true}).click();
  await expect(reminder.getByRole('status')).toHaveText('Reminder set for 09:30 on this device.');
  expect((await stored(page, W_REMINDERS_KEY)).contributions).toEqual({'7': {time: '09:30'}});
  await page.clock.setFixedTime(new Date(`${TODAY}T07:45:00.000Z`)); // 09:45 in Brussels
  await page.goto('/app');
  const card = page.getByRole('article', {name: 'Reminder: a contribution is due, Fictional reserve'});
  await expect(card).toContainText('A contribution is due: Fictional reserve');
  await card.getByRole('link', {name: 'Fund now', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/7$/);
  const sheet = page.getByRole('dialog', {name: 'Fund your Goal'});
  await sheet.getByRole('button', {name: /Fictional cash/}).click();
  await expect(sheet.getByLabel('Contribution quantity (EUR)')).toHaveValue('250');
  await expect(sheet).toContainText('Filled in from your plan\'s amount for 2026-10-01. Check it before you preview; nothing moves money.');
  await sheet.getByRole('button', {name: 'Close dialog', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await page.goto('/app');
  await card.getByRole('button', {name: 'Not today', exact: true}).click();
  await expect(card).toHaveCount(0);
  expect((await stored(page, W_REMINDERS_KEY)).dismissed).toEqual({'contribution:7': TODAY});
  expect(((await stored(page, PLATFORM_KEY)) as Platform).contributions).toEqual([]);
});

test('Showcase: fictional accounts and debts show net worth and a payoff; nothing is requested from a bank', async ({page}) => {
  const outside: string[] = [];
  page.on('request', r => { const url = new URL(r.url()); if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') outside.push(url.origin); });
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await expect(section.getByRole('article', {name: 'Net worth in USD'})).toBeVisible();
  await expect(section).toContainText('SHOWCASE DATA · fictional bank');
  const loan = section.locator('.accounts-row').filter({hasText: 'Car loan'});
  await loan.locator('summary', {hasText: 'When would it be paid off?'}).click();
  await expect(loan.getByRole('status')).toContainText('At your rate of 5.9 % a year and 300 USD a month');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:accounts:v1'))).toBeNull();
  expect(outside).toEqual([]);
});
