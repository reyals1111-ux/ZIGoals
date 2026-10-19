import {describe, expect, test} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {AGGREGATE3, MULTICALL3, aggregate3BalanceOf, decodeAggregate3Balances, quantity} from './abi';
import {associatedTokenAccount, base58Decode, base58Encode, onCurve} from './solana-ata';
import {chainById} from './chains';
import {readEvmBalances} from './evm';
import {readSolanaBalances} from './solana';
import {readBitcoinBalance} from './bitcoin';
import {cosmosHubAddress, readCosmosHubBalance} from './cosmos-hub';
import {readZigchainBalances, zigAssets} from './zigchain';
import {dueReads, refreshOne} from './read';
import {observationOf, type WalletBalances} from './store';
import {PositionReadRefused} from '../../position-reader';
import type {Position} from '../../positions';

// Session AF (L2b, Part 3, ADR-028 H16): the readers with recorded answers only (shapes as PublicNode and mempool.space
// answered on 2026-10-18 22:36–22:40 UTC); fictional addresses; no request leaves the test.
const EVM = '0x52908400098527886E0F7030069857D2E4169EE7', SOL = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9';
const ZIG = toBech32('zig', new Uint8Array(20).fill(9)), AT = new Date('2026-10-19T08:00:00.000Z'), now = () => AT;
const w = (n: string) => n.padStart(64, '0');
type Call = {url: string; init: RequestInit};
const recorder = (answer: (url: string, body: unknown) => unknown, status = 200) => {
  const calls: Call[] = [];
  return {calls, fetcher: async (url: string, init: RequestInit) => { calls.push({url, init}); return new Response(JSON.stringify(answer(url, init.body ? JSON.parse(String(init.body)) : null)), {status}); }};
};

describe('Multicall3 aggregate3 (hand-encoded)', () => {
  test('the call data, word by word', () => {
    const tokens = ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0xdAC17F958D2ee523a2206206994597C13D831ec7'];
    const owner = w(EVM.slice(2).toLowerCase()), call = `70a08231${owner}`.padEnd(128, '0');
    const tuple = (t: string) => w(t.slice(2).toLowerCase()) + w('1') + w('60') + w('24') + call;
    expect(aggregate3BalanceOf(tokens, EVM)).toBe(`0x${AGGREGATE3}${w('20')}${w('2')}${w('40')}${w('100')}${tuple(tokens[0]!)}${tuple(tokens[1]!)}`);
    expect(AGGREGATE3).toBe('82ad56cb'); expect(MULTICALL3).toBe('0xcA11bde05977b3631167028862bE2a173976CA11');
    expect(() => aggregate3BalanceOf([], EVM)).toThrow(); expect(() => aggregate3BalanceOf(['0x12'], EVM)).toThrow();
  });
  test('the answer: one 32-byte number per successful call, null for a failed one; a broken layout throws', () => {
    // (true, 0x…05) and (false, 0x) — the layout aggregate3 returns.
    const ok = w('1') + w('40') + w('20') + w('5'), failed = w('0') + w('40') + w('0');
    const answer = `0x${w('20')}${w('2')}${w('40')}${w((0x40 + ok.length / 2).toString(16))}${ok}${failed}`;
    expect(decodeAggregate3Balances(answer, 2)).toEqual(['5', null]);
    expect(() => decodeAggregate3Balances(answer, 3)).toThrow(/different number/);
    expect(() => decodeAggregate3Balances(answer.slice(0, 200), 2)).toThrow();
    expect(() => decodeAggregate3Balances('nope', 2)).toThrow();
    expect(quantity('0x1bc16d674ec80000')).toBe('2000000000000000000'); expect(quantity('0x0')).toBe('0');
    for (const bad of ['0x', '0x01', '12', 5, null]) expect(() => quantity(bad)).toThrow();
  });
});

