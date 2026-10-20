import {toBech32} from '@cosmjs/encoding';
import {Registry} from '@cosmjs/proto-signing';
import {defaultRegistryTypes} from '@cosmjs/stargate';
import {TxBody, TxRaw} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {STAKING_JOURNAL, stakingEntriesOf} from './journal';
import {attest, claim, delegate, revoke, type StakingMessage} from './messages';
import {STAKING_PREFS} from './prefs';
import type {QuoteChain} from './quote';
import {txHash, type ChainTx} from './receipt';
import type {SigningChain} from './execute';

// Session AF (ADR-028 H4, H46, H61): the one signer path, end to end with doubles: no real wallet, no network.
const ME = toBech32('zig', new Uint8Array(20).fill(1)), A = toBech32('zigvaloper', new Uint8Array(20).fill(2)), B = toBech32('zigvaloper', new Uint8Array(20).fill(3));
const registry = new Registry(defaultRegistryTypes);
const txOf = (messages: readonly StakingMessage[]) => TxRaw.encode(TxRaw.fromPartial({bodyBytes: TxBody.encode(TxBody.fromPartial({messages: messages.map(m => registry.encodeAsAny(m)), memo: ''})).finish(), authInfoBytes: new Uint8Array([9]), signatures: [new Uint8Array(64)]})).finish();
class Memory { map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null; } setItem(k: string, v: string) { this.map.set(k, v); } }
const button = {contains: () => false}, press = {submit: {isTrusted: true, type: 'submit', timeStamp: 2, submitter: button}, activation: {isTrusted: true, type: 'click', timeStamp: 1, target: button}};
const metadata = {base: 'azig', display: 'zig', denom_units: [{denom: 'azig', exponent: 0}, {denom: 'zig', exponent: 18}]};
const quoteChain = (chainId: string) => async (): Promise<QuoteChain> => ({getChainId: async () => chainId, evidence: async () => ({version: 'v5.1.2', bondDenom: 'azig', unbondingSeconds: 1814400, metadata}), getSequence: async () => 1, getBalance: async () => '100000000000000000000', simulate: async () => 100000, disconnect: () => undefined});
/** Keplr double: records every call; the signer it hands out records its own. */
function keplrDouble(address = ME) {
  const calls: string[] = [];
  const signer = {getAccounts: async () => { calls.push('signer.getAccounts'); return [{address, algo: 'secp256k1', pubkey: new Uint8Array(33)}]; }};
  const keplr = {
    getKey: async () => { calls.push('getKey'); return {bech32Address: address, pubKey: new Uint8Array(33).fill(2), algo: 'secp256k1'}; },
    getOfflineSignerAuto: async (_chain: string, options?: {preferNoSetFee?: boolean}) => { calls.push(`getOfflineSignerAuto:${options?.preferNoSetFee}`); return signer as never; },
  };
  return {keplr, calls};
}
type Script = {sign?: (msgs: readonly StakingMessage[]) => Promise<Uint8Array>; broadcast?: (bytes: Uint8Array) => Promise<string>; receipt?: (bytes: Uint8Array, hash: string) => ChainTx | null; chainId?: string};
function signingChain(script: Script = {}) {
  const calls: string[] = [];
  let signed: Uint8Array | undefined;
  const connect = async (rpc: string): Promise<SigningChain> => { calls.push(`connect:${rpc}`); return {
    getChainId: async () => script.chainId ?? 'zig-test-2',
    sign: async (_address, msgs) => { calls.push('sign'); signed = await (script.sign ?? (async m => txOf(m)))(msgs); return signed; },
    broadcastTxSync: async bytes => { calls.push('broadcast'); return script.broadcast ? script.broadcast(bytes) : txHash(bytes); },
    getTx: async hash => { calls.push('getTx'); const events = [{type: 'delegate', attributes: [{key: 'validator', value: A}]}, {type: 'withdraw_rewards', attributes: [{key: 'validator', value: A}]}, {type: 'withdraw_rewards', attributes: [{key: 'validator', value: B}]}]; return script.receipt ? script.receipt(signed!, hash) : {hash, height: 8290600, code: 0, tx: signed!, events}; },
    disconnect: () => { calls.push('disconnect'); },
  }; };
  return {connect, calls};
}
async function ticketFor(messages: readonly StakingMessage[], network: 'practice' | 'real' = 'practice', action: 'delegate' | 'claim' = 'delegate') {
  const quote = await quoting.quoteStaking({network, address: ME, action, messages, keplr: keplrDouble().keplr, revision: 0}, quoteChain(network === 'real' ? 'zigchain-1' : 'zig-test-2'));
  return gate.issueSignTicket(quote, press);
}
let execute: typeof import('./execute'), quoting: typeof import('./quote'), gate: typeof import('./sign-gate');
beforeEach(async () => { vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT', 'PUBLIC_ALPHA_UNDEPLOYED'); [execute, quoting, gate] = await Promise.all([import('./execute'), import('./quote'), import('./sign-gate')]); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('executeSigned', () => {
  test('delegate on practice: one signer request after the press, one sign, one broadcast, a verified receipt, the journal CONFIRMED', async () => {
    const storage = new Memory(), {keplr, calls} = keplrDouble(), chain = signingChain(), states: string[] = [];
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    expect(calls).toEqual([]); // nothing asked of the wallet before the signer path runs
    const receipt = await execute.executeSigned(ticket, keplr, state => states.push(state), {storage: () => storage, connect: chain.connect});
    expect(calls[0]).toBe('getOfflineSignerAuto:true'); // the reviewed fee is kept
    expect(calls.filter(c => c.startsWith('getOfflineSignerAuto'))).toHaveLength(1);
    expect(chain.calls.filter(c => c === 'sign')).toHaveLength(1);
    expect(chain.calls.filter(c => c === 'broadcast')).toHaveLength(1);
    expect(chain.calls[0]).toBe('connect:https://testnet-rpc.zigchain.com');
    expect(chain.calls.at(-1)).toBe('disconnect');
    expect(states).toEqual(['AWAITING_SIGNATURE', 'BROADCASTING', 'CONFIRMING', 'SUCCESS']);
    expect(receipt).toMatchObject({height: 8290600, code: 0, chainId: 'zig-test-2', network: 'practice'});
    const [entry] = stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!));
    expect(entry).toMatchObject({operationId: receipt.operationId, action: 'delegate', validator: A, amount: '25', state: 'CONFIRMED', hash: receipt.hash, height: '8290600', code: 0, wallet: ME});
  });
  test('a ticket redeems once: the same press can never broadcast twice', async () => {
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    const chain = signingChain(), deps = {storage: () => new Memory(), connect: chain.connect};
    await execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, deps);
    await expect(execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, deps)).rejects.toThrow('Press "Sign in Keplr"');
    expect(chain.calls.filter(c => c === 'broadcast')).toHaveLength(1);
  });
  test('claim all: one signature, N withdrawals, every validator in the journal', async () => {
    const storage = new Memory(), chain = signingChain();
    const ticket = await ticketFor(claim({delegator: ME, validators: [A, B]}), 'practice', 'claim');
    await execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, {storage: () => storage, connect: chain.connect});
    expect(chain.calls.filter(c => c === 'sign')).toHaveLength(1);
    expect(stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!))[0]).toMatchObject({action: 'claim', validators: [A, B], amount: '0', state: 'CONFIRMED'});
  });
  test('the real network needs the first-real confirm before the wallet is asked anything', async () => {
    const storage = new Memory(), {keplr, calls} = keplrDouble(), chain = signingChain({chainId: 'zigchain-1'});
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})], 'real');
    await expect(execute.executeSigned(ticket, keplr, () => undefined, {storage: () => storage, connect: chain.connect})).rejects.toThrow('Confirm the real network first');
    expect(calls).toEqual([]); expect(chain.calls).toEqual([]);
    storage.setItem(STAKING_PREFS.key, JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z'}));
    const again = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})], 'real');
    await expect(execute.executeSigned(again, keplr, () => undefined, {storage: () => storage, connect: chain.connect})).resolves.toMatchObject({chainId: 'zigchain-1', network: 'real'});
    expect(chain.calls[0]).toBe('connect:https://rpc.zigchain.com');
  });
  test('a wallet that signs something else is refused before broadcast; the journal says FAILED', async () => {
    const storage = new Memory(), chain = signingChain({sign: async () => txOf([delegate({delegator: ME, validator: B, amount: '25'})])});
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    const error = await execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, {storage: () => storage, connect: chain.connect}).catch(e => e);
    expect(error).toBeInstanceOf(execute.StakingFailure);
    expect(chain.calls).not.toContain('broadcast');
    expect(stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!))[0]!.state).toBe('FAILED');
  });
  test.each([
    ['rejected in the wallet', {sign: async () => { throw Error('Request rejected'); }}, 'rejected', 'REJECTED'],
    ['insufficient fee at broadcast', {broadcast: async () => { throw Error('Broadcasting transaction failed with code 13 (codespace: sdk). Log: insufficient fee'); }}, 'insufficient-fee', 'FAILED'],
    ['sequence mismatch at broadcast', {broadcast: async () => { throw Error('Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected 2, got 1'); }}, 'sequence', 'FAILED'],
    ['out of gas in the block', {receipt: (tx: Uint8Array, hash: string) => ({hash, height: 8290601, code: 11, tx, events: []})}, 'out-of-gas', 'FAILED'],
  ] as const)('%s → plain words, journal %s', async (_, script, kind, state) => {
    const storage = new Memory(), chain = signingChain(script as Script);
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    const error = await execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, {storage: () => storage, connect: chain.connect}).catch(e => e) as InstanceType<typeof execute.StakingFailure>;
    expect(error.plain.kind).toBe(kind);
    // A refusal by the node's own check never entered a block: a certain failure, not "funds may have moved".
    expect(error.uncertain).toBe(false);
    expect(stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!))[0]!.state).toBe(state);
    expect(chain.calls.filter(c => c === 'broadcast')).toHaveLength(kind === 'rejected' ? 0 : 1);
  });
  test('no receipt within 60 s: "still confirming" with the explorer link; the journal keeps it unknown, never re-sent', async () => {
    vi.useFakeTimers({now: new Date('2026-10-18T21:00:00Z'), toFake: ['setTimeout', 'clearTimeout', 'Date']});
    const storage = new Memory(), chain = signingChain({receipt: () => null});
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    let settled = false;
    const run = execute.executeSigned(ticket, keplrDouble().keplr, () => undefined, {storage: () => storage, connect: chain.connect}).catch(e => e).finally(() => { settled = true; });
    // The hashing is real async work (Web Crypto), so the fake clock moves in poll-sized steps until the run ends.
    for (let i = 0; i < 100 && !settled; i++) { await vi.advanceTimersByTimeAsync(1_500); await new Promise(resolve => setImmediate(resolve)); }
    const error = await run as InstanceType<typeof execute.StakingFailure>;
    expect(chain.calls.filter(c => c === 'getTx').length).toBeGreaterThan(30);
    expect(error.plain.kind).toBe('timeout');
    expect(error.uncertain).toBe(true);
    expect(error.plain.links[0]?.url).toMatch(/^https:\/\/testnet\.zigscan\.org\/tx\/[0-9A-F]{64}$/);
    expect(chain.calls.filter(c => c === 'broadcast')).toHaveLength(1);
    expect(stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!))[0]!.state).toBe('UNKNOWN_AFTER_BROADCAST');
  }, 60_000); // CI on da6b42dc: ~40 fake-clock polls with real hashing between them took 5.01 s on a slow runner; on 499fff64 a loaded checks job ran past 20 s. A time budget, every check unchanged
  test('an account switch after signing stops before broadcast', async () => {
    let n = 0;
    const keplr = {getKey: async () => ({bech32Address: n++ < 1 ? ME : toBech32('zig', new Uint8Array(20).fill(7))}), getOfflineSignerAuto: async () => ({getAccounts: async () => [{address: ME}]}) as never};
    const chain = signingChain();
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    await expect(execute.executeSigned(ticket, keplr, () => undefined, {storage: () => new Memory(), connect: chain.connect})).rejects.toBeInstanceOf(execute.StakingFailure);
    expect(chain.calls).not.toContain('broadcast');
  });
  test('an invalid build signs nothing, before redeeming the ticket', async () => {
    const ticket = await ticketFor([delegate({delegator: ME, validator: A, amount: '25'})]);
    vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT', 'BROKEN');
    const blocked = await import('./execute');
    const {keplr, calls} = keplrDouble();
    await expect(blocked.executeSigned(ticket, keplr, () => undefined, {storage: () => new Memory(), connect: signingChain().connect})).rejects.toThrow('unavailable in this build');
    expect(calls).toEqual([]);
  });
});

