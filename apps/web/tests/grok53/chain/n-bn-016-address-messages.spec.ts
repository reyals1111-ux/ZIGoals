import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated} from '../../ah-helpers';

// Session AL third pass (lane L6, P-BN-23 rest): Berlin N-BN-16 (BN-078's suggestion). Track Wallet said one sentence for a
// wrong prefix (cosmos1, 0x) and a wrong length; each now says which, under the field. Desktop 1280, fresh profile, the
// chain chosen. Fictional addresses; nothing is read (no request leaves for a refused address). Fails on main.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/market-assets', route => route.fulfill({json: {assets: []}}));
});

test('N-BN-16: cosmos1, 0x and a short zig1 address each get their own reason; nothing is read', async ({page}) => {
  const {toBech32} = await import('@cosmjs/encoding');
  const zig = toBech32('zig', new Uint8Array(20).fill(7)), cosmos = toBech32('cosmos', new Uint8Array(20).fill(7));
  const reads: string[] = [];
  await page.route('**/api/positions?**', route => { reads.push(route.request().url()); return route.fulfill({status: 500, json: {}}); });
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('.positions-wallet > summary').click();
  const field = page.getByLabel('Public ZIG address'), error = page.locator('.positions-wallet .field-error');
  const cases: [string, string][] = [
    [cosmos, 'this address is for another network (cosmos1…). ZIGChain addresses start with zig1'],
    ['0x52908400098527886E0F7030069857D2E4169EE7', 'this looks like an Ethereum-style address (0x…)'],
    [zig.slice(0, 40), 'this zig1 address is 40 characters long; a public ZIG address is 42'],
    ['invalid', 'this is not a ZIGChain address'],
  ];
  for (const [typed, said] of cases) {
    await field.fill(typed);
    await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
    await expect(error, typed).toContainText(said);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  }
  expect(reads).toEqual([]);
});
