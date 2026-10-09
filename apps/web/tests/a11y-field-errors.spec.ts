import {expect, test, type Locator, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {emptyPlatform, PLATFORM_KEY} from '../lib/positions';
import {manualSourcePosition} from '../lib/manual-source';
import {saveAsset} from '../lib/asset-management';
import {audit} from './a11y-audit';
import {openFold} from './phone-nav';

/**
 * Session Y Part 9 (persona row 19, WCAG 3.3.1 and 4.1.2): a refused field says so to assistive technology. It carries
 * aria-invalid and an aria-describedby that names the shown message, and the first refused field takes the focus when the
 * form is submitted. Both projects; the audit's new rule (every aria-invalid field names a shown message) runs on each.
 */
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
async function invalidWithMessage(field: Locator, page: Page, message: RegExp) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const ids = (await field.getAttribute('aria-describedby'))!.split(/\s+/);
  const texts = await Promise.all(ids.map(id => page.locator(`[id="${id}"]`).textContent()));
  expect(texts.join(' ')).toMatch(message);
  await expect(field).toBeFocused();
}

test('habit editor: a target that does not read marks the target field, which takes the focus; fixing it clears the mark', async ({page}) => {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Read');
  const target = page.getByLabel('Target value');
  await target.fill('two');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await invalidWithMessage(target, page, /^Target value: /);
  await expect(page.getByLabel('Habit title', {exact: true})).not.toHaveAttribute('aria-invalid', 'true');
  expect((await audit(page.locator('form').filter({has: target}))).filter(f => f.rule === 'aria-invalid-message')).toEqual([]);
  await target.fill('2');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Read', exact: true})).toBeVisible();
});

test('habit editor: a title with nothing visible marks the title', async ({page}) => {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  const title = page.getByLabel('Habit title', {exact: true});
  await title.fill('​​');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await invalidWithMessage(title, page, /^Habit title: /);
});

test('Health: a number that does not read, or the ambiguous "1,234", is marked and takes the focus; the next save clears it', async ({page}) => {
  await page.goto('/app/health');
  await expect(page.locator('main h1').first()).toBeVisible();
  const water = page.getByRole('form', {name: 'Water entry'}), amount = water.getByLabel('Water amount', {exact: true}), log = water.getByRole('button', {name: 'Log water'});
  for (const typed of ['abc', '1,234']) {
    await amount.fill(typed);
    await log.click();
    await invalidWithMessage(amount, page, /^Check the highlighted fields/);
    expect((await audit(page.locator('main'))).filter(f => f.rule === 'aria-invalid-message')).toEqual([]);
  }
  await amount.fill('250');
  await log.click();
  await expect(page.getByRole('status').filter({hasText: 'Water recorded.'})).toBeVisible();
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
});

test('accounts: a currency or a balance that does not read marks its own field and takes the focus', async ({page}) => {
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  const section = page.getByRole('region', {name: 'Accounts, debts & net worth'});
  await section.getByRole('button', {name: 'Add an account or debt', exact: true}).click();
  const form = section.getByRole('form', {name: 'Add an account or debt'}), add = form.getByRole('button', {name: 'Add', exact: true});
  await form.getByLabel('Name').fill('Fictional savings');
  const currency = form.getByLabel('Currency'), balance = form.getByLabel('Balance now (optional)');
  await currency.fill('E1R');
  await add.click();
  await invalidWithMessage(currency, page, /three-letter currency code/);
  await currency.fill('EUR');
  await balance.fill('lots');
  await add.click();
  await invalidWithMessage(balance, page, /\S/);
  await expect(currency).not.toHaveAttribute('aria-invalid', 'true');
  expect((await audit(form)).filter(f => f.rule === 'aria-invalid-message')).toEqual([]);
  await balance.fill('5200');
  await add.click();
  await expect(section.getByRole('status')).toHaveText('Fictional savings added.');
});

test('goal wizard: a missing name, then a target that does not read, each mark their field and take the focus', async ({page}) => {
  await page.goto('/app/goals/new');
  await page.getByRole('radio', {name: 'Value', exact: true}).check();
  const name = page.getByLabel('Goal name', {exact: true}), target = page.getByLabel('Target amount', {exact: true});
  await page.getByRole('button', {name: 'Continue →'}).click();
  await invalidWithMessage(name, page, /^Give your Goal a name\.$/);
  await name.fill('Fictional trip');
  await target.fill('lots');
  await page.getByRole('button', {name: 'Continue →'}).click();
  await invalidWithMessage(target, page, /\S/);
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  expect((await audit(page.locator('main'))).filter(f => f.rule === 'aria-invalid-message')).toEqual([]);
  await target.fill('1200');
  await page.getByRole('button', {name: 'Continue →'}).click();
  await expect(page.locator('main [aria-invalid="true"]')).toHaveCount(0);
});

test('asset editor: a quantity that does not read marks the quantity, which takes the focus', async ({page}) => {
  const cash = manualSourcePosition({category: 'Precious metals', name: 'Fictional coins', quantity: '100', currency: 'EUR', metal: 'Gold', unit: 'grams', value: '7000'}, '91000000-0000-4000-8000-000000000002', '2026-09-14T10:00:00.000Z');
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [PLATFORM_KEY, JSON.stringify(saveAsset(emptyPlatform(), cash))]);
  await page.goto(`/app/wealth/asset/${cash.id}`);
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit Fictional coins/}), quantity = sheet.getByLabel('Asset quantity', {exact: true});
  await quantity.fill('lots');
  await sheet.getByRole('button', {name: 'Save changes', exact: true}).click();
  await invalidWithMessage(quantity, page, /\S/);
  expect((await audit(sheet)).filter(f => f.rule === 'aria-invalid-message')).toEqual([]);
  await quantity.fill('120');
  await sheet.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(sheet).toHaveCount(0);
});
