import 'server-only';
import * as z from 'zod';
import {POOL_SHARE_DENOMS, VAULT_SHARE_DENOMS, type SharesWire} from '../../earn/shares';
import {readAtOneHeight, shape, type Fetcher} from './upstream';

/**
 * Session AH (AF3; `TIER 3 (egress routes)`): GET /api/earn/shares. One public ZIGChain address's balance of the eight
 * pinned share denoms (lib/earn/shares.ts), at one block height, from the same two mainnet LCDs as the other Earn routes.
 * The only Earn read that carries a person's address: it asks for these denoms by name and nothing else (no full balance
 * list, no history), the answer is not stored, and the address is never logged. Mainnet only: practice shares have no value.
 */
const coin = z.object({balance: z.object({denom: z.string().max(200), amount: z.string().regex(/^\d{1,78}$/)})});
export async function readShares(fetcher: Fetcher, address: string): Promise<SharesWire> {
  const {latest, value} = await readAtOneHeight(fetcher, 'mainnet', async get => {
    const one = async (denom: string) => {
      const answer = shape(coin, await get(`/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${encodeURIComponent(denom)}`, 4_000)).balance;
      return answer.denom === denom ? answer.amount : '0';
    };
    const pools = await Promise.all(Object.entries(POOL_SHARE_DENOMS).map(async ([id, denom]) => [id, await one(denom)] as const));
    const vaults = await Promise.all(Object.entries(VAULT_SHARE_DENOMS).map(async ([id, denom]) => [id, await one(denom)] as const));
    return {pools: Object.fromEntries(pools.filter(([, a]) => a !== '0')), vaults: Object.fromEntries(vaults.filter(([, a]) => a !== '0'))};
  });
  return {height: latest.height, observedAt: latest.time, ...value};
}
