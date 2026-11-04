import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated} from '../../ah-helpers';

// Session AL (lane L6, Part 2): Berlin BN-084 (the Liquid wallet "⋯" menu opened under the sidebar, items clipped),
// BN-085/BN-112 (no way to rename or remove a tracked wallet, on Staking or in Settings), BN-079 (the same address in
// capitals saved as a second wallet) and BN-080 (an empty address said nothing). Desktop 1280, a fresh profile; the
// read-only relay is a test double. Fictional addresses; nothing is signed.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/market-assets', route => route.fulfill({json: {assets: []}}));
});
async function trackWallet(page: Page, fill = 7, typed?: (a: string) => string) {
  const {toBech32} = await import('@cosmjs/encoding');
  const account = toBech32('zig', new Uint8Array(20).fill(fill));
  await page.route('**/api/positions?**', route => {
    const asked = new URL(route.request().url()).searchParams.get('address')!;
    return route.fulfill({json: {positions: [{id: `zigchain-1:${asked}:liquid`, providerId: 'native-zig', sourceType: 'WALLET_LIQUID', network: 'zigchain-1', account: asked, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '123456789000000000000', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), liquidity: 'LIQUID', provenance: 'https://api.zigchain.com · block 123', executionAuthority: 'NONE', notes: '', risk: ''}]}});
  });
  const wallet = page.locator('.positions-wallet');
  if (!await wallet.evaluate(e => (e as HTMLDetailsElement).open)) await wallet.locator('> summary').click();
  await page.getByLabel('Public ZIG address').fill(typed ? typed(account) : account);
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Public snapshot saved'})).toBeVisible();
  return account;
}

test('BN-084: the Liquid wallet ⋯ menu opens inside the content, every item readable and clickable', async ({page}) => {
  await page.goto('/app/staking'); await hydrated(page);
  await trackWallet(page);
  const card = page.locator('article.position-card').first();
  await card.getByRole('button', {name: /^Options for /}).click();
  const panel = card.locator('.card-options-panel');
  await expect(panel).toBeVisible();
  const [box, main] = await Promise.all([panel.boundingBox(), page.locator('main').first().boundingBox()]);
  expect(box!.x).toBeGreaterThanOrEqual(main!.x);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
  const first = panel.getByRole('button').first();
  await expect(first).toBeInViewport();
  await first.click();
  await expect(card.locator('.pin-to-today-status')).toContainText('added to Today');
});

test('BN-080/BN-079: an empty address is said at the field; the same address in capitals is the same wallet', async ({page}) => {
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('.positions-wallet > summary').click();
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  const field = page.getByLabel('Public ZIG address');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.positions-wallet .field-error')).toContainText('Type a public ZIG address first');
  await expect(field).toBeFocused();
  await trackWallet(page, 7);
  await trackWallet(page, 7, a => a.toUpperCase());
  await expect(page.locator('.tracked-wallet')).toHaveCount(1);
});

test('BN-085/BN-112: a tracked wallet can be renamed and removed on Staking (with Undo) and in Settings', async ({page}) => {
  await page.goto('/app/staking'); await hydrated(page);
  await trackWallet(page);
  const list = page.locator('.tracked-wallets');
  await list.getByRole('button', {name: /^Rename /}).click();
  await list.getByLabel(/Wallet name/).fill('Savings wallet');
  await list.getByRole('button', {name: 'Save name'}).click();
  await expect(list.locator('.tracked-wallet strong')).toHaveText('Savings wallet');
  await list.getByRole('button', {name: 'Remove Savings wallet'}).click();
  await expect(list.getByRole('group', {name: 'Remove Savings wallet?'})).toContainText('Stop tracking Savings wallet?');
  await list.getByRole('button', {name: 'Remove wallet'}).click();
  await expect(list.locator('.tracked-wallet')).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'zigchain-1 observed totals'})).not.toContainText('123.456789 ZIG');
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(list.locator('.tracked-wallet')).toHaveCount(1);
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('zigoals:platform') && (localStorage.getItem(k) ?? '').includes(':liquid')))).toBe(true);
  // The same list in Settings → Wallet & network.
  await page.goto('/app/settings#wallet-network'); await hydrated(page);
  const settings = page.locator('#tracked-wallets');
  await expect(settings.locator('.tracked-wallet strong')).toHaveText('Savings wallet');
  await settings.getByRole('button', {name: 'Remove Savings wallet'}).click();
  await settings.getByRole('button', {name: 'Remove wallet'}).click();
  await expect(settings).toContainText('No public wallet is tracked on this device.');
});
