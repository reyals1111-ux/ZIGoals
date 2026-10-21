import {describe, expect, test} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {BUY_ASSETS, NETWORKS} from './assets';
import {NetworkMismatch, checkedAddress, destinationsFor} from './guard';
import {handOffUrl, readReturn, returnUrl} from './urls';
import {PUBLIC_INTEGRATIONS, type PublicIntegrations} from '../public-integrations';
import type {LinkedWallet} from '../linked-wallets';

// Session AF (L2b, Part 4, ADR-028 H18, H22, H83; A2.4, A2.6, A2.10, P4.1, P4.2): the hand-off builders with the sandbox
// hosts (built, never opened or submitted) and the network-mismatch guard. Fictional addresses only.
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', BTC = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const ZIG = toBech32('zig', new Uint8Array(20).fill(9)), HUB = toBech32('cosmos', new Uint8Array(20).fill(9));
const ORIGIN = 'https://alpha.zigoals.app', AT = '2026-10-19T08:00:00.000Z';
const SANDBOX: PublicIntegrations = {schemaVersion: 1, reownProjectId: null, rampHostApiKey: 'demoHostKey_123', rampHostAppName: 'ZIGoals', banxaPartnerRef: 'zigoals'};
const W = (id: string, kind: LinkedWallet['kind'], address: string, extra: Partial<LinkedWallet> = {}): LinkedWallet => ({id, kind, wallet: 'test', label: id, address, addedAt: AT, ...extra});
const wallets = [W('w-evm', 'evm', EVM), W('w-base-only', 'evm', '0x0000000000000000000000000000000000000001', {chains: ['eip155:8453']}), W('w-sol', 'solana', SOL), W('w-btc', 'btc', BTC), W('w-zig', 'cosmos', ZIG)];
const addressFor = (network: keyof typeof NETWORKS) => destinationsFor(network, wallets)[0]!;

describe('the network-mismatch guard', () => {
  test('only a linked wallet of the matching network is offered; a Cosmos Hub purchase gets the zig1 key\'s cosmos1 twin', () => {
    expect(destinationsFor('solana', wallets).map(d => [d.walletId, d.address])).toEqual([['w-sol', SOL]]);
    expect(destinationsFor('bitcoin', wallets).map(d => d.walletId)).toEqual(['w-btc']);
    expect(destinationsFor('ethereum', wallets).map(d => d.walletId)).toEqual(['w-evm']);
    expect(destinationsFor('base', wallets).map(d => d.walletId)).toEqual(['w-evm', 'w-base-only']);
    expect(destinationsFor('cosmos-hub', wallets).map(d => [d.walletId, d.address])).toEqual([['w-zig', HUB]]);
    expect(destinationsFor('solana', [W('w-evm', 'evm', EVM)])).toEqual([]);
  });
  test('no EVM address for Solana, no bc1 for an EVM network, no zig1 anywhere, no free text', () => {
    expect(() => checkedAddress('solana', EVM)).toThrow(NetworkMismatch);
    expect(() => checkedAddress('base', BTC)).toThrow(NetworkMismatch);
    expect(() => checkedAddress('ethereum', SOL)).toThrow(NetworkMismatch);
    expect(() => checkedAddress('bitcoin', EVM)).toThrow(NetworkMismatch);
    for (const network of Object.keys(NETWORKS) as (keyof typeof NETWORKS)[]) expect(() => checkedAddress(network, ZIG), network).toThrow(/ZIGChain address/);
    expect(() => checkedAddress('cosmos-hub', 'cosmos1 not an address')).toThrow(NetworkMismatch);
    expect(() => checkedAddress('cosmos-hub', toBech32('osmo', new Uint8Array(20).fill(9)))).toThrow(NetworkMismatch);
    for (const asset of BUY_ASSETS) for (const o of asset.offers) for (const provider of ['ramp', 'banxa'] as const)
      for (const wrong of [ZIG, ...[EVM, SOL, BTC, HUB].filter(a => a !== addressFor(o.network).address)])
        expect(() => handOffUrl({provider, asset: asset.id, network: o.network, address: wrong, walletId: 'w', origin: ORIGIN, currency: 'EUR', config: SANDBOX, environment: 'sandbox'}), `${asset.id} ${o.network} ${wrong}`).toThrow(NetworkMismatch);
  });
});

