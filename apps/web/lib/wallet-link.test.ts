import {describe, expect, test, vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {TESTNET, keplrChainInfo} from '@zigoals/chain-config';
import {COSMOS_LINK_ERROR, EVM_LINK_ERROR, EVM_SUGGESTIONS, KEPLR_SITE, MAX_EVM_WALLETS, MAX_WALLET_ICON, announcedWallet, discoverEvmWallets, forgetKeplrPermission, readCosmosAddress, readEvmAddress, safeWalletIcon, walletName} from './wallet-link';

// Session AE (Part 6, ADR-027): reading an address from another wallet, for display only. Test doubles record every call.
const ZIG = toBech32('zig', new Uint8Array(20).fill(9));
const cosmos = (key: unknown) => {
  const calls: unknown[][] = [];
  const provider = {experimentalSuggestChain: async (info: unknown) => { calls.push(['suggest', info]); }, enable: async (chain: string) => { calls.push(['enable', chain]); }, getKey: async (chain: string) => { calls.push(['getKey', chain]); return key; }};
  return {calls, provider};
};
const evm = (accounts: unknown) => { const calls: unknown[] = []; return {calls, provider: {request: async (args: unknown) => { calls.push(args); return accounts; }}}; };
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('Cosmos wallets: Keplr\'s reviewed calls, the address alone', () => {
  test('suggest the reviewed chain, enable it, read bech32Address and nothing else', async () => {
    const touched: string[] = [];
    const key = new Proxy({bech32Address: ZIG, pubKey: new Uint8Array(33), name: 'Fictional'}, {get(target, property) { touched.push(String(property)); return Reflect.get(target, property); }});
    const {calls, provider} = cosmos(key);
    await expect(readCosmosAddress(provider)).resolves.toBe(ZIG);
    expect(calls).toEqual([['suggest', keplrChainInfo()], ['enable', TESTNET.chainId], ['getKey', TESTNET.chainId]]);
    expect(touched.filter(p => p !== 'then')).toEqual(['bech32Address']);
  });
  test('another chain\'s address, a malformed one or no key is refused', async () => {
    for (const key of [{bech32Address: toBech32('cosmos', new Uint8Array(20).fill(9))}, {bech32Address: 'zig1nope'}, {}, null, 'zig']) await expect(readCosmosAddress(cosmos(key).provider)).rejects.toThrow(COSMOS_LINK_ERROR);
  });
  test('a refusal in the wallet stops the flow where it happened', async () => {
    const calls: string[] = [];
    const provider = {experimentalSuggestChain: async () => { calls.push('suggest'); }, enable: async () => { calls.push('enable'); throw Error('Request rejected'); }, getKey: async () => { calls.push('getKey'); return {bech32Address: ZIG}; }};
    await expect(readCosmosAddress(provider)).rejects.toThrow('Request rejected');
    expect(calls).toEqual(['suggest', 'enable']);
  });
});

describe('EVM wallets through EIP-6963', () => {
  test('an announcement is checked: name as text trimmed to 40, rdns, uuid, a callable provider; an icon only as a small data: image', () => {
    const {provider} = evm([]);
    expect(announcedWallet({info: {uuid: 'u1', rdns: 'IO.Example', name: '  Fictional   Wallet  ', icon: PNG}, provider})).toEqual({uuid: 'u1', rdns: 'io.example', name: 'Fictional Wallet', icon: PNG, provider});
    expect(walletName('x'.repeat(60))).toHaveLength(40); expect(walletName('<b>Bold</b>')).toBe('<b>Bold</b>'); // shown as text, never as markup
    for (const icon of ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/webp;base64,UklGRg==', 'data:image/jpeg;base64,/9j/', 'data:image/svg+xml,%3Csvg/%3E']) expect(safeWalletIcon(icon), icon).toBe(icon);
    for (const icon of ['https://example.invalid/icon.png', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/gif;base64,R0lGOD', ` ${PNG}`, `data:image/png;base64,${'A'.repeat(MAX_WALLET_ICON)}`, 42, null]) expect(safeWalletIcon(icon), String(icon).slice(0, 40)).toBeNull();
    expect(announcedWallet({info: {uuid: 'u2', rdns: 'io.example', name: 'X', icon: 'https://example.invalid/i.png'}, provider})?.icon).toBeNull();
    for (const bad of [null, {}, {info: {uuid: 'u', rdns: 'io.x', name: 'X'}}, {info: {uuid: 'u', rdns: 'io.x', name: 'X'}, provider: {}}, {info: {uuid: '', rdns: 'io.x', name: 'X'}, provider}, {info: {uuid: 'u', rdns: 'not a domain', name: 'X'}, provider}, {info: {uuid: 'u', rdns: 'io.x', name: '   '}, provider}]) expect(announcedWallet(bad)).toBeNull();
  });
  test('discovery asks once, keeps one wallet per uuid and per rdns, at most 8, and stops listening', () => {
    const target = new EventTarget();
    const requests = vi.fn();
    target.addEventListener('eip6963:requestProvider', requests);
    const seen: string[][] = [];
    const announce = (uuid: string, rdns: string) => target.dispatchEvent(Object.assign(new Event('eip6963:announceProvider'), {detail: {info: {uuid, rdns, name: rdns, icon: PNG}, provider: evm([]).provider}}));
    const stop = discoverEvmWallets(list => seen.push(list.map(w => w.uuid)), target as unknown as Window);
    expect(requests).toHaveBeenCalledTimes(1);
    announce('a', 'io.a'); announce('a', 'io.other'); announce('b', 'io.a'); announce('c', 'io.c');
    expect(seen.at(-1)).toEqual(['a', 'c']);
    for (let i = 0; i < 20; i++) announce(`m${i}`, `io.m${i}`);
    expect(seen.at(-1)).toHaveLength(MAX_EVM_WALLETS);
    stop(); const count = seen.length; announce('late', 'io.late'); expect(seen).toHaveLength(count);
  });
  test('only eth_requestAccounts is asked; the first account must be 0x and 40 hex digits', async () => {
    const good = evm(['0x52908400098527886E0F7030069857D2E4169EE7', '0x0000000000000000000000000000000000000001']);
    await expect(readEvmAddress(good)).resolves.toBe('0x52908400098527886E0F7030069857D2E4169EE7');
    expect(good.calls).toEqual([{method: 'eth_requestAccounts'}]);
    for (const accounts of [[], ['0x1234'], 'zig', null, [42]]) await expect(readEvmAddress(evm(accounts))).rejects.toThrow(EVM_LINK_ERROR);
  });
});

describe('Disconnect and the official sites', () => {
  test('Keplr\'s disable is called with the testnet id when offered; nothing throws or waits', async () => {
    const disable = vi.fn(async () => { throw Error('no'); });
    expect(() => forgetKeplrPermission({disable})).not.toThrow();
    expect(disable).toHaveBeenCalledWith(TESTNET.chainId);
    const never = vi.fn(() => new Promise(() => {}));
    expect(forgetKeplrPermission({disable: never})).toBeUndefined();
    for (const keplr of [undefined, null, {}, {disable: 'x'}, {get disable() { throw Error('trap'); }}]) expect(() => forgetKeplrPermission(keplr)).not.toThrow();
  });
  test('install links are the official https sites; Leap and Cosmostation have none', () => {
    expect(KEPLR_SITE).toBe('https://www.keplr.app/');
    expect(EVM_SUGGESTIONS.map(s => s.href)).toEqual(['https://metamask.io/', 'https://rabby.io/', 'https://www.coinbase.com/wallet']);
    expect(JSON.stringify(EVM_SUGGESTIONS) + KEPLR_SITE).not.toMatch(/leap|cosmostation/i);
  });
});