describe('EVM (PublicNode, one batch POST)', () => {
  test('native + Circle USDC + Tether USDT on Ethereum, with the block', async () => {
    const r = recorder((_, body) => (body as {id: number}[]).map(c => c.id === 1 ? {jsonrpc: '2.0', id: 1, result: '0x1bc16d674ec80000'} : c.id === 2 ? {jsonrpc: '2.0', id: 2, result: `0x${w('20')}${w('2')}${w('40')}${w('c0')}${w('1')}${w('40')}${w('20')}${w('f4240')}${w('1')}${w('40')}${w('20')}${w('0')}`} : {jsonrpc: '2.0', id: 3, result: '0x1902129'}));
    const read = await readEvmBalances(chainById('eip155:1')!, EVM, r.fetcher, now);
    expect(read).toEqual({at: AT.toISOString(), height: '26222889', missing: [], assets: [
      {id: 'native', symbol: 'ETH', decimals: 18, amount: '2000000000000000000'},
      {id: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, amount: '1000000'},
      {id: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, amount: '0'}]});
    expect(r.calls.map(c => c.url)).toEqual(['https://ethereum-rpc.publicnode.com']);
    expect((JSON.parse(String(r.calls[0]!.init.body)) as {method: string}[]).map(c => c.method)).toEqual(['eth_getBalance', 'eth_call', 'eth_blockNumber']);
  });
  test('a failed token call leaves the token out ("not read"), never 0; a failed balance fails the read', async () => {
    const tokenFails = recorder(() => [{jsonrpc: '2.0', id: 1, result: '0x0'}, {jsonrpc: '2.0', id: 2, error: {code: -32000, message: 'execution reverted'}}, {jsonrpc: '2.0', id: 3, result: '0x10'}]);
    const read = await readEvmBalances(chainById('eip155:8453')!, EVM, tokenFails.fetcher, now);
    expect(read.assets.map(a => a.symbol)).toEqual(['ETH']); expect(read.missing).toEqual(['USDC']);
    const nativeFails = recorder(() => [{jsonrpc: '2.0', id: 1, error: {code: -32602, message: 'Request blocked'}}]);
    await expect(readEvmBalances(chainById('eip155:10')!, EVM, nativeFails.fetcher, now)).rejects.toThrow('optimism-rpc.publicnode.com refused the read: Request blocked.');
    await expect(readEvmBalances(chainById('eip155:10')!, 'zig1abc', nativeFails.fetcher, now)).rejects.toThrow('Not an EVM address');
    expect(nativeFails.calls).toHaveLength(1);
  });
});

