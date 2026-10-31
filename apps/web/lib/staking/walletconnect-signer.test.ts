import {describe, expect, test, vi} from 'vitest';
import {WC_STAKING_CHAINS, WC_STAKING_METHODS, walletConnectKeplr} from './execute';
import {stakingNamespaces, readOnlyNamespaces} from '../wallets/walletconnect';

// Session AK (AFL9, A7; TIER 3 (wallet)): Keplr Mobile over WalletConnect as a KeplrSigner for the one signer path.
const ZIG = 'zig1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const PUB = btoa(String.fromCharCode(...new Uint8Array(33).fill(2))), SIG = btoa(String.fromCharCode(...new Uint8Array(64).fill(7)));
const doc = {chainId: 'zig-test-2', accountNumber: 42n, authInfoBytes: new Uint8Array([1, 2, 3]), bodyBytes: new Uint8Array([9, 8, 7])};
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
// Security review L1: only a pairing ZIGoals started for staking carries `staking: true` (set by startWalletConnect).
function live(over: {methods?: string[]; accounts?: string[]; chains?: unknown; staking?: unknown; answer?: (method: string, params: unknown) => unknown} = {}) {
  const request = vi.fn(async ({request: r}: {request: {method: string; params: unknown}}) => over.answer ? over.answer(r.method, r.params)
    : r.method === 'cosmos_getAccounts' ? [{address: ZIG, algo: 'secp256k1', pubkey: PUB}]
    : {signed: {chainId: doc.chainId, accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes)}, signature: {pub_key: {type: 'tendermint/PubKeySecp256k1', value: PUB}, signature: SIG}});
  return {request, value: {client: {request}, staking: 'staking' in over ? over.staking : true, session: {topic: 't', namespaces: {cosmos: {accounts: over.accounts ?? [`cosmos:zig-test-2:${ZIG}`], methods: over.methods ?? [...WC_STAKING_METHODS], ...('chains' in over ? {chains: over.chains} : {})}}}}};
}
describe('walletConnectKeplr', () => {
  test('null without a session, without an account on the quote\'s chain, or without the signing method', () => {
    expect(walletConnectKeplr(null, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live().value, 'zigchain-1')).toBeNull();
    expect(walletConnectKeplr(live({methods: ['cosmos_getAccounts']}).value, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live().value, 'zig-test-2')).not.toBeNull();
  });
  test('security review L1: a pairing not started for staking never signs, whatever methods the wallet says it approved; only ZIGChain\'s two chains', () => {
    for (const staking of [undefined, false, 'true', 1]) expect(walletConnectKeplr(live({staking}).value, 'zig-test-2'), String(staking)).toBeNull();
    // A read-only pairing whose wallet added cosmos_signDirect (and more) to the session: nothing.
    expect(walletConnectKeplr(live({staking: false, methods: ['cosmos_getAccounts', 'cosmos_signDirect', 'cosmos_signAmino']}).value, 'zig-test-2')).toBeNull();
    // Another Cosmos chain the wallet put in the session, even with an account and the method there: nothing.
    expect(walletConnectKeplr(live({accounts: [`cosmos:cosmoshub-4:${ZIG}`]}).value, 'cosmoshub-4')).toBeNull();
    // The session's chains, when it lists them, must include the quote's chain.
    expect(walletConnectKeplr(live({chains: ['cosmos:zigchain-1']}).value, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live({chains: 'cosmos:zig-test-2'}).value, 'zig-test-2')).toBeNull();
    expect(walletConnectKeplr(live({chains: ['cosmos:zig-test-2']}).value, 'zig-test-2')).not.toBeNull();
    expect(walletConnectKeplr(live({accounts: [`cosmos:zigchain-1:${ZIG}`]}).value, 'zigchain-1')).not.toBeNull();
    expect(stakingNamespaces(WC_STAKING_METHODS).cosmos.chains).toEqual(WC_STAKING_CHAINS.map(c => `cosmos:${c}`));
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
