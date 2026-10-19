import {MULTICALL3, aggregate3BalanceOf, decodeAggregate3Balances, quantity} from './abi';
import type {TrackedChain} from './chains';
import {BalanceReadError, readJson, rpcResults, type Fetcher} from './http';
import type {ObservedAsset} from './store';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c)): an EVM address's balances on one chain, browser-direct from PublicNode in one
 * JSON-RPC batch POST: `eth_getBalance` (the native coin), one `eth_call` to Multicall3's `aggregate3` with `balanceOf` for
 * the chain's fixed tokens (lib/wallets/balances/chains.ts), and `eth_blockNumber` (the "as of" block). Read-only methods
 * only (lib/wallets/balances/hosts.test.ts allows exactly these three). A token whose call fails is left out with a note,
 * never shown as 0.
 */
export type ChainRead = {at: string; height?: string; assets: ObservedAsset[]; missing: string[]};
export const EVM_METHODS = ['eth_getBalance', 'eth_call', 'eth_blockNumber'] as const;
export async function readEvmBalances(chain: TrackedChain, address: string, fetcher?: Fetcher, now = () => new Date()): Promise<ChainRead> {
  if (chain.kind !== 'evm' || !chain.origin || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new BalanceReadError('Not an EVM address for this chain.');
  const tokens = chain.tokens.map(t => t.id);
  const batch = [
    {jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest']},
    ...(tokens.length ? [{jsonrpc: '2.0', id: 2, method: 'eth_call', params: [{to: MULTICALL3, data: aggregate3BalanceOf(tokens, address)}, 'latest']}] : []),
    {jsonrpc: '2.0', id: 3, method: 'eth_blockNumber', params: []},
  ];
  const results = rpcResults(await readJson(chain.origin, {method: 'POST', body: JSON.stringify(batch)}, fetcher), [1, 2, 3], chain.origin);
  const native = results.get(1);
  if (!native || native.error) throw new BalanceReadError(native?.error ?? `${chain.name}: the balance was not in the answer.`);
  let amount: string;
  try { amount = quantity(native.result); } catch { throw new BalanceReadError(`${chain.name}: the balance was not a number.`); }
  const assets: ObservedAsset[] = [{id: 'native', symbol: chain.native.symbol, decimals: chain.native.decimals, amount}], missing: string[] = [];
  if (tokens.length) {
    const call = results.get(2);
    let balances: (string | null)[] = tokens.map(() => null);
    if (call && !call.error) { try { balances = decodeAggregate3Balances(call.result as string, tokens.length); } catch { /* every token is missing */ } }
    chain.tokens.forEach((t, i) => { const b = balances[i]; if (b === null || b === undefined) missing.push(t.symbol); else assets.push({id: t.id, symbol: t.symbol, decimals: t.decimals, amount: b}); });
  }
  const block = results.get(3);
  let height: string | undefined;
  try { height = block && !block.error ? quantity(block.result) : undefined; } catch { height = undefined; }
  return {at: now().toISOString(), ...(height ? {height} : {}), assets, missing};
}
