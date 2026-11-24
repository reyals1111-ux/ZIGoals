import {expect, test} from '@playwright/test';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {ACCOUNTS_KEY} from '../lib/accounts/schema';
import {WEALTH_SHEET_KEY} from '../lib/wealth-sheet/schema';

/**
 * Session AV lane 2 (review b2a #8): a credit card typed at €1,200 with €300 paid since owes €900, so its "above
 * €1,000" line is not named on Wealth; an account without payments past its line still is. Fictional records; today is
 * 14 Nov 2026 (fixtures).
 */
const AT = '2026-01-01T09:00:00.000Z', CARD = '00000000-0000-4000-8000-0000000000c1', CASH = '00000000-0000-4000-8000-0000000000c2';
test('a debt paid down below its line is not named past it', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [ACCOUNTS_KEY]: {version: 1, items: [
      {id: CARD, kind: 'credit-card', name: 'Fictional card', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-0000000000c1', date: '2026-11-01', value: '120000', decimals: 2}], payments: [{id: '20000000-0000-4000-8000-0000000000c1', date: '2026-11-05', value: '30000', decimals: 2}], createdAt: AT, updatedAt: AT},
      {id: CASH, kind: 'cash', name: 'Checking', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-0000000000c2', date: '2026-11-01', value: '120000', decimals: 2}], payments: [], createdAt: AT, updatedAt: AT}]},
    [WEALTH_SHEET_KEY]: {version: 1, limits: {[CARD]: {above: '1000.00'}, [CASH]: {above: '1000.00'}}},
  });
  await page.goto('/app/wealth'); await hydrated(page);
  const lines = page.getByRole('list', {name: 'Balances past your own lines'});
  await expect(lines).toContainText('Checking');
  await expect(lines).not.toContainText('Fictional card');
});
