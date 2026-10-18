import {expect, test} from '@playwright/test';
import {EVM, HUB, SOL, ZIG, addMoneyFixtures, ready} from './add-money-fixtures';

/**
 * Session AF (L2b, Part 4, ADR-028 H18, H34, H35, H83; A2.2–A2.8, P4.2–P4.5): multi-asset Add money. Linked wallets are
 * seeded on the device; Ramp's figures come from ZIGoals' own route (answered here); every balance read is a recorded
 * answer; the provider's page is never opened (any request to it fails the spec).
 */
const steps = (page: import('@playwright/test').Page) => page.locator('.add-money');

test('the five steps: plain words, the recommended network and its warning, only matching linked addresses, the providers with Ramp\'s live figures, a new-tab hand-off', async ({page}) => {
  const hits = await addMoneyFixtures(page);
  await ready(page, '/app/wealth/add-money');
  const view = steps(page);
  await expect(view.getByRole('note').first()).toHaveText(/ZIGoals sells nothing and never touches your payment or your money/);
  // 1. What to buy: seven tiles in plain words, each with "What's this?".
  const tiles = view.getByRole('group', {name: 'What to buy'});
  await expect(tiles.getByRole('button')).toHaveCount(7);
  await expect(tiles.getByRole('button', {name: /USD Coin/})).toContainText('USDC: a digital dollar, stays about 1 USD.');
  await expect(tiles.getByRole('button', {name: /ZIG via ATOM/})).toContainText('buy ATOM, move it to ZIGChain, swap it for ZIG');
  await tiles.locator('details').first().locator('summary').click();
  await expect(tiles.locator('details').first()).toContainText('issued by Circle');
  await tiles.getByRole('button', {name: /USD Coin/}).click();
  // 2. Which network: Base preselected and marked, the fee difference in words, Ramp's own network fee, the warning.
  const networks = view.getByRole('group', {name: 'Network'});
  await expect(networks.getByRole('button', {name: /^Base/})).toHaveAttribute('aria-pressed', 'true');
  await expect(networks.getByRole('button', {name: /^Base/})).toContainText('Recommended');
  await expect(view).toContainText('moving or swapping your USDC later usually costs far less than on Ethereum itself');
  await expect(networks.getByRole('button', {name: /^Base/})).toContainText(/Ramp’s network fee here: \$0\.01 \(Ramp’s figure, as of/);
  await expect(view.locator('[data-network-warning]')).toContainText('Your wallet must be on this network: Base.');
  // 3. Where it arrives: only the EVM wallet (never the Solana or the ZIGChain one).
  const where = view.getByRole('group', {name: 'Your wallet on this network'});
  await expect(where.getByRole('button')).toHaveCount(1);
  await expect(where.getByRole('button')).toContainText('MetaMask');
  // Solana: only Phantom.
  await networks.getByRole('button', {name: /^Solana/}).click();
  await expect(view.locator('[data-network-warning]')).toContainText('Your wallet must be on this network: Solana.');
  await expect(where.getByRole('button')).toHaveCount(1);
  await expect(where.getByRole('button')).toContainText('Phantom');
  // 4. Providers: Ramp with its figures and "as of"; Banxa says its fees are on its page.
  const providers = view.getByRole('group', {name: 'Provider'});
  await expect(providers.getByRole('button', {name: /Ramp Network/})).toContainText(/Ramp’s fees: 0\.99% to 3\.9% of the amount, at least \$2\.49; buy at least \$6\.25\. Ramp’s figures, as of/);
  await expect(providers.getByRole('button', {name: /Ramp Network/})).toContainText('Central Bank of Ireland');
  await expect(providers.getByRole('button', {name: /Banxa/})).toContainText('Fees are shown on Banxa’s page before you pay.');
  // 5. The hand-off: the committed IDs are empty, so Ramp's own site with nothing filled in, in a new tab, no opener.
  const go = view.getByRole('link', {name: /Continue on Ramp/});
  await expect(go).toHaveAttribute('href', 'https://rampnetwork.com/');
  await expect(go).toHaveAttribute('target', '_blank'); await expect(go).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(view).toContainText('nothing filled in');
  await expect(view.locator('.add-money-address code')).toHaveText(SOL);
  await providers.getByRole('button', {name: /Banxa/}).click();
  await expect(view.getByRole('link', {name: /Continue on Banxa/})).toHaveAttribute('href', 'https://banxa.com/');
  const back = view.getByRole('link', {name: /I’ve finished: watch for it/});
  await expect(back).toHaveAttribute('href', '/app/wealth/add-money/back?provider=banxa&asset=usdc&network=solana&wallet=w-sol');
  // ATOM (and ZIG via ATOM) go to the zig1 key's cosmos1 twin, never to the zig1 address itself.
  await tiles.getByRole('button', {name: /ZIG via ATOM/}).click();
  await expect(where.getByRole('button')).toContainText('the same key’s Cosmos Hub address');
  await expect(where.getByRole('button').locator('[title]')).toHaveAttribute('title', HUB);
  await expect(view.locator('.add-money-address code')).toHaveText(HUB);
  expect(await page.locator('a[href]').evaluateAll((links, zig) => links.filter(a => (a as HTMLAnchorElement).href.includes(zig as string)).length, ZIG)).toBe(0);
  expect(hits).toEqual([]);
});

test('no linked wallet for the network: "link a wallet for this network first", and no address is offered', async ({page}) => {
  const hits = await addMoneyFixtures(page, {wallets: [{id: 'w-evm', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: '2026-10-19T08:00:00.000Z'}]});
  await ready(page, '/app/wealth/add-money');
  const view = steps(page);
  await view.getByRole('group', {name: 'What to buy'}).getByRole('button', {name: /^Bitcoin/}).click();
  await expect(view.locator('[data-link-first]')).toContainText('Link a wallet for Bitcoin first.');
  await expect(view.getByRole('group', {name: 'Provider'})).toHaveCount(0);
  await expect(view.getByRole('link', {name: /Continue on/})).toHaveCount(0);
  expect(hits).toEqual([]);
});

test('the return page: what happens next, a balance watch on that one address until it arrives, then "What can I do with it now?"', async ({page}) => {
  let usdc = '0';
  const hits = await addMoneyFixtures(page, {usdcOnBase: () => usdc});
  const sent: string[] = [];
  page.on('request', r => { if (/publicnode|mempool/.test(r.url())) sent.push(`${new URL(r.url()).host} ${r.postData() ?? ''}`); });
  await ready(page, '/app/wealth/add-money/back?provider=ramp&asset=usdc&network=base&wallet=w-evm');
  const view = steps(page);
  await expect(view).toContainText('Ramp’s own figures: card, Apple Pay or Google Pay up to 5 minutes');
  const watch = view.locator('[data-balance-watch]');
  await expect(watch.getByRole('heading')).toHaveText('Watching for your USDC');
  await expect(watch.getByRole('status')).toContainText('USDC on Base: 0');
  usdc = '25000000';
  await watch.getByRole('button', {name: 'Read now'}).click();
  await expect(watch).toHaveAttribute('data-balance-watch', 'arrived');
  await expect(watch.getByRole('heading')).toHaveText('Your USDC arrived');
  await expect(watch.getByRole('status')).toContainText('USDC on Base: 25 (+25 since you came back)');
  await expect(watch.getByRole('link', {name: 'Wealth → What you have'})).toHaveAttribute('href', '/app/wealth#holdings');
  // Only Base was read, only with this wallet's address; the page's own address holds no address.
  expect(sent.length).toBeGreaterThan(0);
  for (const s of sent) { expect(s.startsWith('base-rpc.publicnode.com'), s).toBe(true); expect(s, s).toContain(EVM.slice(2).toLowerCase()); }
  expect(page.url()).not.toContain(EVM);
  // What can I do with it now: hold (issuer, depeg, network), swap, no recommended route yet, earn; links verified.
  const next = view.getByRole('region', {name: 'What can I do with it now?'});
  await expect(next.locator('[data-guide]')).toHaveCount(4);
  await expect(next.locator('[data-guide="hold"]')).toContainText('depeg');
  await expect(next.locator('[data-guide="bridge"]')).toContainText('does not recommend a route for USDC onto ZIGChain yet');
  for (const a of await next.locator('a[target="_blank"]').all()) { await expect(a).toHaveAttribute('rel', 'noopener noreferrer'); }
  await expect(next.getByRole('link', {name: /Circle: about this stablecoin/})).toHaveAttribute('href', 'https://www.circle.com/usdc');
  await expect(next.getByRole('link', {name: 'Open Earn →'})).toHaveAttribute('href', '/app/earn');
  expect(hits).toEqual([]);
});

test('ZIG via ATOM: the IBC step and the OroSwap swap as guided link-outs from the registry', async ({page}) => {
  await addMoneyFixtures(page);
  await ready(page, '/app/wealth/add-money/back?provider=banxa&asset=zig-via-atom&network=cosmos-hub&wallet=w-zig');
  const view = steps(page);
  await expect(view).toContainText('Banxa’s own figures');
  const next = view.getByRole('region', {name: 'What can I do with it now?'});
  await expect(next.locator('[data-guide="bridge"]')).toContainText('channel-1555');
  await expect(next.getByRole('link', {name: /ZIGChain Hub bridge/})).toHaveAttribute('href', 'https://hub.zigchain.com/bridge/');
  await expect(next.getByRole('link', {name: /OroSwap swap/})).toHaveAttribute('href', 'https://app.oroswap.org/swap');
  await expect(next.getByRole('link', {name: 'Open Staking →'})).toHaveAttribute('href', '/app/staking');
});

test('entry points: Wealth\'s holdings header and a malformed return address', async ({page}) => {
  await addMoneyFixtures(page);
  await ready(page, '/app/wealth');
  await expect(page.getByRole('region', {name: 'What you have', exact: true}).getByRole('link', {name: 'Add money →'})).toHaveAttribute('href', '/app/wealth/add-money');
  await ready(page, '/app/wealth/add-money/back?provider=moonpay&asset=usdc&network=base&wallet=w-evm');
  await expect(steps(page).getByRole('heading', {name: 'Nothing to watch here'})).toBeVisible();
});
