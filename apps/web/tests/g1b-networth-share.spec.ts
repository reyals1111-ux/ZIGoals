import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {openFold} from './phone-nav';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {TODAY, freshDevice} from './g1b-fixtures';

/** Session AK, BUILD list 2 #17: share a net-worth moment as an image made on this device; amounts hidden by default. */
test.use({timezoneId: 'UTC'});
const AT = '2026-01-01T09:00:00.000Z';

test('a fresh start: no net worth, nothing to share', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  await expect(page.getByRole('button', {name: 'Share a net-worth moment'})).toHaveCount(0);
});
test('the per cent only, until "Include numbers"; the image is made on this device', async ({page}) => {
  await freshDevice(page, {[ACCOUNTS_KEY]: {version: 1, items: [{id: '00000000-0000-4000-8000-000000000001', kind: 'savings', name: 'Savings', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-000000000002', date: '2026-10-31', value: '1000000', decimals: 2}, {id: '00000000-0000-4000-8000-000000000003', date: TODAY, value: '1042000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]}});
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  await page.getByRole('button', {name: 'Share a net-worth moment'}).click();
  const preview = page.getByRole('figure', {name: 'What the image shows'});
  await expect(preview).toContainText('Up 4.2% since Oct 31, 2026');
  await expect(preview).not.toContainText('€');
  await page.getByRole('checkbox', {name: /^Include numbers/}).check();
  await expect(preview).toContainText('Net worth: €10,420.00');
  await page.getByRole('radio', {name: 'Twelve months ago'}).check();
  await expect(preview).not.toContainText('since');
  await expect(page.getByText('There is no earlier month-end balance in EUR yet')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Save or share image'}).click();
  expect((await download).suggestedFilename()).toBe('zigoals-net-worth-eur-change.png');
});
test('the Showcase: the card says Example and shows no amount', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth');
  await openFold(page, 'Accounts, debts & net worth');
  await page.getByRole('button', {name: /^(Share a net-worth moment|Share this moment)$/}).first().click();
  const preview = page.getByRole('figure', {name: 'What the image shows'});
  await expect(preview).toContainText('Example · Net worth · USD');
  await expect(preview).not.toContainText('$');
});