describe('Solana (PublicNode, associated token accounts)', () => {
  test('the associated accounts are derived on the device (vector read live once: an exchange wallet\'s USDC and USDT accounts)', async () => {
    expect(await associatedTokenAccount(SOL, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('FzbcyEZ9m8xjtergWgWDq7mfPoHEbboBF791B6cTpzbq');
    expect(await associatedTokenAccount(SOL, 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe('CyBjGpte4Npi5zNkdtWumPxVW4kpMR8BuFSbA587xZES');
    expect(onCurve(base58Decode(SOL))).toBe(true);
    expect(onCurve(base58Decode('FzbcyEZ9m8xjtergWgWDq7mfPoHEbboBF791B6cTpzbq'))).toBe(false);
    for (const t of [SOL, '11111111111111111111111111111111', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']) expect(base58Encode(base58Decode(t))).toBe(t);
  });
  test('SOL with its slot, USDC from its account, USDT absent = 0; a mismatched account is "not read"', async () => {
    const account = (mint: string, amount: string, owner = SOL) => ({data: {parsed: {info: {mint, owner, tokenAmount: {amount, decimals: 6}}, type: 'account'}, program: 'spl-token'}});
    const r = recorder(() => [{jsonrpc: '2.0', id: 1, result: {context: {slot: 458603820}, value: 1500000000}}, {jsonrpc: '2.0', id: 2, result: {context: {slot: 458603820}, value: [account('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '2500000'), null]}}]);
    expect(await readSolanaBalances(chainById('solana:mainnet')!, SOL, r.fetcher, now)).toEqual({at: AT.toISOString(), height: '458603820', missing: [], assets: [
      {id: 'native', symbol: 'SOL', decimals: 9, amount: '1500000000'},
      {id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6, amount: '2500000'},
      {id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6, amount: '0'}]});
    const body = JSON.parse(String(r.calls[0]!.init.body)) as {method: string; params: unknown[]}[];
    expect(body.map(c => c.method)).toEqual(['getBalance', 'getMultipleAccounts']);
    expect(body[1]!.params[0]).toEqual(['FzbcyEZ9m8xjtergWgWDq7mfPoHEbboBF791B6cTpzbq', 'CyBjGpte4Npi5zNkdtWumPxVW4kpMR8BuFSbA587xZES']);
    const wrongOwner = recorder(() => [{jsonrpc: '2.0', id: 1, result: {context: {slot: 1}, value: 0}}, {jsonrpc: '2.0', id: 2, result: {value: [account('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '9', '11111111111111111111111111111111'), null]}}]);
    expect((await readSolanaBalances(chainById('solana:mainnet')!, SOL, wrongOwner.fetcher, now)).missing).toEqual(['USDC']);
    await expect(readSolanaBalances(chainById('solana:mainnet')!, EVM, wrongOwner.fetcher, now)).rejects.toThrow('Not a Solana address');
  });
});

describe('Bitcoin (mempool.space GET) and Cosmos Hub (PublicNode REST GET)', () => {
  test('confirmed satoshis; the answer must name the address', async () => {
    const addr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    const r = recorder(() => ({address: addr, chain_stats: {funded_txo_count: 3, funded_txo_sum: 150000, spent_txo_count: 1, spent_txo_sum: 50000, tx_count: 4}, mempool_stats: {funded_txo_sum: 999}}));
    expect(await readBitcoinBalance(chainById('bitcoin')!, addr, r.fetcher, now)).toEqual({at: AT.toISOString(), missing: [], assets: [{id: 'native', symbol: 'BTC', decimals: 8, amount: '100000'}]});
    expect(r.calls.map(c => [c.url, c.init.method, c.init.headers ?? null])).toEqual([[`https://mempool.space/api/address/${addr}`, 'GET', null]]);
    const other = recorder(() => ({address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', chain_stats: {funded_txo_sum: 1, spent_txo_sum: 0}}));
    await expect(readBitcoinBalance(chainById('bitcoin')!, addr, other.fetcher, now)).rejects.toThrow(/could not check/);
  });
  test('the same key\'s cosmos1 address, ATOM by denom', async () => {
    const hub = cosmosHubAddress(ZIG);
    expect(hub).toBe(toBech32('cosmos', new Uint8Array(20).fill(9)));
    expect(() => cosmosHubAddress(toBech32('zig', new Uint8Array(32).fill(9)))).toThrow(/20 bytes/);
    expect(() => cosmosHubAddress(hub)).toThrow();
    const r = recorder(() => ({balance: {denom: 'uatom', amount: '112541691'}}));
    expect(await readCosmosHubBalance(chainById('cosmoshub-4')!, ZIG, r.fetcher, now)).toEqual({at: AT.toISOString(), missing: [], assets: [{id: 'uatom', symbol: 'ATOM', decimals: 6, amount: '112541691'}]});
    expect(r.calls.map(c => c.url)).toEqual([`https://cosmos-rest.publicnode.com/cosmos/bank/v1beta1/balances/${hub}/by_denom?denom=uatom`]);
  });
});

describe('ZIGChain (ZIGoals\' relay only)', () => {
  const pos = (sourceType: Position['sourceType'], quantity: string, extra: Partial<Position> = {}) => ({id: `${sourceType}-${quantity}`, providerId: 'native-zig', sourceType, network: 'zigchain-1', account: ZIG, asset: 'ZIG', denom: 'azig', quantity, decimals: 18, ...extra}) as Position;
  test('liquid, staked (summed over validators), rewards, unbonding and stZIG; the relay\'s refusal is the reason', async () => {
    const chain = chainById('zigchain-1')!;
    expect(zigAssets([pos('WALLET_LIQUID', '5'), pos('NATIVE_STAKING', '100'), pos('NATIVE_STAKING', '50'), pos('NATIVE_REWARDS', '3'), pos('LIQUID_STAKING', '7', {asset: 'stZIG', denom: chain.tokens[0]!.id, decimals: 6}), pos('WALLET_LIQUID', '9', {network: 'zig-test-2'})], chain))
      .toEqual([{id: 'azig', symbol: 'ZIG', decimals: 18, amount: '5'}, {id: 'azig:staked', symbol: 'ZIG', decimals: 18, amount: '150'}, {id: 'azig:rewards', symbol: 'ZIG', decimals: 18, amount: '3'}, {id: chain.tokens[0]!.id, symbol: 'stZIG', decimals: 6, amount: '7'}]);
    const asked: string[] = [];
    await readZigchainBalances(chain, ZIG, async (mode, account) => { asked.push(`${mode} ${account}`); return []; }, now);
    expect(asked).toEqual([`MAINNET_READ_ONLY ${ZIG}`]);
    await expect(readZigchainBalances(chain, ZIG, async () => { throw new PositionReadRefused('Mainnet addresses are not read on the public Alpha.'); }, now)).rejects.toThrow('Mainnet addresses are not read on the public Alpha.');
  });
});

describe('when to read, and what is stored', () => {
  const wallet = {id: 'w1', kind: 'evm' as const, wallet: 'io.metamask', label: 'MetaMask', address: EVM, addedAt: AT.toISOString(), chains: ['eip155:8453']};
  test('due when missing or older than 15 minutes; all when forced', () => {
    const record: WalletBalances = {version: 1, observations: {'w1|eip155:8453': {walletId: 'w1', chainId: 'eip155:8453', at: AT.toISOString(), assets: []}}};
    expect(dueReads([wallet], record, AT.getTime() + 60_000)).toEqual([]);
    expect(dueReads([wallet], record, AT.getTime() + 16 * 60_000).map(d => d.chain.id)).toEqual(['eip155:8453']);
    expect(dueReads([wallet], record, AT.getTime(), true).map(d => d.chain.id)).toEqual(['eip155:8453']);
    expect(dueReads([{...wallet, chains: undefined}], {version: 1}, AT.getTime()).map(d => d.chain.id)).toHaveLength(6);
  });
  test('one read in flight per wallet × chain; a failure keeps the last good amounts and adds the reason', async () => {
    const m = new Map<string, string>(), storage = {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }};
    let answer: unknown = [{jsonrpc: '2.0', id: 1, result: '0x5'}, {jsonrpc: '2.0', id: 2, result: `0x${w('20')}${w('1')}${w('20')}${w('1')}${w('40')}${w('20')}${w('7')}`}, {jsonrpc: '2.0', id: 3, result: '0x9'}];
    const r = recorder(() => answer);
    const base = chainById('eip155:8453')!;
    await Promise.all([refreshOne(storage, wallet, base, {fetcher: r.fetcher, now}), refreshOne(storage, wallet, base, {fetcher: r.fetcher, now})]);
    expect(r.calls).toHaveLength(1);
    const read = () => observationOf(JSON.parse(m.get('zigoals:wallet-balances:v1')!), 'w1', 'eip155:8453');
    expect(read()).toEqual({walletId: 'w1', chainId: 'eip155:8453', at: AT.toISOString(), height: '9', assets: [{id: 'native', symbol: 'ETH', decimals: 18, amount: '5'}, {id: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, amount: '7'}]});
    answer = 'not json-rpc';
    await refreshOne(storage, wallet, base, {fetcher: r.fetcher, now: () => new Date('2026-10-19T09:00:00.000Z')});
    expect(read()).toMatchObject({at: AT.toISOString(), assets: [{amount: '5'}, {amount: '7'}], error: 'base-rpc.publicnode.com sent something ZIGoals could not read.', errorAt: '2026-10-19T09:00:00.000Z'});
  });
});
