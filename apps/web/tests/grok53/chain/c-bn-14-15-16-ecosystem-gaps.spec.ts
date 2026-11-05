import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {hydrated} from '../../ah-helpers';

// Session AL third pass (Part 15, lane L6): Berlin C-BN-14 (a value-locked trend), C-BN-15 (an audit-report filter) and
// C-BN-16 ("used by me" from Wealth). Desktop 1280, fresh profile, the chain chosen; /api answers are test doubles and
// fictional. Fails on main (none of the three exists), passes on the branch.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/market-assets', route => route.fulfill({json: {assets: []}}));
});

test('C-BN-15: "Only projects with an audit report listed" keeps the four with a report, says it is not a rating, and clears', async ({page}) => {
  await page.route('**/api/earn/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/ecosystem'); await hydrated(page);
  const all = await page.locator('.ecosystem-project').count();
  const box = page.getByRole('checkbox', {name: /Only projects with an audit report listed/});
  await expect(page.locator('.ecosystem-audited')).toContainText('not a safety rating');
  await box.check();
  for (const id of ['valdora', 'oroswap', 'nawa', 'permapod']) await expect(page.locator(`#project-${id}`)).toBeVisible();
  await expect(page.locator('#project-zignaly')).toHaveCount(0);
  await expect(page.locator('.ecosystem-result')).toContainText('with an audit report listed');
  await page.getByRole('button', {name: 'Clear filters'}).click();
  await expect(box).not.toBeChecked();
  await expect(page.locator('.ecosystem-project')).toHaveCount(all);
});

test('C-BN-14: with two days of reads on this device, a card says how its value locked moved, and that it is not a full history', async ({page}) => {
  await page.route('**/api/earn/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/ecosystem');
  await page.evaluate(() => localStorage.setItem('zigoals:eco-tvl-history:v1', JSON.stringify({version: 1, projects: {oroswap: [{day: '2026-11-01', usd: 1000000}, {day: '2026-11-04', usd: 1100000}]}})));
  await page.reload(); await hydrated(page);
  const line = page.locator('#project-oroswap .ecosystem-tvl-trend');
  await expect(line).toContainText('Since Nov 1, 2026: up 10 %, from the reads on this device (2 days), not a full history');
  await expect(page.locator('#project-valdora .ecosystem-tvl-trend')).toHaveCount(0); // one day or none: no trend claimed
});

test('C-BN-16: a tracked wallet holding stZIG shows "Used by you" on Valdora only, with a way to Wealth', async ({page}) => {
  const {toBech32} = await import('@cosmjs/encoding');
  const account = toBech32('zig', new Uint8Array(20).fill(9));
  await page.route('**/api/positions?**', route => {
    const asked = new URL(route.request().url()).searchParams.get('address')!;
    const base = {providerId: 'native-zig', network: 'zigchain-1', account: asked, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: new Date().toISOString(), liquidity: 'LIQUID', provenance: 'https://api.zigchain.com · block 123', executionAuthority: 'NONE', notes: '', risk: ''};
    return route.fulfill({json: {positions: [
      {...base, id: `zigchain-1:${asked}:liquid`, sourceType: 'WALLET_LIQUID', asset: 'ZIG', denom: 'azig', decimals: 18, quantity: '1000000000000000000'},
      {...base, id: `zigchain-1:${asked}:stzig`, sourceType: 'LIQUID_STAKING', asset: 'stZIG', denom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', decimals: 6, quantity: '25000000'},
    ]}});
  });
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('.positions-wallet > summary').click();
  await page.getByLabel('Public ZIG address').fill(account);
  await page.getByRole('button', {name: 'Read public positions', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Public snapshot saved'})).toBeVisible();
  await page.route('**/api/earn/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/ecosystem'); await hydrated(page);
  const used = page.locator('#project-valdora .ecosystem-used');
  await expect(used).toContainText('Used by you');
  await expect(used).toContainText('Wealth shows you hold stZIG, Valdora’s liquid-staking token.');
  await expect(used.getByRole('link', {name: 'Open Wealth →'})).toHaveAttribute('href', '/app/wealth');
  await expect(page.locator('.ecosystem-used')).toHaveCount(1);
});
