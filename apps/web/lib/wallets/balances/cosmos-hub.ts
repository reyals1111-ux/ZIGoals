import {fromBech32, toBech32} from '@cosmjs/encoding';
import type {TrackedChain} from './chains';
import {BalanceReadError, readJson, type Fetcher} from './http';
import type {ChainRead} from './evm';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (c)): the ATOM on Cosmos Hub of the key behind a linked ZIGChain address. Both chains
 * use coin type 118 (packages/chain-config `bip44.coinType`), so the same key's Hub address is the same 20 bytes under the
 * `cosmos` prefix; nothing is asked of a wallet. Read browser-direct from PublicNode's Cosmos REST with one plain GET
 * (`/cosmos/bank/v1beta1/balances/<cosmos1…>/by_denom?denom=uatom`, no header, so no preflight); only `uatom` is read
 * (IBC tokens on the Hub are not tracked, H64).
 */
export function cosmosHubAddress(zig: string): string {
  let decoded: ReturnType<typeof fromBech32>;
  try { decoded = fromBech32(zig, 90); } catch { throw new BalanceReadError('Not a ZIGChain address.'); }
  if (decoded.prefix !== 'zig' || decoded.data.length !== 20) throw new BalanceReadError('Only a ZIGChain account address (20 bytes) has a Cosmos Hub twin.');
  return toBech32('cosmos', decoded.data);
}
export async function readCosmosHubBalance(chain: TrackedChain, zig: string, fetcher?: Fetcher, now = () => new Date()): Promise<ChainRead> {
  if (chain.kind !== 'cosmos-hub' || !chain.origin) throw new BalanceReadError('Not Cosmos Hub.');
  const address = cosmosHubAddress(zig);
  const answer = await readJson(`${chain.origin}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uatom`, {method: 'GET'}, fetcher);
  const balance = (answer as {balance?: {denom?: unknown; amount?: unknown}} | null)?.balance;
  const amount = balance?.amount;
  if (!balance || balance.denom !== 'uatom' || typeof amount !== 'string' || !/^\d{1,40}$/.test(amount)) throw new BalanceReadError('Cosmos Hub sent an ATOM balance ZIGoals could not check.');
  return {at: now().toISOString(), assets: [{id: 'uatom', symbol: 'ATOM', decimals: 6, amount}], missing: []};
}