// Session AF chunk 3 (ADR-028 D4, H45, H48): a practice badge signs its memo and is checked against it; a revoke needs a
// direct signer; a badge is refused off the practice network before anything is asked of the wallet.
describe('chunk 3: practice badges and revokes through the same signer', () => {
  const MEMO = `zigoals:att:v1:c:${'ab'.repeat(32)}`;
  const txWithMemo = (messages: readonly StakingMessage[], memo: string) => TxRaw.encode(TxRaw.fromPartial({bodyBytes: TxBody.encode(TxBody.fromPartial({messages: messages.map(m => registry.encodeAsAny(m)), memo})).finish(), authInfoBytes: new Uint8Array([9]), signatures: [new Uint8Array(64)]})).finish();
  test('a badge on practice: the reviewed memo is signed, its receipt (a transfer to the sender) verified, the journal keeps the note and salt', async () => {
    const storage = new Memory(), {keplr} = keplrDouble();
    let memoSigned = '';
    const chain = signingChain({sign: async msgs => txWithMemo(msgs, MEMO), receipt: (bytes, hash) => ({hash, height: 8290601, code: 0, tx: bytes, events: [{type: 'transfer', attributes: [{key: 'recipient', value: ME}, {key: 'sender', value: ME}, {key: 'amount', value: '1azig'}]}]})});
    const connect = async (rpc: string) => { const c = await chain.connect(rpc); return {...c, sign: async (address: string, msgs: readonly StakingMessage[], fee: never, memo: string) => { memoSigned = memo; return c.sign(address, msgs, fee, memo); }}; };
    const quote = await quoting.quoteStaking({network: 'practice', address: ME, action: 'attest', messages: [attest({address: ME})], keplr, revision: 0, memo: MEMO, attestation: {kind: 'commitment', note: 'Fictional: thirty days of walking', salt: 'cd'.repeat(32)}}, quoteChain('zig-test-2'));
    expect(quote).toMatchObject({memo: MEMO, spend: '1', action: 'attest'});
    const receipt = await execute.executeSigned(gate.issueSignTicket(quote, press), keplr, () => undefined, {storage: () => storage, connect});
    expect(memoSigned).toBe(MEMO);
    const [entry] = stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!));
    expect(entry).toMatchObject({operationId: receipt.operationId, action: 'attest', amount: '1', memo: MEMO, state: 'CONFIRMED', attestation: {kind: 'commitment', note: 'Fictional: thirty days of walking', salt: 'cd'.repeat(32)}});
  });
  test('a wallet that signs another memo is refused before the broadcast', async () => {
    const storage = new Memory(), {keplr} = keplrDouble(), chain = signingChain({sign: async msgs => txWithMemo(msgs, `zigoals:att:v1:b:${'0f'.repeat(16)}`)});
    const quote = await quoting.quoteStaking({network: 'practice', address: ME, action: 'attest', messages: [attest({address: ME})], keplr, revision: 0, memo: MEMO}, quoteChain('zig-test-2'));
    await expect(execute.executeSigned(gate.issueSignTicket(quote, press), keplr, () => undefined, {storage: () => storage, connect: chain.connect})).rejects.toThrow();
    expect(chain.calls).not.toContain('broadcast');
  });
  test('a badge on the real network or with a plain-text memo is refused at the quote; nothing is asked of the wallet', async () => {
    const {keplr, calls} = keplrDouble();
    await expect(quoting.quoteStaking({network: 'real', address: ME, action: 'attest', messages: [attest({address: ME})], keplr, revision: 0, memo: MEMO}, quoteChain('zigchain-1'))).rejects.toThrow('Only a practice badge');
    await expect(quoting.quoteStaking({network: 'practice', address: ME, action: 'attest', messages: [attest({address: ME})], keplr, revision: 0, memo: 'Fictional: my garden goal'}, quoteChain('zig-test-2'))).rejects.toThrow('Only a practice badge');
    await expect(quoting.quoteStaking({network: 'practice', address: ME, action: 'delegate', messages: [delegate({delegator: ME, validator: A, amount: '1'})], keplr, revision: 0, memo: MEMO}, quoteChain('zig-test-2'))).rejects.toThrow('Only staking');
    expect(calls).toEqual([]);
  });
  test('a revoke: refused to a Ledger at the quote, and to a signer without signDirect at the signer; a direct signer signs it', async () => {
    const grantee = toBech32('zig', new Uint8Array(20).fill(7)), msgs = [revoke({granter: ME, grantee, msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate'})];
    const ledger = {getKey: async () => ({bech32Address: ME, pubKey: new Uint8Array(33).fill(2), algo: 'secp256k1', isNanoLedger: true})};
    await expect(quoting.quoteStaking({network: 'real', address: ME, action: 'revoke', messages: msgs, keplr: ledger, revision: 0}, quoteChain('zigchain-1'))).rejects.toThrow('A Ledger account cannot sign a revoke');
    const amino = keplrDouble(), storage = new Memory(), chain = signingChain();
    const quote = await quoting.quoteStaking({network: 'practice', address: ME, action: 'revoke', messages: msgs, keplr: amino.keplr, revision: 0}, quoteChain('zig-test-2'));
    await expect(execute.executeSigned(gate.issueSignTicket(quote, press), amino.keplr, () => undefined, {storage: () => storage, connect: chain.connect})).rejects.toThrow('A Ledger account cannot sign a revoke');
    expect(chain.calls).toEqual([]);
    expect(stakingEntriesOf(JSON.parse(storage.getItem(STAKING_JOURNAL.key)!))[0]).toMatchObject({action: 'revoke', grantee, msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate', state: 'FAILED'});
    const direct = keplrDouble();
    const signer = {getAccounts: async () => [{address: ME, algo: 'secp256k1', pubkey: new Uint8Array(33)}], signDirect: async () => { throw Error('not used: the signing chain double signs'); }};
    const keplr = {...direct.keplr, getOfflineSignerAuto: async () => signer as never};
    const signing = signingChain({receipt: (bytes, hash) => ({hash, height: 8290602, code: 0, tx: bytes, events: [{type: 'cosmos.authz.v1beta1.EventRevoke', attributes: [{key: 'grantee', value: JSON.stringify(grantee)}, {key: 'granter', value: JSON.stringify(ME)}]}]})});
    const again = await quoting.quoteStaking({network: 'practice', address: ME, action: 'revoke', messages: msgs, keplr, revision: 0}, quoteChain('zig-test-2'));
    await expect(execute.executeSigned(gate.issueSignTicket(again, press), keplr, () => undefined, {storage: () => new Memory(), connect: signing.connect})).resolves.toMatchObject({height: 8290602, code: 0});
  });
});