describe('the hand-off addresses (sandbox hosts; built, never opened)', () => {
  test('Ramp hosted mode, every asset × network: public parameters only, the return page without the address', () => {
    for (const asset of BUY_ASSETS) for (const o of asset.offers) {
      const d = addressFor(o.network), r = handOffUrl({provider: 'ramp', asset: asset.id, network: o.network, address: d.address, walletId: d.walletId, origin: ORIGIN, currency: 'EUR', config: SANDBOX, environment: 'sandbox'});
      const url = new URL(r.url);
      expect(r.prefilled).toBe(true);
      expect(url.origin).toBe('https://app.demo.rampnetwork.com');
      // Ramp's current names (ONRAMP_CODES.md); the deprecated swapAsset/defaultAsset/fiatCurrency are never sent.
      expect([...url.searchParams.keys()]).toEqual(['hostApiKey', 'hostAppName', 'hostLogoUrl', 'enabledCryptoAssets', 'outAsset', 'userAddress', 'finalUrl']);
      expect(url.searchParams.get('enabledCryptoAssets')).toBe(o.ramp!.value); expect(url.searchParams.get('outAsset')).toBe(o.ramp!.value);
      for (const old of ['swapAsset', 'defaultAsset', 'fiatCurrency', 'fiatValue', 'swapAmount']) expect(url.searchParams.has(old), old).toBe(false);
      expect(url.searchParams.get('userAddress')).toBe(d.address);
      expect(url.searchParams.get('hostLogoUrl')).toBe(`${ORIGIN}/apple-touch-icon.png`);
      const back = new URL(url.searchParams.get('finalUrl')!);
      expect(back.origin + back.pathname).toBe(`${ORIGIN}/app/wealth/add-money/back`);
      expect(Object.fromEntries(back.searchParams)).toEqual({provider: 'ramp', asset: asset.id, network: o.network, wallet: d.walletId});
      expect(back.toString()).not.toContain(d.address);
    }
    const one = handOffUrl({provider: 'ramp', asset: 'usdc', network: 'base', address: EVM, walletId: 'w-evm', origin: ORIGIN, currency: 'EUR', config: SANDBOX, environment: 'sandbox'});
    expect(one.url).toBe(`https://app.demo.rampnetwork.com/?hostApiKey=demoHostKey_123&hostAppName=ZIGoals&hostLogoUrl=${encodeURIComponent(`${ORIGIN}/apple-touch-icon.png`)}&enabledCryptoAssets=BASE_USDC&outAsset=BASE_USDC&userAddress=${EVM}&finalUrl=${encodeURIComponent(`${ORIGIN}/app/wealth/add-money/back?provider=ramp&asset=usdc&network=base&wallet=w-evm`)}`);
  });
  test('Banxa referral, every asset × network: coinType, blockchain, walletAddress, fiatType, returnUrl on the partner\'s sandbox page', () => {
    for (const asset of BUY_ASSETS) for (const o of asset.offers) {
      const d = addressFor(o.network), r = handOffUrl({provider: 'banxa', asset: asset.id, network: o.network, address: d.address, walletId: d.walletId, origin: ORIGIN, currency: 'USD', config: SANDBOX, environment: 'sandbox'});
      const url = new URL(r.url);
      expect(url.origin).toBe('https://zigoals.banxa-sandbox.com');
      expect(Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'returnUrl'))).toEqual({coinType: o.banxa!.coinType.value, blockchain: o.banxa!.blockchain.value, walletAddress: d.address, fiatType: 'USD'});
      expect(url.searchParams.get('returnUrl')).toBe(returnUrl({provider: 'banxa', asset: asset.id, network: o.network, walletId: d.walletId, origin: ORIGIN}));
    }
    expect(handOffUrl({provider: 'banxa', asset: 'zig-via-atom', network: 'cosmos-hub', address: HUB, walletId: 'w-zig', origin: ORIGIN, currency: 'EUR', config: SANDBOX, environment: 'sandbox'}).url)
      .toBe(`https://zigoals.banxa-sandbox.com/?coinType=ATOM&blockchain=ATOM&walletAddress=${HUB}&fiatType=EUR&returnUrl=${encodeURIComponent(`${ORIGIN}/app/wealth/add-money/back?provider=banxa&asset=zig-via-atom&network=cosmos-hub&wallet=w-zig`)}`);
  });
  test('P4.2: with the committed (empty) IDs each provider links its plain consumer site, nothing pre-filled; production hosts otherwise', () => {
    expect(PUBLIC_INTEGRATIONS.rampHostApiKey).toBeNull(); expect(PUBLIC_INTEGRATIONS.banxaPartnerRef).toBeNull();
    expect(handOffUrl({provider: 'ramp', asset: 'usdc', network: 'base', address: EVM, walletId: 'w', origin: ORIGIN, currency: 'EUR'})).toEqual({provider: 'ramp', url: 'https://rampnetwork.com/', prefilled: false});
    expect(handOffUrl({provider: 'banxa', asset: 'btc', network: 'bitcoin', address: BTC, walletId: 'w', origin: ORIGIN, currency: 'EUR'})).toEqual({provider: 'banxa', url: 'https://banxa.com/', prefilled: false});
    expect(new URL(handOffUrl({provider: 'ramp', asset: 'usdc', network: 'base', address: EVM, walletId: 'w', origin: ORIGIN, currency: 'EUR', config: SANDBOX}).url).origin).toBe('https://app.rampnetwork.com');
    expect(new URL(handOffUrl({provider: 'banxa', asset: 'usdc', network: 'base', address: EVM, walletId: 'w', origin: ORIGIN, currency: 'EUR', config: SANDBOX}).url).origin).toBe('https://zigoals.banxa.com');
  });
  test('refusals: an asset not on that network, a foreign origin, a wallet id that is not one', () => {
    expect(() => handOffUrl({provider: 'ramp', asset: 'sol', network: 'base', address: EVM, walletId: 'w', origin: ORIGIN, currency: 'EUR', config: SANDBOX})).toThrow(/not offered/);
    expect(() => handOffUrl({provider: 'ramp', asset: 'usdc', network: 'base', address: EVM, walletId: 'w', origin: 'http://evil.example', currency: 'EUR', config: SANDBOX})).toThrow();
    expect(() => handOffUrl({provider: 'ramp', asset: 'usdc', network: 'base', address: EVM, walletId: '../x', origin: ORIGIN, currency: 'EUR', config: SANDBOX})).toThrow();
  });
});

describe('the return page reads only its four known values', () => {
  test('valid, then every malformed or unknown variant refused', () => {
    expect(readReturn('?provider=ramp&asset=usdc&network=base&wallet=w-evm')).toEqual({provider: 'ramp', asset: 'usdc', network: 'base', walletId: 'w-evm'});
    for (const bad of ['', '?provider=moonpay&asset=usdc&network=base&wallet=w', '?provider=ramp&asset=doge&network=base&wallet=w', '?provider=ramp&asset=sol&network=base&wallet=w', '?provider=ramp&asset=usdc&network=toString&wallet=w', '?provider=ramp&asset=usdc&network=base&wallet=%3Cscript%3E'])
      expect(readReturn(bad), bad).toBeNull();
  });
});
