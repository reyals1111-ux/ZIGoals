import {expect, test} from '@playwright/test';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';

/**
 * Session AV lane 2 (review b2a #7): an account Sheet's "Remove" button for money in or out names the amount as the app
 * writes money ("€9,000.00"), never the raw "9000.00". Fictional records.
 */
const AT = '2026-01-01T09:00:00.000Z', JOINT = '00000000-0000-4000-8000-0000000c0001';
test('the Remove button of money in names the amount as money', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[ACCOUNTS_KEY]: {version: 1, items: [{id: JOINT, kind: 'savings', name: 'Joint savings', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000c9999', date: '2026-10-20', value: '1000000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]}});
  await page.goto('/app/wealth'); await hydrated(page);
  await page.getByRole('button', {name: 'Sheet options for Joint savings'}).click();
  const joint = page.getByRole('group', {name: 'SHEET · Joint savings'});
  await joint.locator('summary', {hasText: 'Money in and out'}).click();
  await joint.getByLabel(/^Amount \(EUR\)/).fill('9000');
  await joint.getByLabel('On').fill('2025-11-14');
  await joint.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(joint.getByRole('button', {name: 'Remove money in of €9,000.00 on Nov 14, 2025'})).toBeVisible();
  await expect(joint.getByRole('button', {name: /of 9000\.00 on/})).toHaveCount(0);
});
