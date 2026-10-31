import {expect, test, type Page, type Request} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {openStatusSheet} from './ab-shell';

/**
 * Session AF (L2b, Part 3, ADR-028 H16, H40, H87; `TIER 3 (wallet)` + `TIER 3 (CSP)`): real read-only connections and
 * read-only tracking with injected test doubles only — a fake EIP-6963 MetaMask and a fake Wallet Standard Phantom, each
 * recording every call — and recorded answers for every balance host (routed by Playwright; nothing reaches PublicNode,
 * mempool.space or the market service). Each address must reach only its own chain's host.
 */
const LINKED_KEY = 'zigoals:linked-wallets:v1', BALANCES_KEY = 'zigoals:wallet-balances:v1';
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9';
const BTC = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', ZIG = toBech32('zig', new Uint8Array(20).fill(9)), HUB = toBech32('cosmos', new Uint8Array(20).fill(9));
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-4)}`;
const w = (n: string) => n.padStart(64, '0');
const AT = '2026-10-19T08:00:00.000Z';

async function fakeWallets(page: Page) {
  const calls: string[] = [];
  await page.exposeFunction('__recordWalletCall', (call: string) => { calls.push(call); });
  await page.addInitScript(({evm, sol}) => {
    const record = (call: string) => Reflect.get(window, '__recordWalletCall')(call);
    const provider = new Proxy({}, {get(_, property) {
      if (property !== 'request') return typeof property === 'string' && property !== 'then' ? async () => { await record(`metamask.${property}`); throw Error('not allowed'); } : undefined;
      return async ({method}: {method: string}) => { await record(`metamask.request:${method}`); if (method === 'eth_requestAccounts') return [evm]; throw Error(`${method} is not allowed in this test`); };
    }});
    window.addEventListener('eip6963:requestProvider', () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {detail: Object.freeze({info: {uuid: 'mm-1', rdns: 'io.metamask', name: 'MetaMask', icon: 'data:image/svg+xml;base64,PHN2Zy8+'}, provider})})));
    const features = new Proxy({
      'standard:connect': {version: '1.0.0', connect: async () => { await record('phantom.standard:connect'); return {accounts: [{address: sol, chains: ['solana:mainnet']}]}; }},
      'standard:disconnect': {version: '1.0.0', disconnect: async () => { await record('phantom.standard:disconnect'); }},
    } as Record<string, unknown>, {get(target, property) { if (typeof property === 'string' && !(property in target)) void record(`phantom.feature:${property}`); return target[property as string]; }});
    const phantom = {version: '1.0.0', name: 'Phantom', icon: 'data:image/svg+xml;base64,PHN2Zy8+', chains: ['solana:mainnet', 'solana:devnet'], accounts: [], features};
    window.addEventListener('wallet-standard:app-ready', event => (event as CustomEvent).detail.register(phantom));
  }, {evm: EVM, sol: SOL});
  return calls;
}
/** Recorded answers for every balance host, and a log of what each host was sent. */
async function balanceHosts(page: Page) {
  const sent: {host: string; text: string}[] = [];
  const log = (request: Request) => sent.push({host: new URL(request.url()).host, text: `${request.url()} ${request.postData() ?? ''}`});
  await page.context().route(/^https:\/\/[a-z0-9-]+-rpc\.publicnode\.com\/?$/, async route => {
    log(route.request());
    const host = new URL(route.request().url()).host, batch = route.request().postDataJSON() as {id: number; method: string}[];
    const usdc = host.startsWith('ethereum') ? `0x${w('20')}${w('2')}${w('40')}${w('c0')}${w('1')}${w('40')}${w('20')}${w('2faf080')}${w('1')}${w('40')}${w('20')}${w('0')}` : `0x${w('20')}${w('1')}${w('20')}${w('1')}${w('40')}${w('20')}${w('0')}`;
    const answer = host.startsWith('solana') ? [{jsonrpc: '2.0', id: 1, result: {context: {slot: 458603820}, value: 2500000000}}, {jsonrpc: '2.0', id: 2, result: {context: {slot: 458603820}, value: [null, null]}}]
      : batch.map(c => ({jsonrpc: '2.0', id: c.id, result: c.method === 'eth_getBalance' ? (host.startsWith('ethereum') ? '0x14d1120d7b160000' : '0x0') : c.method === 'eth_call' ? usdc : '0x1902129'}));
    await route.fulfill({json: answer, headers: {'access-control-allow-origin': '*'}});
  });
  await page.context().route('https://mempool.space/**', async route => { log(route.request()); await route.fulfill({json: {address: BTC, chain_stats: {funded_txo_sum: 150000, spent_txo_sum: 50000}, mempool_stats: {funded_txo_sum: 0, spent_txo_sum: 0}}, headers: {'access-control-allow-origin': '*'}}); });
  await page.context().route('https://cosmos-rest.publicnode.com/**', async route => { log(route.request()); await route.fulfill({json: {balance: {denom: 'uatom', amount: '12500000'}}, headers: {'access-control-allow-origin': '*'}}); });
  return sent;
}
const PRICES: Record<string, string> = {ethereum: '3000', 'usd-coin': '1', bitcoin: '60000', cosmos: '4', solana: '150'};
async function apis(page: Page) {
  // The app's own /api routes only (mempool.space's /api/address/… is a balance host, routed below).
  await page.route(url => url.pathname.startsWith('/api/') && (url.hostname === '127.0.0.1' || url.hostname === 'localhost'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.route('**/api/positions?**', route => route.fulfill({status: 403, json: {error: 'Mainnet addresses are not read on the public Alpha. Add your mainnet ZIG as a manual asset instead; snapshots you saved before stay.'}}));
  await page.route('**/api/market-quotes', route => {
    const body = route.request().postDataJSON() as {requests: {marketRef: {id: string}; currency: string}[]}, now = new Date().toISOString();
    return route.fulfill({json: {quotes: body.requests.filter(r => PRICES[r.marketRef.id]).map(r => ({base: {network: 'coingecko-coin', denom: r.marketRef.id, decimals: 0}, marketRef: r.marketRef, currency: r.currency, price: PRICES[r.marketRef.id], priceDecimals: 0, source: 'CoinGecko', providerAssetId: r.marketRef.id, observedAt: now, fetchedAt: now, verification: 'VERIFIED'})), error: null}});
  });
}
async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
}
const seed = (page: Page, wallets: unknown[]) => page.addInitScript(({key, value}) => { if (!sessionStorage.getItem('fixture-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('fixture-seeded', '1'); } }, {key: LINKED_KEY, value: JSON.stringify({version: 1, wallets})});
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), LINKED_KEY);

test('computers: MetaMask links over EIP-6963 and Phantom over the Wallet Standard, each asked for its address only; Remove disconnects', async ({page, isMobile}) => {
  test.skip(isMobile, 'phones: the sheet test');
  await apis(page); const calls = await fakeWallets(page); await balanceHosts(page);
  await ready(page, '/app');
  const trigger = page.locator('.status-row .status-wallet').getByRole('button', {name: 'More wallets', exact: true}), menu = page.getByRole('menu', {name: 'More wallets'});
  const open = async () => { await expect(async () => { if (!await menu.isVisible()) await trigger.click(); await expect(menu).toBeVisible({timeout: 1500}); }).toPass({timeout: 15000}); };
  await open();
  // Working connections, no "Preview"; the four not installed get their official sites.
  await expect(menu).not.toContainText('Preview');
  for (const name of ['MetaMask: link address', 'Phantom: link Solana address']) await expect(menu.getByRole('menuitem', {name, exact: true})).toBeVisible();
  for (const [name, href] of [['Get Rabby', 'https://rabby.io/'], ['Get Trust Wallet', 'https://trustwallet.com/'], ['Get OKX Wallet', 'https://web3.okx.com/'], ['Get Phantom', 'https://phantom.com/']] as const) {
    const link = menu.getByRole('menuitem', {name, exact: true});
    await expect(link).toHaveAttribute('href', href); await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); await expect(link).toHaveAttribute('target', '_blank');
  }
  await expect(menu.getByRole('menuitem', {name: 'Get MetaMask'})).toHaveCount(0);
  expect(calls).toEqual([]);
  const status = page.locator('.wallet-menu [role="status"]');
  await menu.getByRole('menuitem', {name: 'MetaMask: link address', exact: true}).click();
  await expect(status).toHaveText(`MetaMask ${short(EVM)} linked, read-only.`);
  await menu.getByRole('menuitem', {name: 'Phantom: link Solana address', exact: true}).click();
  await expect(status).toHaveText(`Phantom ${short(SOL)} linked, read-only.`);
  expect((await stored(page)).wallets.map((x: {kind: string; wallet: string; via: string}) => [x.kind, x.wallet, x.via])).toEqual([['evm', 'io.metamask', 'extension'], ['solana', 'solana:phantom', 'extension']]);
  await menu.getByRole('menuitem', {name: `Remove Phantom ${short(SOL)}`, exact: true}).click();
  await expect(status).toHaveText(`Phantom ${short(SOL)} removed from this device.`);
  await expect.poll(() => calls).toEqual(['metamask.request:eth_requestAccounts', 'phantom.standard:connect', 'phantom.standard:disconnect']);
  expect((await stored(page)).wallets.map((x: {kind: string}) => x.kind)).toEqual(['evm']);
});

test('phones: the Status & wallet sheet offers the wallets\' own browsers and, with the owner\'s project ID (Session AK), WalletConnect for linking and for staking with Keplr Mobile', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await apis(page); await fakeWallets(page);
  await ready(page, '/app');
  const sheet = await openStatusSheet(page), choices = sheet.locator('.wallet-choices');
  const host = new URL(page.url()).host;
  await expect(choices.getByRole('link', {name: 'Open ZIGoals in MetaMask', exact: true})).toHaveAttribute('href', `https://link.metamask.io/dapp/${host}/app`);
  await expect(choices.getByRole('link', {name: 'Open ZIGoals in Trust Wallet', exact: true})).toHaveAttribute('href', `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(`http://${host}/app`)}`);
  // Session AK (Part 1a, AFL9): the "available soon" line went with the owner's Reown project ID; both WalletConnect rows are here.
  await expect(choices.getByRole('button', {name: /^Connect by WalletConnect/})).toBeVisible();
  await expect(choices.getByRole('button', {name: /^Stake with Keplr Mobile/})).toBeVisible();
  await expect(choices).not.toContainText('available soon on phones');
  await expect(choices).not.toContainText('Preview');
  await expect(sheet.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  for (const control of await choices.locator('button, a').all()) { const box = (await control.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); }
});

