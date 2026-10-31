import {describe, expect, test, vi} from 'vitest';
import {WC_STAKING_METHODS, walletConnectKeplr} from './execute';
import {stakingNamespaces, readOnlyNamespaces} from '../wallets/walletconnect';

// Session AK (AFL9, A7; TIER 3 (wallet)): Keplr Mobile over WalletConnect as a KeplrSigner for the one signer path.
const ZIG = 'zig1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const PUB = btoa(String.fromCharCode(...new Uint8Array(33).fill(2))), SIG = btoa(String.fromCharCode(...new Uint8Array(64).fill(7)));
const doc = {chainId: 'zig-test-2', accountNumber: 42n, authInfoBytes: new Uint8Array([1, 2, 3]), bodyBytes: new Uint8Array([9, 8, 7])};
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
function live(over: {methods?: string[]; accounts?: string[]; answer?: (method: string, params: unknown) => unknown} = {}) {
  const request = vi.fn(async ({request: r}: {request: {method: string; params: unknown}}) => over.answer ? over.answer(r.method, r.params)
    : r.method === 'cosmos_getAccounts' ? [{address: ZIG, algo: 'secp256k1', pubkey: PUB}]
    : {signed: {chainId: doc.chainId, accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes)}, signature: {pub_key: {type: 'tendermint/PubKeySecp256k1', value: PUB}, signature: SIG}});
  return {request, value: {client: {request}, session: {topic: 't', namespaces: {cosmos: {accounts: over.accounts ?? [`cosmos:zig-test-2:${ZIG}`], methods: over.methods ?? [...WC_STAKING_METHODS]}}}}};
}
describe('walletConnectKeplr', () => {
  test('null without a session, without an account on the quote\'s chain, or without the signing method', () => {
    expect(walletConnectKeplr(null, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live().value, 'zigchain-1')).toBeNull();
    expect(walletConnectKeplr(live({methods: ['cosmos_getAccounts']}).value, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live().value, 'zig-test-2')).not.toBeNull();
  });
  test('the key and the account come from the wallet; the document sent is exactly the reviewed one; the answer keeps it', async () => {
    const l = live(), keplr = walletConnectKeplr(l.value, 'zig-test-2')!;
    expect((await keplr.getKey('zig-test-2')).bech32Address).toBe(ZIG);
    const signer = await keplr.getOfflineSignerAuto('zig-test-2', {preferNoSetFee: true}) as unknown as {getAccounts: () => Promise<{address: string; pubkey: Uint8Array}[]>; signDirect: (a: string, d: typeof doc) => Promise<{signed: typeof doc; signature: {signature: string}}>};
    expect((await signer.getAccounts())[0]!.pubkey).toHaveLength(33);
    const out = await signer.signDirect(ZIG, doc);
    expect(out.signed).toBe(doc); expect(out.signature.signature).toBe(SIG);
    const sent = l.request.mock.calls.at(-1)![0] as unknown as {chainId: string; request: {method: string; params: {signDoc: Record<string, string>}}};
    expect(sent.chainId).toBe('cosmos:zig-test-2'); expect(sent.request.method).toBe('cosmos_signDirect');
    expect(sent.request.params.signDoc).toEqual({chainId: 'zig-test-2', accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes)});
  });
  test('a wallet that changes any part of the document (fee, body, account, chain) is refused before a broadcast', async () => {
    for (const change of [{authInfoBytes: b64(new Uint8Array([1, 2, 4]))}, {bodyBytes: b64(new Uint8Array([0]))}, {accountNumber: '43'}, {chainId: 'zigchain-1'}]) {
      const l = live({answer: (method) => method === 'cosmos_getAccounts' ? [{address: ZIG, algo: 'secp256k1', pubkey: PUB}] : {signed: {chainId: doc.chainId, accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes), ...change}, signature: {pub_key: {value: PUB}, signature: SIG}}});
      const signer = await walletConnectKeplr(l.value, 'zig-test-2')!.getOfflineSignerAuto('zig-test-2') as unknown as {signDirect: (a: string, d: typeof doc) => Promise<unknown>};
      await expect(signer.signDirect(ZIG, doc), JSON.stringify(change)).rejects.toThrow(/changed what it was asked to sign/);
    }
    const bad = live({answer: (method) => method === 'cosmos_getAccounts' ? [{address: ZIG, algo: 'secp256k1', pubkey: PUB}] : {signed: {chainId: doc.chainId, accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes)}, signature: {pub_key: {value: PUB}, signature: 'short'}}});
    const signer = await walletConnectKeplr(bad.value, 'zig-test-2')!.getOfflineSignerAuto('zig-test-2') as unknown as {signDirect: (a: string, d: typeof doc) => Promise<unknown>};
    await expect(signer.signDirect(ZIG, doc)).rejects.toThrow(/does not read/);
  });
  test('a staking pairing asks ZIGChain (mainnet and testnet, optional) for exactly the two methods; read-only pairing is unchanged', () => {
    expect(stakingNamespaces(WC_STAKING_METHODS).cosmos).toEqual({chains: ['cosmos:zigchain-1', 'cosmos:zig-test-2'], methods: ['cosmos_getAccounts', 'cosmos_signDirect'], events: []});
    expect(stakingNamespaces(WC_STAKING_METHODS).eip155.methods).toEqual([]);
    expect(() => stakingNamespaces(['cosmos_getAccounts'])).toThrow(); expect(() => stakingNamespaces(['cosmos_getAccounts', 'eth_sign'])).toThrow();
    expect(readOnlyNamespaces().cosmos.methods).toEqual(['cosmos_getAccounts']);
  });
});
