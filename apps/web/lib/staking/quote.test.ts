import {toBech32} from '@cosmjs/encoding';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {NETWORK_CHANGED} from '@zigoals/chain-config/networks';
import {claim, delegate, undelegate, type StakingMessage} from './messages';
import {QUOTE_TTL_MS, QuoteRefused, quoteStaking, type QuoteChain} from './quote';
import {issueSignTicket} from './sign-gate';

// Session AF (ADR-028 H37, H74): the quote simulates, never signs.
const ME = toBech32('zig', new Uint8Array(20).fill(1)), A = toBech32('zigvaloper', new Uint8Array(20).fill(2));
const ZIG = 10n ** 18n;
/** A Keplr double that records every method asked of it; only getKey answers. */
function recordingKeplr(address = ME, extra: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const keplr = new Proxy({}, {get(_, property) {
    if (typeof property !== 'string' || property === 'then') return undefined;
    return async (...args: unknown[]) => { calls.push(property); if (property === 'getKey') return {bech32Address: address, pubKey: new Uint8Array(33).fill(2), algo: 'secp256k1', isNanoLedger: false, ...extra, chain: args[0]}; throw Error(`${property} is not allowed in a quote`); };
  }}) as never;
  return {keplr, calls};
}
const metadata = {base: 'azig', display: 'zig', denom_units: [{denom: 'azig', exponent: 0}, {denom: 'zig', exponent: 18}]};
function chain(over: Partial<QuoteChain> & {gas?: number; balance?: string; chainId?: string; version?: string} = {}) {
  const seen: {simulated?: readonly StakingMessage[]; sequence?: number; disconnected: boolean; rpc?: string} = {disconnected: false};
  const connect = async (rpc: string): Promise<QuoteChain> => { seen.rpc = rpc; return {
    getChainId: async () => over.chainId ?? 'zig-test-2',
    evidence: async () => ({version: over.version ?? 'v5.1.2', bondDenom: 'azig', unbondingSeconds: 1814400, metadata}),
    getSequence: async () => 7,
    getBalance: async () => over.balance ?? (100n * ZIG).toString(),
    simulate: async (messages, _pubKey, sequence) => { seen.simulated = messages; seen.sequence = sequence; return over.gas ?? 187701; },
    disconnect: () => { seen.disconnected = true; },
    ...over,
  }; };
  return {connect, seen};
}
afterEach(() => vi.useRealTimers());

