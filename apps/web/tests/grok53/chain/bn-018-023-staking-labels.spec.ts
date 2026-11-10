import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated} from '../../ah-helpers';

// Session AL (lane L6): Staking labels and fields, Berlin BN-004/BN-083 (mainnet totals under a Practice choice),
// BN-026/BN-066 (a "net" label over a gross rate), BN-081 (a rejected APR kept in the field), BN-134 (the scenario's
// errors), D-169 / N-BN-02 / N-BN-03 (a status-like eyebrow and a lock on "Real"). Desktop 1280, fresh profile; the
// read-only relay is a test double with a fictional address.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/market-assets', route => route.fulfill({json: {assets: []}}));
});

test('BN-026/BN-134/D-169: no-wallet labels say "before commission"; the scenario\'s errors read as errors; no status-like eyebrow', async ({page}) => {
  await page.goto('/app/staking'); await hydrated(page);
  await expect(page.locator('.positions-scenario summary')).toContainText('Scenario rate · before a validator’s commission');
  await expect(page.getByText('Signed in your own wallet', {exact: true})).toHaveCount(0);
  await expect(page.locator('.staking-network-badge').filter({hasText: '🔒'})).toHaveCount(0);
  await page.locator('.positions-scenario > summary').click();
  const rate = page.getByLabel(/Yearly rate %/);
  await rate.fill('150');
  await expect(rate).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.staking-try .field-error')).toContainText('Write a rate from 0 to 100');
});

test('BN-081/BN-083: a rejected APR is said at the field and the field goes back; mainnet totals say so under Practice', async ({page}) => {
  const {toBech32} = await import('@cosmjs/encoding');
  const account = toBech32('zig', new Uint8Array(20).fill(9));
  await page.route('**/api/positions?**', route => route.fulfill({json: {positions: [{id: `zigchain-1:${account}:liquid`, providerId: 'native-zig', sourceType: 'WALLET_LIQUID', network: 'zigchain-1', account, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '5000000000000000000', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), liquidity: 'LIQUID', provenance: 'https://api.zigchain.com · block 1', executionAuthority: 'NONE', notes: '', risk: ''}]}}));
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('.positions-wallet > summary').click();
  await page.getByLabel('Public ZIG address').fill(account);
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Public snapshot saved'})).toBeVisible();
  await expect(page.locator('.positions-network-note')).toContainText('real ZIGChain mainnet wallet, read only');
  await page.locator('.positions-scenario > summary').click();
  const field = page.getByLabel('Net APR assumption %', {exact: true});
  await field.fill('150');
  await page.getByRole('button', {name: 'Save APR assumption'}).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.positions-scenario .field-error')).toContainText('Enter a net APR from 0 to 100 %');
  await expect(field).toHaveValue('');
});
