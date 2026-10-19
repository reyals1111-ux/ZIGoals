import {isSolanaAddress} from '../../wallet-address';
import type {TrackedChain} from './chains';
import {BalanceReadError, readJson, rpcResults, type Fetcher} from './http';
import type {ChainRead} from './evm';
import {associatedTokenAccount} from './solana-ata';
import type {ObservedAsset} from './store';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c), H50): a Solana address's SOL, USDC and USDT, browser-direct from PublicNode in
 * one JSON-RPC batch POST: `getBalance` (lamports, with its slot) and `getMultipleAccounts` (jsonParsed) of the address's
 * associated token accounts for the two mints, derived on the device (lib/wallets/balances/solana-ata.ts), because
 * PublicNode refuses the indexed `getTokenAccountsByOwner` without a personal token (read 2026-10-18 22:39 UTC). An
 * associated account that does not exist holds nothing (0); tokens kept in another, non-associated account are not seen,
 * and the page says so. Read-only methods only.
 */
export const SOLANA_METHODS = ['getBalance', 'getMultipleAccounts'] as const;
const parsedAmount = (account: unknown, mint: string, owner: string): string | null => {
  if (account === null) return '0';
  const info = (account as {data?: {parsed?: {info?: {mint?: unknown; owner?: unknown; tokenAmount?: {amount?: unknown}}}}} | undefined)?.data?.parsed?.info;
  const amount = info?.tokenAmount?.amount;
  return info && info.mint === mint && info.owner === owner && typeof amount === 'string' && /^\d{1,30}$/.test(amount) ? amount : null;
};
export async function readSolanaBalances(chain: TrackedChain, address: string, fetcher?: Fetcher, now = () => new Date()): Promise<ChainRead> {
  if (chain.kind !== 'solana' || !chain.origin || !isSolanaAddress(address)) throw new BalanceReadError('Not a Solana address.');
  const accounts = await Promise.all(chain.tokens.map(t => associatedTokenAccount(address, t.id)));
  const batch = [
    {jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address, {commitment: 'confirmed'}]},
    {jsonrpc: '2.0', id: 2, method: 'getMultipleAccounts', params: [accounts, {encoding: 'jsonParsed', commitment: 'confirmed'}]},
  ];
  const results = rpcResults(await readJson(chain.origin, {method: 'POST', body: JSON.stringify(batch)}, fetcher), [1, 2], chain.origin);
  const native = results.get(1);
  const lamports = (native?.result as {value?: unknown} | undefined)?.value, slot = (native?.result as {context?: {slot?: unknown}} | undefined)?.context?.slot;
  if (!native || native.error || typeof lamports !== 'number' || !Number.isSafeInteger(lamports) || lamports < 0) throw new BalanceReadError(native?.error ?? 'Solana: the balance was not in the answer.');
  const assets: ObservedAsset[] = [{id: 'native', symbol: chain.native.symbol, decimals: chain.native.decimals, amount: String(lamports)}], missing: string[] = [];
  const tokens = results.get(2), values = (tokens?.result as {value?: unknown} | undefined)?.value;
  chain.tokens.forEach((t, i) => {
    const amount = !tokens?.error && Array.isArray(values) && values.length === chain.tokens.length ? parsedAmount(values[i], t.id, address) : null;
    if (amount === null) missing.push(t.symbol); else assets.push({id: t.id, symbol: t.symbol, decimals: t.decimals, amount});
  });
  return {at: now().toISOString(), ...(typeof slot === 'number' && Number.isSafeInteger(slot) ? {height: String(slot)} : {}), assets, missing};
}