describe('quoteStaking', () => {
  test('simulated gas × 1.3 at the chain minimum 2.5 Gazig; only getKey is asked of the wallet', async () => {
    const {keplr, calls} = recordingKeplr(), {connect, seen} = chain();
    const msgs = [delegate({delegator: ME, validator: A, amount: (25n * ZIG).toString()})];
    const quote = await quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: msgs, keplr, revision: 3}, connect);
    expect(calls).toEqual(['getKey']);
    expect(seen.rpc).toBe('https://testnet-rpc.zigchain.com');
    expect(seen.simulated).toEqual(msgs); expect(seen.sequence).toBe(7); expect(seen.disconnected).toBe(true);
    expect(quote.gasUsed).toBe(187701);
    expect(quote.gasLimit).toBe(244012); // ceil(187701 × 1.3)
    expect(quote.feeAmount).toBe((244012n * 2500000000n).toString());
    expect(quote.fee).toEqual({amount: [{denom: 'azig', amount: quote.feeAmount}], gas: '244012'});
    expect(quote.safeMax).toBe((100n * ZIG - 244012n * 2500000000n).toString());
    expect(quote.spend).toBe((25n * ZIG).toString());
    expect(quote).toMatchObject({network: 'practice', chainId: 'zig-test-2', address: ME, action: 'delegate', unbondingSeconds: 1814400, isLedger: false, version: 'v5.1.2', revision: 3});
    expect(quote.expiresAt - quote.quotedAt).toBe(QUOTE_TTL_MS);
    expect(Object.isFrozen(quote) && Object.isFrozen(quote.messages) && Object.isFrozen(quote.fee)).toBe(true);
  });
  test('the real network reads rpc.zigchain.com and needs zigchain-1 on v5.1.2', async () => {
    const {keplr} = recordingKeplr(), {connect, seen} = chain({chainId: 'zigchain-1'});
    const quote = await quoteStaking({network: 'real', address: ME, action: 'claim', messages: claim({delegator: ME, validators: [A]}), keplr, revision: 0}, connect);
    expect(seen.rpc).toBe('https://rpc.zigchain.com');
    expect(quote).toMatchObject({network: 'real', chainId: 'zigchain-1', spend: '0'});
    await expect(quoteStaking({network: 'real', address: ME, action: 'claim', messages: claim({delegator: ME, validators: [A]}), keplr, revision: 0}, chain({chainId: 'zig-test-2'}).connect)).rejects.toThrow('Wrong RPC network');
    await expect(quoteStaking({network: 'real', address: ME, action: 'claim', messages: claim({delegator: ME, validators: [A]}), keplr, revision: 0}, chain({chainId: 'zigchain-1', version: 'v5.1.0'}).connect)).rejects.toThrow(NETWORK_CHANGED);
  });
  test('a Ledger account is noted (it signs through the amino path)', async () => {
    const {keplr} = recordingKeplr(ME, {isNanoLedger: true});
    expect((await quoteStaking({network: 'practice', address: ME, action: 'undelegate', messages: [undelegate({delegator: ME, validator: A, amount: '1'})], keplr, revision: 0}, chain().connect)).isLedger).toBe(true);
  });
  test('the balance must cover the fee, plus the amount for a delegation; the message says what is available', async () => {
    const {keplr} = recordingKeplr();
    const fee = 244012n * 2500000000n;
    const delegateAll = [delegate({delegator: ME, validator: A, amount: (5n * ZIG).toString()})];
    await expect(quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: delegateAll, keplr, revision: 0}, chain({balance: (5n * ZIG).toString()}).connect)).rejects.toThrow(/Keep enough ZIG.*Available after the fee: 4\.99938997 ZIG\./);
    await expect(quoteStaking({network: 'practice', address: ME, action: 'claim', messages: claim({delegator: ME, validators: [A]}), keplr, revision: 0}, chain({balance: (fee - 1n).toString()}).connect)).rejects.toThrow(QuoteRefused);
    await expect(quoteStaking({network: 'practice', address: ME, action: 'claim', messages: claim({delegator: ME, validators: [A]}), keplr, revision: 0}, chain({balance: fee.toString()}).connect)).resolves.toMatchObject({safeMax: '0'});
  });
  test('refuses another account, a key that is not secp256k1, unusable gas, and messages that are not the signer\'s', async () => {
    const msgs = [delegate({delegator: ME, validator: A, amount: '1'})];
    await expect(quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: msgs, keplr: recordingKeplr(toBech32('zig', new Uint8Array(20).fill(8))).keplr, revision: 0}, chain().connect)).rejects.toThrow('switched accounts');
    await expect(quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: msgs, keplr: recordingKeplr(ME, {algo: 'ethsecp256k1'}).keplr, revision: 0}, chain().connect)).rejects.toThrow('cannot sign');
    for (const gas of [0, -1, 1.5, 20_000_000, Number.NaN]) await expect(quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: msgs, keplr: recordingKeplr().keplr, revision: 0}, chain({gas}).connect), String(gas)).rejects.toThrow('gas estimate');
    await expect(quoteStaking({network: 'practice', address: toBech32('zig', new Uint8Array(20).fill(8)), action: 'delegate', messages: msgs, keplr: recordingKeplr().keplr, revision: 0}, chain().connect)).rejects.toThrow('your own');
  });
  test('a quote can be ticketed only while fresh (60 s)', async () => {
    vi.useFakeTimers({now: new Date('2026-10-18T21:00:00Z')});
    const quote = await quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: [delegate({delegator: ME, validator: A, amount: '1'})], keplr: recordingKeplr().keplr, revision: 0}, chain().connect);
    vi.setSystemTime(quote.expiresAt);
    const button = {contains: () => false};
    expect(() => issueSignTicket(quote, {submit: {isTrusted: true, type: 'submit', timeStamp: 2, submitter: button}, activation: {isTrusted: true, type: 'click', timeStamp: 1, target: button}})).toThrow('no longer current');
  });
});