test('Wealth: linked wallets\' balances, read browser-direct, each address only at its own chain\'s host; filters; a total in the person\'s currency; ZIGChain unavailable with the relay\'s reason', async ({page}) => {
  await apis(page); const sent = await balanceHosts(page);
  await seed(page, [
    {id: 'w-evm', kind: 'evm', wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT, chains: ['eip155:1', 'eip155:8453'], via: 'extension'},
    {id: 'w-sol', kind: 'solana', wallet: 'solana:phantom', label: 'Phantom', address: SOL, addedAt: AT, via: 'extension'},
    {id: 'w-btc', kind: 'btc', wallet: 'bitcoin-watch', label: 'Bitcoin', address: BTC, addedAt: AT, via: 'typed'},
    {id: 'w-zig', kind: 'cosmos', wallet: 'leap', label: 'Leap', address: ZIG, addedAt: AT},
  ]);
  await ready(page, '/app/wealth');
  const section = page.locator('.wallet-holdings');
  await expect(section.getByRole('heading', {name: 'Your linked wallets'})).toBeVisible({timeout: 20000});
  // Ethereum: 1.5 ETH and 50 USDC; Base: nothing; Solana: 2.5 SOL; Bitcoin: 0.001 BTC; Cosmos Hub: 12.5 ATOM.
  const rows = section.locator('.wallet-holding');
  await expect(rows).toHaveCount(5);
  await expect(section.locator('.wallet-holding[data-chain="eip155:1"]').first()).toContainText('1.5 ETH');
  await expect(section.locator('.wallet-holding[data-chain="eip155:1"]').nth(1)).toContainText('50 USDC');
  await expect(section.locator('.wallet-holding[data-chain="solana:mainnet"]')).toContainText('2.5 SOL');
  await expect(section.locator('.wallet-holding[data-chain="bitcoin"]')).toContainText('0.001 BTC');
  await expect(section.locator('.wallet-holding[data-chain="cosmoshub-4"]')).toContainText('12.5 ATOM');
  // 4500 + 50 + 375 + 60 + 50 = 5,035 in the base currency, with "prices as of".
  await expect(section.locator('[data-wallet-total]')).toContainText(/≈ .?5,035\.00/);
  await expect(section.locator('[data-wallet-total]')).toContainText('prices as of');
  await expect(section).toContainText('Read with nothing held: Base (MetaMask)');
  // ZIGChain goes through the relay only; its refusal is the reason, and nothing reads as 0 ZIG.
  await expect(section).toContainText('ZIGChain (Leap): Mainnet addresses are not read on the public Alpha.');
  await expect(section).not.toContainText('0 ZIG');
  // Filters: one wallet, then one chain.
  await section.getByRole('group', {name: 'Show wallet'}).getByRole('button', {name: /^Phantom/}).click();
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText('SOL');
  await section.getByRole('group', {name: 'Show wallet'}).getByRole('button', {name: /^All wallets/}).click();
  await section.getByRole('group', {name: 'Show chain'}).getByRole('button', {name: /^Ethereum/}).click();
  await expect(rows).toHaveCount(2);
  // Each host received only the address of its own chain (and no other linked address).
  const all = [EVM, SOL, BTC, ZIG, HUB];
  const expectOnly = (hostPart: string, address: string) => { const texts = sent.filter(s => s.host.startsWith(hostPart)).map(s => s.text); expect(texts.length, hostPart).toBeGreaterThan(0); for (const t of texts) for (const a of all) expect(t.toLowerCase().includes(a.toLowerCase()), `${hostPart} got ${a}`).toBe(a === address); };
  expectOnly('ethereum-rpc', EVM); expectOnly('base-rpc', EVM); expectOnly('solana-rpc', SOL); expectOnly('mempool.space', BTC); expectOnly('cosmos-rest', HUB);
  expect(sent.filter(s => /arbitrum|optimism|polygon|bsc/.test(s.host))).toEqual([]);
  // Stored on this device: the last read per wallet × chain.
  const balances = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), BALANCES_KEY);
  expect(Object.keys(balances.observations).sort()).toEqual(['w-btc|bitcoin', 'w-evm|eip155:1', 'w-evm|eip155:8453', 'w-sol|solana:mainnet', 'w-zig|cosmoshub-4', 'w-zig|zigchain-1']);
  expect(balances.observations['w-zig|zigchain-1'].assets).toBeUndefined();
});

test('Portfolio: "From your wallets" strip with the same rows; nothing renders without a linked wallet', async ({page}) => {
  await apis(page); await balanceHosts(page);
  await ready(page, '/app/portfolio');
  await expect(page.locator('.wallet-holdings')).toHaveCount(0);
  await page.evaluate(({key, value}) => localStorage.setItem(key, value), {key: LINKED_KEY, value: JSON.stringify({version: 1, wallets: [{id: 'w-btc', kind: 'btc', wallet: 'bitcoin-watch', label: 'Bitcoin', address: BTC, addedAt: AT}]})});
  await ready(page, '/app/portfolio');
  const strip = page.locator('.wallet-holdings[data-variant="portfolio"]');
  await expect(strip.getByRole('heading', {name: 'From your wallets'})).toBeVisible({timeout: 20000});
  await expect(strip.locator('.wallet-holding')).toContainText('0.001 BTC');
  await expect(strip.getByRole('link', {name: 'Open in Wealth →'})).toHaveAttribute('href', '/app/wealth#holdings');
});
