import {afterEach, describe, expect, test, vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {WC_STAKING_METHODS, walletConnectKeplr, walletConnectStakingCheck, walletConnectStakingKeys} from './execute';
import {WALLETCONNECT_CHANGE, startWalletConnect, stopWalletConnect, walletConnectSession} from '../wallets/walletconnect';
import {connectStaking} from '../wallets/keplr-session';

// Session AK (AFL9 wiring; TIER 3 (wallet)): the Staking panel connects Keplr Mobile over this tab's WalletConnect staking
// pairing when the browser has no Keplr, through the read-only key reader; signing stays with walletConnectKeplr. A fake
// SignClient stands in for the relay (the relay double): nothing reaches WalletConnect or any chain.
const ZIG = toBech32('zig', new Uint8Array(20).fill(9));
const PUB = btoa(String.fromCharCode(2, ...new Uint8Array(32).fill(7))), SIG = btoa(String.fromCharCode(...new Uint8Array(64).fill(5)));
const ID = '0123456789abcdef0123456789abcdef', PAIRING = 'wc:' + 'c'.repeat(64) + '@2?relay-protocol=irn&symKey=' + 'd'.repeat(64);
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
type Request = {topic: string; chainId: string; request: {method: string; params: unknown}};

/** A fake SignClient: the pairing the app starts, the session the wallet approves, and every request asked of the wallet. */
function relayDouble() {
  const requests: Request[] = [];
  let approve!: (session: unknown) => void;
  const client = {
    connect: vi.fn(async () => ({uri: PAIRING, approval: () => new Promise(resolve => { approve = resolve; })})),
    disconnect: vi.fn(async () => undefined),
    request: vi.fn(async (args: Request) => {
      requests.push(args);
      if (args.request.method === 'cosmos_getAccounts') return [{address: ZIG, algo: 'secp256k1', pubkey: PUB}];
      const {signDoc} = args.request.params as {signDoc: Record<string, string>};
      return {signed: signDoc, signature: {pub_key: {type: 'tendermint/PubKeySecp256k1', value: PUB}, signature: SIG}};
    }),
  };
  const loader = async () => ({SignClient: {init: async () => client}});
  return {client, requests, loader, approve: (session: unknown) => approve(session)};
}
/** Pairs through startWalletConnect (staking or read-only), the wallet approving `cosmos` as the session's namespace. */
async function pair(cosmos: Record<string, unknown>, staking = true) {
  const relay = relayDouble();
  const started = await startWalletConnect({projectId: ID, origin: 'https://alpha.zigoals.app', loader: relay.loader, ...(staking ? {stakingMethods: WC_STAKING_METHODS} : {})});
  relay.approve({topic: 'session-topic', peer: {metadata: {name: 'Keplr Mobile'}}, namespaces: {cosmos}});
  await started.approval;
  return relay;
}
const both = (methods: readonly string[] = WC_STAKING_METHODS) => ({chains: ['cosmos:zigchain-1', 'cosmos:zig-test-2'], methods: [...methods], accounts: [`cosmos:zigchain-1:${ZIG}`, `cosmos:zig-test-2:${ZIG}`]});
const verified = async () => '5.1.2';
afterEach(async () => { await stopWalletConnect(); vi.unstubAllGlobals(); });

describe('walletConnectStakingCheck: why a pairing can or cannot stake (the panel\'s plain words)', () => {
  test('none, linking-only, no-chain, no-signing and ok; the same answer as the signer and the key reader', async () => {
    expect(walletConnectStakingCheck(null, 'zig-test-2')).toEqual({ok: false, reason: 'none'});
    expect(walletConnectStakingCheck(walletConnectSession(), 'zig-test-2')).toEqual({ok: false, reason: 'none'});
    const cases: [Record<string, unknown>, boolean, string, unknown][] = [
      [both(), true, 'zig-test-2', {ok: true}],
      [both(), true, 'zigchain-1', {ok: true}],
      // A read-only linking pairing, even when the wallet put the signing method in: never.
      [both(['cosmos_getAccounts', 'cosmos_signDirect', 'cosmos_signAmino']), false, 'zig-test-2', {ok: false, reason: 'linking-only'}],
      // The wallet left the testnet out (no account there, or its chains leave it out), or another chain is asked.
      [{chains: ['cosmos:zigchain-1'], methods: [...WC_STAKING_METHODS], accounts: [`cosmos:zigchain-1:${ZIG}`]}, true, 'zig-test-2', {ok: false, reason: 'no-chain'}],
      [{methods: [...WC_STAKING_METHODS], accounts: [`cosmos:zigchain-1:${ZIG}`]}, true, 'zig-test-2', {ok: false, reason: 'no-chain'}],
      [{chains: ['cosmos:zigchain-1'], methods: [...WC_STAKING_METHODS], accounts: [`cosmos:zigchain-1:${ZIG}`, `cosmos:zig-test-2:${ZIG}`]}, true, 'zig-test-2', {ok: false, reason: 'no-chain'}],
      [both(), true, 'cosmoshub-4', {ok: false, reason: 'no-chain'}],
      // The wallet approved the account read only (or another chain's method name): no signing.
      [both(['cosmos_getAccounts']), true, 'zig-test-2', {ok: false, reason: 'no-signing'}],
      [both(['cosmos_getAccounts', 'cosmos_signAmino']), true, 'zigchain-1', {ok: false, reason: 'no-signing'}],
    ];
    for (const [cosmos, staking, chainId, expected] of cases) {
      await pair(cosmos, staking);
      const live = walletConnectSession(), label = JSON.stringify([cosmos, staking, chainId]);
      expect(walletConnectStakingCheck(live, chainId), label).toEqual(expected);
      const ok = (expected as {ok: boolean}).ok;
      expect(walletConnectKeplr(live, chainId) !== null, label).toBe(ok);
      expect(walletConnectStakingKeys(live, chainId) !== null, label).toBe(ok);
    }
  });
});

describe('Keplr Mobile connects over the staking pairing, read-only, and signs only through walletConnectKeplr', () => {
  test('connectStaking through the key reader: the practice session, the account read only, nothing signed', async () => {
    const relay = await pair(both());
    const keys = walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')!;
    const verify = vi.fn(verified);
    const session = await connectStaking('practice', keys, verify);
    expect(verify).toHaveBeenCalledWith('practice');
    expect(session).toMatchObject({version: 1, network: 'practice', chainId: 'zig-test-2', address: ZIG, isLedger: false});
    expect(relay.requests.map(r => [r.topic, r.chainId, r.request.method])).toEqual([['session-topic', 'cosmos:zig-test-2', 'cosmos_getAccounts']]);
    // The shape quoteStaking checks before a review (a 33-byte secp256k1 public key, not a Ledger).
    const key = await keys.getKey('zig-test-2');
    expect(key.bech32Address).toBe(ZIG); expect(key.pubKey).toBeInstanceOf(Uint8Array); expect(key.pubKey).toHaveLength(33);
    expect(key.algo).toBe('secp256k1'); expect(key.isNanoLedger).toBe(false);
    // The reader holds no signer: nothing of it reaches a signing method.
    expect(Object.keys(keys).sort()).toEqual(['enable', 'experimentalSuggestChain', 'getKey']);
    expect(relay.requests.every(r => r.request.method === 'cosmos_getAccounts')).toBe(true);
  });
  test('the reader refuses another network and has no chain to suggest', async () => {
    await pair(both());
    const keys = walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')!;
    await expect(keys.enable('zigchain-1')).rejects.toThrow(/not paired for this network/);
    await expect(keys.experimentalSuggestChain()).rejects.toThrow(/not paired for this network/);
    await expect(keys.getKey('zigchain-1')).rejects.toThrow(/Wrong network/);
    // Connecting the real network with the practice reader stops before any wallet request.
    await expect(connectStaking('real', keys, verified)).rejects.toThrow(/not paired for this network/);
  });
  test('a wallet that shares no ZIGChain account connects nothing', async () => {
    const relay = await pair(both());
    relay.client.request.mockImplementationOnce(async () => []);
    await expect(connectStaking('practice', walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')!, verified)).rejects.toThrow(/shared no ZIGChain account/);
  });
  test('the same pairing then signs exactly one reviewed document through walletConnectKeplr (the review sheet\'s signer)', async () => {
    const relay = await pair(both());
    await connectStaking('practice', walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')!, verified);
    const signer = await walletConnectKeplr(walletConnectSession(), 'zig-test-2')!.getOfflineSignerAuto('zig-test-2', {preferNoSetFee: true}) as unknown as {signDirect: (a: string, d: unknown) => Promise<{signature: {signature: string}}>};
    const doc = {chainId: 'zig-test-2', accountNumber: 42n, authInfoBytes: new Uint8Array([1, 2]), bodyBytes: new Uint8Array([3, 4])};
    expect((await signer.signDirect(ZIG, doc)).signature.signature).toBe(SIG);
    const signs = relay.requests.filter(r => r.request.method !== 'cosmos_getAccounts');
    expect(signs).toHaveLength(1);
    expect(signs[0]).toEqual({topic: 'session-topic', chainId: 'cosmos:zig-test-2', request: {method: 'cosmos_signDirect', params: {signerAddress: ZIG, signDoc: {chainId: 'zig-test-2', accountNumber: '42', authInfoBytes: b64(doc.authInfoBytes), bodyBytes: b64(doc.bodyBytes)}}}});
  });
  test('when the pairing ends (Remove, a new pairing, an account change) the reader is gone', async () => {
    await pair(both());
    expect(walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')).not.toBeNull();
    await stopWalletConnect();
    expect(walletConnectStakingKeys(walletConnectSession(), 'zig-test-2')).toBeNull();
    expect(walletConnectStakingCheck(walletConnectSession(), 'zig-test-2')).toEqual({ok: false, reason: 'none'});
  });
});

describe('WALLETCONNECT_CHANGE', () => {
  test('fires when a session is approved and when it ends, carrying nothing', async () => {
    const target = new EventTarget(), seen: Event[] = [];
    vi.stubGlobal('window', target);
    target.addEventListener(WALLETCONNECT_CHANGE, event => { seen.push(event); });
    await pair(both());
    expect(seen).toHaveLength(1);
    await stopWalletConnect();
    expect(seen).toHaveLength(2);
    await stopWalletConnect(); // nothing to end: no event
    expect(seen).toHaveLength(2);
    expect(seen.every(e => e.constructor === Event)).toBe(true);
  });
});
