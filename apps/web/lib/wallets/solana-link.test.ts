import {describe, expect, test, vi} from 'vitest';
import {MAX_SOLANA_WALLETS, SOLANA_LINK_ERROR, discoverSolanaWallets, forgetSolanaConnection, readSolanaAddress, standardWallet} from './solana-link';
import {isSolanaAddress} from '../wallet-address';

// Session AF (L2b, ADR-028 H40): the Wallet Standard handshake with fake wallets only (no extension, no network). Public
// Solana program and mint addresses stand in for accounts.
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', SYSTEM = '11111111111111111111111111111111', TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ICON = 'data:image/svg+xml;base64,PHN2Zy8+';
function fakeWallet(name: string, {chains = ['solana:mainnet', 'solana:devnet'], accounts = [{address: USDC_MINT}], calls = [] as string[]} = {}) {
  return {version: '1.0.0', name, icon: ICON, chains, accounts: [], features: {
    'standard:connect': {version: '1.0.0', connect: vi.fn(async () => { calls.push(`${name}.connect`); return {accounts}; })},
    'standard:disconnect': {version: '1.0.0', disconnect: vi.fn(async () => { calls.push(`${name}.disconnect`); })},
    'solana:signMessage': {version: '1.0.0', signMessage: vi.fn(async () => { calls.push(`${name}.SIGNED`); })},
  }};
}

describe('Solana addresses (shape only)', () => {
  test('32 bytes of base58; anything else is refused', () => {
    for (const ok of [USDC_MINT, SYSTEM, TOKEN]) expect(isSolanaAddress(ok), ok).toBe(true);
    for (const bad of ['', '1111111111111111111111111111111', `${USDC_MINT}1`, USDC_MINT.replace('E', '0'), USDC_MINT.replace('E', 'O'), USDC_MINT.replace('p', 'l'), '0x52908400098527886E0F7030069857D2E4169EE7', 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', 'zz'.repeat(30)]) expect(isSolanaAddress(bad), bad).toBe(false);
    // 31 or 33 bytes encode to lengths a 32-byte key can have too: the byte count decides, not the length.
    expect(isSolanaAddress('z'.repeat(44))).toBe(false); expect(isSolanaAddress('z'.repeat(43))).toBe(true);
  });
});

describe('the two-event handshake', () => {
  test('a wallet that loaded first registers through app-ready; one that loads later through register-wallet; non-mainnet and connect-less wallets are left out', () => {
    const target = new EventTarget(), seen: string[][] = [];
    // Loaded first: it listens for app-ready (as wallets do) and registers through the detail it receives.
    target.addEventListener('wallet-standard:app-ready', event => (event as CustomEvent).detail.register(fakeWallet('Early'), fakeWallet('Devnet only', {chains: ['solana:devnet']}), {name: 'No connect', chains: ['solana:mainnet'], features: {}}));
    const stop = discoverSolanaWallets(wallets => seen.push(wallets.map(w => w.name)), target as unknown as Window);
    // Loads later: it dispatches register-wallet with a callback the app calls with {register}.
    target.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {detail: ({register}: {register: (...w: unknown[]) => void}) => register(fakeWallet('Late'), fakeWallet('Early'))}));
    expect(seen).toEqual([['Early'], ['Early', 'Late']]);
    stop();
    target.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {detail: ({register}: {register: (...w: unknown[]) => void}) => register(fakeWallet('After stop'))}));
    expect(seen.at(-1)).toEqual(['Early', 'Late']);
  });
  test('a wallet whose callback or properties throw is left out; at most 8; names are plain text; icons only as data: images', () => {
    const target = new EventTarget(), seen: {name: string; icon: string | null; key: string}[][] = [];
    discoverSolanaWallets(wallets => seen.push(wallets.map(({name, icon, key}) => ({name, icon, key}))), target as unknown as Window);
    target.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {detail: () => { throw Error('broken wallet'); }}));
    const trap = new Proxy({}, {get() { throw Error('trap'); }});
    expect(standardWallet(trap)).toBeNull();
    target.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {detail: ({register}: {register: (...w: unknown[]) => void}) => register(trap, {...fakeWallet('‮Right​  to  left'), icon: 'https://example.invalid/i.png'}, ...Array.from({length: 12}, (_, i) => fakeWallet(`W${i}`)))}));
    const last = seen.at(-1)!;
    expect(last).toHaveLength(MAX_SOLANA_WALLETS);
    expect(last[0]).toEqual({name: 'Right to left', icon: null, key: 'solana:right-to-left'});
    expect(last[1]!.icon).toBe(ICON);
  });
});

describe('reading the address: standard:connect only', () => {
  test('the first account, checked; nothing else is called', async () => {
    const calls: string[] = [];
    const wallet = standardWallet(fakeWallet('Fake', {calls}))!;
    expect(await readSolanaAddress(wallet)).toBe(USDC_MINT);
    expect(calls).toEqual(['Fake.connect']);
    for (const accounts of [[], [{address: '0xabc'}], [{}], 'nope']) await expect(readSolanaAddress(standardWallet(fakeWallet('Bad', {accounts: accounts as never}))!)).rejects.toThrow(SOLANA_LINK_ERROR);
  });
  test('Remove asks the wallet to forget this site, best effort, never throwing', async () => {
    const calls: string[] = [];
    const wallet = standardWallet(fakeWallet('Fake', {calls}))!;
    forgetSolanaConnection(wallet); forgetSolanaConnection(undefined);
    forgetSolanaConnection({disconnect: () => Promise.reject(Error('closed'))});
    forgetSolanaConnection({disconnect: () => { throw Error('sync'); }});
    await Promise.resolve();
    expect(calls).toEqual(['Fake.disconnect']);
  });
});
