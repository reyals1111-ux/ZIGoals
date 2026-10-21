import {expect, test} from '@playwright/test';
import {VERIFIED_URLS} from '../../../packages/ecosystem-registry/src/verified-links';
import {earnRoutes, outgoing, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1): the Earn hub, /app/earn, on a computer and a phone, with the Showcase's records and every live answer
 * from the recorded fixtures. Every figure says where it came from and how old it is, or "unavailable" with the reason;
 * the chip index stays in reach and marks the section on screen; every outgoing link is a verified one that opens in a
 * new tab with noopener noreferrer; nothing is framed and the page asks no host but its own.
 */
test.beforeEach(async ({page}) => { await seedShowcase(page); });

test('live figures carry their source and age; every outgoing link is a verified one; only the app\'s own host is asked', async ({page, baseURL}) => {
  const requests = await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page).toHaveTitle(/^Earn · ZIGoals/);
  await expect(page.locator('main h1').first()).toHaveText('Make your money work');
  for (const id of ['native-apr', 'native-bonded', 'native-unbonding', 'valdora-rate', 'valdora-fee', 'valdora-minimum', 'oroswap-zig-usdc', 'oroswap-farms', 'valdora-llama-tvl']) {
    const figure = page.locator(`[data-live-figure="${id}"]`);
    await expect(figure, id).toHaveAttribute('data-state', 'ok');
    await expect(figure, id).toContainText(/updated just now|updated \d+ min ago/);
  }
  await expect(page.locator('[data-live-figure="native-apr"] .earn-value')).toHaveText(/^\d+\.\d{2}\s%$/);
  // Session AF Gate C (design critique, copy; moved, stronger): the source has a plain name on the page now ("LCD" was
  // jargon), and its time is named in UTC; no source line on Earn says "LCD".
  await expect(page.locator('[data-live-figure="native-apr"]')).toContainText('ZIGChain’s official mainnet server');
  await expect(page.locator('[data-live-figure="native-apr"] .earn-source')).toContainText(/ · as of .+ UTC$/);
  await expect(page.locator('.earn-source').filter({hasText: 'LCD'})).toHaveCount(0);
  await expect(page.locator('[data-live-figure="native-unbonding"] .earn-value')).toHaveText('21 days');
  await expect(page.locator('[data-live-figure="valdora-rate"] .earn-value')).toHaveText(/^1\.0\d{3}\sZIG$/);
  await expect(page.locator('[data-live-figure="valdora-fee"] .earn-value')).toHaveText('10 % of the staking rewards');
  await expect(page.locator('[data-live-figure="valdora-minimum"] .earn-value')).toHaveText('50 ZIG');
  await expect(page.locator('[data-live-figure="oroswap-farms"] .earn-value')).toHaveText('None running now');
  await expect(page.locator('[data-live-figure="valdora-llama-apy"]')).toContainText('DefiLlama (third party)');
  // The single-key fact, from the chain, beside what Valdora's security page says, with the date.
  await expect(page.locator('#valdora')).toContainText(/admin is a single key \(zig1gy5zke…0002kx\), read at block \d+/);
  await expect(page.locator('#valdora')).toContainText('multi-signature authorization');
  // The decoy denom and the four safety tiles.
  await expect(page.locator('#safety')).toContainText('coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig');
  await expect(page.locator('#safety')).toContainText('never ask you to sign anything you didn’t start');
  // Links: from the registry, a new tab, noopener noreferrer, with the mark; no frame anywhere.
  const links = await outgoing(page);
  expect(links.length).toBeGreaterThan(10);
  for (const link of links) {
    expect(VERIFIED_URLS.has(link.href), link.href).toBe(true);
    expect(link.target, link.href).toBe('_blank');
    expect(link.rel, link.href).toBe('noopener noreferrer');
  }
  await expect(page.locator('.verified-mark').first()).toContainText('verified link · Oct 18, 2026');
  await expect(page.locator('iframe, frame, embed, object')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/partners?\b|guaranteed return|we recommend|you should/i);
  const origin = new URL(baseURL!).origin;
  expect(requests.filter(url => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
});

test('a source that fails says "unavailable" with its reason; the explanations, steps and risks stay', async ({page}) => {
  await earnRoutes(page, {unavailable: {chain: 'UPSTREAM_DOWN', valdora: 'PIN_MISMATCH', defillama: 'TIMEOUT'}});
  await page.goto('/app/earn');
  const apr = page.locator('[data-live-figure="native-apr"]');
  await expect(apr).toHaveAttribute('data-state', 'unavailable');
  await expect(apr).toHaveAttribute('data-reason', 'UPSTREAM_DOWN');
  await expect(apr).toContainText('unavailable (the source did not answer just now)');
  await expect(page.locator('[data-live-figure="valdora-rate"]')).toContainText('unavailable (the contract is not the version ZIGoals checked)');
  await expect(page.locator('[data-live-figure="valdora-llama-tvl"]')).toHaveAttribute('data-reason', 'TIMEOUT');
  // OroSwap still answered, so its figures stay.
  await expect(page.locator('[data-live-figure="oroswap-zig-usdc"]')).toHaveAttribute('data-state', 'ok');
  // Unknown is never zero, and the calculator falls back to the person's own numbers.
  await expect(page.locator('#native-staking .earn-value').filter({hasText: /^0(\.0+)?\s%$/})).toHaveCount(0);
  await expect(page.locator('[data-live-figure="calculator"]')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('#native-staking .earn-steps li')).toHaveCount(6);
  // Session AF (L1c, N5): moved at equal strength (still the exact count, now of the longer list, 5 → 7) and Valdora's
  // added beside it: with their sources down, every risk stays.
  await expect(page.locator('#native-staking .earn-risks li')).toHaveCount(7);
  await expect(page.locator('#valdora .earn-risks li')).toHaveCount(8);
  await expect(page.locator('#valdora .earn-steps li')).toHaveCount(5);
});

test('with a linked ZIGChain wallet the summary leads: the relay\'s own sentence while mainnet is refused, the figures once it answers', async ({page}) => {
  // A public address (the self-bond account of a validator), linked read-only on this device.
  const address = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
  await page.evaluate(a => localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address: a, addedAt: '2026-10-18T08:00:00.000Z'}]})), address);
  await earnRoutes(page);
  const refused = 'Mainnet addresses are not read on the public Alpha. Add your mainnet ZIG as a manual asset instead; snapshots you saved before stay.';
  await page.route(url => url.pathname === '/api/positions', route => route.fulfill({status: 403, json: {error: refused, code: 'MAINNET_NOT_ON_PUBLIC_ALPHA'}}));
  await page.goto('/app/earn');
  const chips = page.getByRole('navigation', {name: 'On this page'});
  await expect(chips.getByRole('link').first()).toHaveText('Your summary');
  const summary = page.locator('#summary');
  await expect(summary.locator('[data-live-figure="summary"]')).toHaveAttribute('data-state', 'unavailable');
  await expect(summary).toContainText(refused);
  await expect(summary).toContainText('My Keplr');
  const base = {network: 'zigchain-1', account: address, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-18T20:00:00.000Z', provenance: 'https://api.zigchain.com · block 13044950', notes: '', risk: '', executionAuthority: 'NONE', providerId: 'native-zig'};
  const positions = [
    {...base, id: `zigchain-1:${address}:stake:a`, sourceType: 'NATIVE_STAKING', quantity: '120000000000000000000', principal: '120000000000000000000', liquidity: 'BONDED'},
    {...base, id: `zigchain-1:${address}:reward:a`, sourceType: 'NATIVE_REWARDS', quantity: '1500000000000000000', unclaimedRewards: '1500000000000000000', liquidity: 'LOCKED'},
  ];
  await page.route(url => url.pathname === '/api/positions', route => route.fulfill({json: {positions}}));
  await page.reload();
  await expect(summary.locator('[data-live-figure="summary"]')).toHaveAttribute('data-state', 'ok');
  await expect(summary).toContainText('Staked120 ZIG');
  await expect(summary).toContainText('Rewards waiting to be claimed1.5 ZIG');
  await expect(summary).toContainText('Nothing unbonding');
});

