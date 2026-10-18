import {expect, test, type Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {expectAlphaMode, openStatusSheet} from './ab-shell';
import {isPhone, openFold} from './phone-nav';

/**
 * Session AE (Part 6, ADR-027; `TIER 3 (wallet)`): "Connect Keplr ▾". Injected test doubles only (not real extensions):
 * Keplr, Leap, Cosmostation's Keplr-compatible provider and two EIP-6963 wallets, each a Proxy that records EVERY method
 * called on it, so a signing, sending or permission call would show in the list. Only reads may happen: Keplr's connect
 * (suggest, enable, getKey) and, for Disconnect, disable; Leap and Cosmostation suggest, enable, getKey; the EVM wallets
 * eth_requestAccounts. Every /api request answers 503, so no market price exists. wallet-reload.spec is unchanged.
 */
const LINKED_KEY = 'zigoals:linked-wallets:v1', HINT_KEY = 'zigoals:wallet-reconnect-hint:v1';
const KEPLR = toBech32('zig', new Uint8Array(20).fill(9)), LEAP = toBech32('zig', new Uint8Array(20).fill(4)), STATION = toBech32('zig', new Uint8Array(20).fill(6));
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7';
const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-4)}`;
const FOX_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiLz4=';
// Public test vectors (BIP-173, BIP-350) and the Bitcoin wiki's example address: well formed, held by no one here.
const BTC = {bech32: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', bech32m: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0', base58: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', badChecksum: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3', badBech32: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5'};
const READS = /^(keplr\.(experimentalSuggestChain|enable|getKey|disable)|leap\.(experimentalSuggestChain|enable|getKey)|cosmostation\.(experimentalSuggestChain|enable|getKey)|(fox|purse)\.request:eth_requestAccounts)$/;

async function wallets(page: Page) {
  const calls: string[] = [];
  await page.exposeFunction('__recordWalletCall', (call: string) => { calls.push(call); });
  await page.addInitScript(({keplr, leap, station, evm, foxIcon}) => {
    const record = (call: string) => Reflect.get(window, '__recordWalletCall')(call);
    // Injected test doubles only. Any method not listed records itself and fails.
    const recording = (prefix: string, impl: Record<string, (...args: unknown[]) => unknown>) => new Proxy({}, {get(_, property) {
      if (typeof property !== 'string' || property === 'then' || property === 'toJSON') return undefined;
      return async (...args: unknown[]) => { await record(`${prefix}.${property}`); if (property in impl) return impl[property]!(...args); throw Error(`${prefix}.${property} is not allowed in this test`); };
    }});
    const cosmos = (address: string) => ({experimentalSuggestChain: async () => undefined, enable: async () => undefined, getKey: async () => ({bech32Address: address, pubKey: new Uint8Array(33), name: 'Fictional'})});
    Object.assign(window, {keplr: recording('keplr', {...cosmos(keplr), disable: async () => undefined}), leap: recording('leap', cosmos(leap)), cosmostation: {providers: {keplr: recording('cosmostation', cosmos(station))}}});
    const evmProvider = (key: string, accounts: string[]) => new Proxy({}, {get(_, property) {
      if (property !== 'request') return typeof property === 'string' && property !== 'then' ? async () => { await record(`${key}.${property}`); throw Error('not allowed'); } : undefined;
      return async ({method}: {method: string}) => { await record(`${key}.request:${method}`); if (method === 'eth_requestAccounts') return accounts; throw Error(`${method} is not allowed in this test`); };
    }});
    const announce = () => {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {detail: Object.freeze({info: {uuid: 'fox-1', rdns: 'test.fictional.fox', name: '  Fictional   Fox  ', icon: foxIcon}, provider: evmProvider('fox', [evm])})}));
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {detail: Object.freeze({info: {uuid: 'purse-1', rdns: 'test.plain.purse', name: 'Plain Purse', icon: 'https://example.invalid/purse.png'}, provider: evmProvider('purse', [])})}));
    };
    window.addEventListener('eip6963:requestProvider', announce);
  }, {keplr: KEPLR, leap: LEAP, station: STATION, evm: EVM, foxIcon: FOX_ICON});
  // Keplr's connect checks the public testnet before it suggests the chain; answered here (as in wallet-reload.spec).
  await page.route('https://testnet-**.zigchain.com/**', async route => {
    const url = route.request().url();
    await route.fulfill({json: url.includes('node_info') ? {default_node_info: {network: 'zig-test-2'}, application_version: {version: 'v5.1.0'}} : url.includes('staking') ? {params: {bond_denom: 'azig'}} : url.includes('denoms_metadata') ? {metadata: {base: 'azig', display: 'ZIG', denom_units: [{denom: 'ZIG', exponent: 18}]}} : {balance: {denom: 'azig', amount: '0'}}});
  });
  return calls;
}
/** A page whose shell has hydrated (the root's mark), so a click reaches React. */
async function ready(page: Page, path?: string) {
  if (path) await page.goto(path); else await page.reload();
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
}
/** Opens the ▾ menu (computers), repeating a click that landed before its chunk could answer. */
async function openMenu(page: Page) {
  const trigger = page.locator('.status-row .status-wallet').getByRole('button', {name: 'More wallets', exact: true}), menu = page.getByRole('menu', {name: 'More wallets'});
  await expect(async () => { if (!await menu.isVisible()) await trigger.click(); await expect(menu).toBeVisible({timeout: 1500}); }).toPass({timeout: 15000});
  return menu;
}
/** Presses a display-currency button of the card until it reads as pressed (the card's chunk may still be loading). */
async function pick(card: ReturnType<Page['locator']>, currency: string) {
  const button = card.getByRole('group', {name: 'Show the balance in'}).getByRole('button', {name: currency, exact: true});
  await expect(async () => { await button.click(); await expect(button).toHaveAttribute('aria-pressed', 'true', {timeout: 1500}); }).toPass({timeout: 15000});
}
const stored = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as {wallets?: {kind: string; wallet: string; label: string; address: string}[]; display?: string; selected?: string} | null, LINKED_KEY);
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}})); });

test('computers: the ▾ menu shows the choices, reads only addresses, offers official sites only, and Remove survives a reload', async ({page, isMobile}) => {
  test.skip(isMobile, 'phones have the same choices in the Status & wallet sheet (next test)');
  const calls = await wallets(page);
  await ready(page, '/app');
  const row = page.locator('.status-row .status-wallet');
  // The main buttons keep their names and flow; the ▾ is a separate 44 px menu button.
  await expect(row.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  await expect(row.getByRole('button', {name: 'Demo records', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const trigger = row.getByRole('button', {name: 'More wallets', exact: true});
  await expect(trigger).toHaveAttribute('aria-haspopup', 'menu'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const size = (await trigger.boundingBox())!; expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
  const menu = await openMenu(page);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.getByRole('menuitem', {name: 'Keplr', exact: true})).toBeFocused();
  for (const name of ['Leap: link address', 'Cosmostation: link address', 'Fictional Fox: link address', 'Plain Purse: link address', 'Watch a Bitcoin address']) await expect(menu.getByRole('menuitem', {name, exact: true}), name).toBeVisible();
  // An announced data: image is shown; a remote URL never is (the generic glyph instead); the name is plain text.
  await expect(menu.getByRole('menuitem', {name: 'Fictional Fox: link address'}).locator('img')).toHaveAttribute('src', FOX_ICON);
  await expect(menu.getByRole('menuitem', {name: 'Plain Purse: link address'}).locator('img')).toHaveCount(0);
  await expect(page.locator('img[src^="https://example.invalid"]')).toHaveCount(0);
  // Not installed: official sites only, in a new tab with no opener; Keplr is installed (no "Get Keplr"); Leap and Cosmostation have none.
  for (const [name, href] of [['Get MetaMask', 'https://metamask.io/'], ['Get Rabby', 'https://rabby.io/'], ['Get Coinbase Wallet', 'https://www.coinbase.com/wallet']] as const) {
    const link = menu.getByRole('menuitem', {name, exact: true});
    await expect(link).toHaveAttribute('href', href); await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(menu.getByRole('menuitem', {name: 'Get Keplr'})).toHaveCount(0);
  expect(await page.locator('a[href]').evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href).filter(h => /leapwallet|cosmostation/i.test(h)))).toEqual([]);
  // Keys as in a menu; Escape and a click outside close it, the focus back on the ▾.
  await page.keyboard.press('ArrowDown'); await expect(menu.getByRole('menuitem', {name: 'Leap: link address'})).toBeFocused();
  await page.keyboard.press('End'); await expect(menu.getByRole('menuitem', {name: 'Watch a Bitcoin address'})).toBeFocused();
  await page.keyboard.press('Home'); await expect(menu.getByRole('menuitem', {name: 'Keplr', exact: true})).toBeFocused();
  await page.keyboard.press('Escape'); await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
  await openMenu(page);
  await page.locator('main h1').first().click({position: {x: 4, y: 4}}); await expect(menu).toBeHidden();
  expect(calls).toEqual([]); // opening the menu asks no wallet for anything
  // Link three addresses: each wallet gets only its reads.
  const status = page.locator('.wallet-menu [role="status"]');
  await openMenu(page); await menu.getByRole('menuitem', {name: 'Leap: link address'}).click();
  await expect(status).toHaveText(`Leap ${short(LEAP)} linked, read-only.`);
  await menu.getByRole('menuitem', {name: 'Cosmostation: link address'}).click();
  await expect(status).toHaveText(`Cosmostation ${short(STATION)} linked, read-only.`);
  await menu.getByRole('menuitem', {name: 'Fictional Fox: link address'}).click();
  await expect(status).toHaveText(`Fictional Fox ${short(EVM)} linked, read-only.`);
  await menu.getByRole('menuitem', {name: 'Plain Purse: link address'}).click();
  await expect(status).toHaveText('That wallet did not give an account address, so nothing was linked.');
  expect(calls).toEqual(['leap.experimentalSuggestChain', 'leap.enable', 'leap.getKey', 'cosmostation.experimentalSuggestChain', 'cosmostation.enable', 'cosmostation.getKey', 'fox.request:eth_requestAccounts', 'purse.request:eth_requestAccounts']);
  expect((await stored(page))!.wallets!.map(w => [w.kind, w.wallet, w.label, w.address])).toEqual([['cosmos', 'leap', 'Leap', LEAP], ['cosmos', 'cosmostation', 'Cosmostation', STATION], ['evm', 'test.fictional.fox', 'Fictional Fox', EVM]]);
  // A linked address never becomes the app's wallet.
  await expect(row.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  // Remove, then reload: it stays removed.
  await menu.getByRole('menuitem', {name: `Remove Leap ${short(LEAP)}`}).click();
  await expect(status).toHaveText(`Leap ${short(LEAP)} removed from this device.`);
  await ready(page);
  await openMenu(page);
  await expect(menu.getByRole('menuitem', {name: `Remove Cosmostation ${short(STATION)}`})).toBeVisible();
  await expect(menu.getByRole('menuitem', {name: /^Remove Leap/})).toHaveCount(0);
  expect((await stored(page))!.wallets!.map(w => w.label)).toEqual(['Cosmostation', 'Fictional Fox']);
  expect(calls.every(call => READS.test(call)), calls.join(' ')).toBe(true);
});

test('computers: Keplr stays the main flow; Disconnect returns to the local demo, clears the reconnect hint and asks Keplr to forget the testnet', async ({page, isMobile}) => {
  test.skip(isMobile, 'the phone\'s Disconnect row is checked in the sheet test');
  const calls = await wallets(page);
  await ready(page, '/app');
  const row = page.locator('.status-row .status-wallet');
  await row.getByRole('button', {name: 'Connect Keplr', exact: true}).click();
  await expect(row.getByRole('button', {name: short(KEPLR), exact: true})).toBeVisible();
  await expect.poll(() => calls).toEqual(['keplr.experimentalSuggestChain', 'keplr.enable', 'keplr.getKey']);
  expect(await page.evaluate(key => sessionStorage.getItem(key), HINT_KEY)).toBe('true');
  const menu = await openMenu(page);
  await menu.getByRole('menuitem', {name: 'Disconnect', exact: true}).click();
  await expect(menu).toBeHidden(); await expect(row.getByRole('button', {name: 'More wallets', exact: true})).toBeFocused();
  await expect(row.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  await expect(row.getByRole('button', {name: 'Demo records', exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(key => sessionStorage.getItem(key), HINT_KEY)).toBeNull();
  await expect.poll(() => calls).toEqual(['keplr.experimentalSuggestChain', 'keplr.enable', 'keplr.getKey', 'keplr.disable']);
  await expectAlphaMode(page, 'LOCAL SIMULATION');
});

test('phones: the same choices as 44 px rows in the Status & wallet sheet; Bitcoin watch-only is checked on the device; Remove survives a reload', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const calls = await wallets(page);
  await ready(page, '/app');
  let sheet = await openStatusSheet(page);
  const choices = sheet.locator('.wallet-choices');
  await expect(choices.getByRole('heading', {name: 'More wallets'})).toBeVisible();
  for (const name of ['Leap: link address', 'Cosmostation: link address', 'Fictional Fox: link address', 'Plain Purse: link address', 'Watch a Bitcoin address', 'Get MetaMask']) await expect(choices.getByRole(name.startsWith('Get') ? 'link' : 'button', {name, exact: true}), name).toBeVisible();
  for (const control of await choices.locator('button, a').all()) { const box = (await control.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); }
  // The main buttons keep their own names in the sheet (no row repeats them).
  await expect(sheet.getByRole('button', {name: 'Connect Keplr'})).toHaveCount(1);
  await expect(sheet.getByRole('button', {name: 'Demo records'})).toHaveCount(1);
  // Bitcoin: a bad checksum is refused (both kinds); bech32, bech32m and base58check are accepted; no wallet is asked.
  const watch = async (address: string) => {
    if (!await choices.getByLabel('Bitcoin address', {exact: true}).isVisible()) await choices.getByRole('button', {name: 'Watch a Bitcoin address', exact: true}).click();
    await choices.getByLabel('Bitcoin address', {exact: true}).fill(address); await choices.getByRole('button', {name: 'Add', exact: true}).click();
  };
  for (const bad of [BTC.badChecksum, BTC.badBech32]) { await watch(bad); await expect(choices.getByRole('alert')).toHaveText(/not a valid Bitcoin address/); }
  for (const good of [BTC.bech32, BTC.bech32m, BTC.base58]) { await watch(good); await expect(choices.getByRole('status')).toHaveText(`Bitcoin ${short(good)} linked, read-only.`); }
  expect((await stored(page))!.wallets!.map(w => [w.kind, w.wallet, w.address])).toEqual([['btc', 'bitcoin-watch', BTC.bech32], ['btc', 'bitcoin-watch', BTC.bech32m], ['btc', 'bitcoin-watch', BTC.base58]]);
  await choices.getByRole('button', {name: 'Leap: link address', exact: true}).click();
  await expect(choices.getByRole('status')).toHaveText(`Leap ${short(LEAP)} linked, read-only.`);
  expect(calls).toEqual(['leap.experimentalSuggestChain', 'leap.enable', 'leap.getKey']);
  await choices.getByRole('button', {name: `Remove Bitcoin ${short(BTC.bech32m)}`, exact: true}).click();
  await expect(choices.getByRole('status')).toHaveText(`Bitcoin ${short(BTC.bech32m)} removed from this device.`);
  await ready(page);
  sheet = await openStatusSheet(page);
  await expect(sheet.getByRole('button', {name: `Remove Bitcoin ${short(BTC.bech32m)}`})).toHaveCount(0);
  await expect(sheet.getByRole('button', {name: `Remove Bitcoin ${short(BTC.base58)}`, exact: true})).toBeVisible();
  // Disconnect is a row here too once Keplr is connected.
  await sheet.getByRole('button', {name: 'Connect Keplr', exact: true}).click();
  await expect(sheet.getByRole('button', {name: short(KEPLR), exact: true})).toBeVisible();
  await sheet.locator('.wallet-choices').getByRole('button', {name: 'Disconnect', exact: true}).click();
  await expect(sheet.locator('.wallet-choices').getByRole('status')).toHaveText('Keplr disconnected. Your demo records are back.');
  await expect(sheet.getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), HINT_KEY)).toBeNull();
  expect(calls.every(call => READS.test(call)), calls.join(' ')).toBe(true);
});

test('Today\'s wallet card: ZIG first; another currency without a price reads "unavailable" (never 0); the choice survives a reload; a linked address shows read-only', async ({page}) => {
  const calls = await wallets(page);
  await page.addInitScript(({key, value}) => { if (!sessionStorage.getItem('fixture-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('fixture-seeded', '1'); } }, {key: LINKED_KEY, value: JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'evm', wallet: 'test.fictional.fox', label: 'Fictional Fox', address: EVM, addedAt: '2026-10-17T10:00:00.000Z'}]})});
  await ready(page, '/app');
  await openFold(page, 'Your wallet');
  const card = page.locator('.account-panel');
  await expect(card.locator('.account-value')).toHaveText('1,000 ZIG');
  await expect(card).toContainText('Simulated balance · this browser');
  const currency = card.getByRole('group', {name: 'Show the balance in'});
  await expect(currency.getByRole('button', {name: 'ZIG', exact: true})).toHaveAttribute('aria-pressed', 'true');
  // Measured once the page's entrance motions have ended (a card still settling from a scale reads 43.99997 px: CI run on 45e500c3).
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
  for (const c of ['ZIG', 'USD', 'EUR', 'BTC']) { const box = (await currency.getByRole('button', {name: c, exact: true}).boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44); }
  for (const c of ['USD', 'EUR', 'BTC'] as const) {
    await pick(card, c);
    await expect(card.locator('.account-value')).toHaveText(`${c} unavailable`);
    // Session AE (ADR-027 G16, TIER 3 public-safety labels): practice money is never shown in another currency, and says why.
    await expect(card).toContainText('Practice money has no market value, so it is never shown in another currency.');
    await expect(card.locator('.account-value')).not.toContainText(/\d/);
  }
  expect((await stored(page))!.display).toBe('BTC');
  await ready(page); await openFold(page, 'Your wallet');
  await expect(card.getByRole('group', {name: 'Show the balance in'}).getByRole('button', {name: 'BTC', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('.account-value')).toHaveText('BTC unavailable');
  // The linked wallet, read-only: shortened, whole in its title, no balance and no currency switch.
  await card.getByLabel('Wallet shown on this card').selectOption('w1');
  await expect(card.locator('.account-value')).toHaveText(short(EVM)); await expect(card.locator('.account-value')).toHaveAttribute('title', EVM);
  // Assertion changed (Session AF L2b, Part 3: balances are now read and shown in Wealth; equal strength, the card still
  // shows no balance and no currency switch): the line names where the balances are, and links there.
  await expect(card).toContainText('Its balances, read-only, are in Wealth → What you have.');
  await expect(card.getByRole('link', {name: 'Wealth → What you have'})).toHaveAttribute('href', '/app/wealth#holdings');
  await expect(card.getByRole('group', {name: 'Show the balance in'})).toHaveCount(0);
  expect((await stored(page))!.selected).toBe('w1');
  await card.getByLabel('Wallet shown on this card').selectOption('app');
  await expect(card.locator('.account-value')).toHaveText('BTC unavailable');
  expect(calls).toEqual([]); // the card asks no wallet for anything
});

test('the Showcase keeps its simulated wallet: no menu, no chooser, nothing written; its line stays', async ({page}) => {
  await wallets(page);
  await page.goto('/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
  await expect(page.locator('main h1').first()).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  if (await isPhone(page)) {
    const sheet = await openStatusSheet(page);
    await expect(sheet.locator('.wallet-choices')).toContainText('The Showcase keeps its simulated wallet.');
    await expect(sheet.locator('.wallet-choices').getByRole('button')).toHaveCount(0);
    await page.keyboard.press('Escape'); await expect(sheet).toBeHidden();
  } else await expect(page.locator('.status-row .status-wallet').getByRole('button', {name: 'More wallets', exact: true})).toBeDisabled();
  await openFold(page, 'Your wallet');
  const card = page.locator('.account-panel');
  await expect(card).toContainText('Simulated balance · this browser');
  await expect(card.locator('select')).toHaveCount(0);
  // The switch changes this view only.
  await pick(card, 'USD');
  await expect(card.locator('.account-value')).toHaveText('USD unavailable');
  expect(await page.evaluate(key => [localStorage.getItem(key), sessionStorage.getItem(key), Object.keys(sessionStorage).some(k => k.includes('linked-wallets'))], LINKED_KEY)).toEqual([null, null, false]);
});