test('until the validators route is in the build, its section says so and the rest works', async ({page}) => {
  await earnRoutes(page, {missingValidators: true});
  await page.goto('/app/earn');
  await expect(page.locator('#validators [data-live-figure="validators"]')).toHaveAttribute('data-reason', 'NOT_IN_THIS_BUILD');
  await expect(page.locator('#validators')).toContainText('this build of ZIGoals does not read it yet');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('[data-live-figure="native-apr"] dt')).toHaveText('Yearly rate before the validator’s commission');
});

test('the chip index stays at the top while the page scrolls and marks the section on screen', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  const chips = page.getByRole('navigation', {name: 'On this page'});
  // Session AF chunk 2: every way to earn has its own section and chip (the same exact-list check, the new list).
  await expect(chips.getByRole('link')).toHaveText(['Start here', 'Native staking', 'Valdora stZIG', 'USDC vaults', 'OroSwap', 'Nawa', 'DeFa', 'Permapod', 'Zignaly', 'Governance', 'Goal Vaults', 'Stablecoins', 'Validators', 'Academy', 'Calculator', 'Safety']);
  for (const chip of await chips.getByRole('link').all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await chips.getByRole('link', {name: 'Validators'}).click();
  await expect(page).toHaveURL(/#validators$/);
  await expect(chips.getByRole('link', {name: 'Validators'})).toHaveAttribute('aria-current', 'true');
  const box = await chips.boundingBox();
  expect(box!.y).toBeLessThan(120);
  await page.locator('#safety').scrollIntoViewIfNeeded();
  await expect(chips.getByRole('link', {name: 'Safety'})).toHaveAttribute('aria-current', 'true');
  await expect(chips.getByRole('link', {name: 'Validators'})).not.toHaveAttribute('aria-current', 'true');
  expect((await chips.boundingBox())!.y).toBeLessThan(120);
  // Keyboard: the chips are links in the tab order.
  await chips.getByRole('link', {name: 'OroSwap'}).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#oroswap$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
