/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16 (a), H45, H58; `TIER 3 (egress routes)`): GET /api/chain/grants?network=
 * zigchain-1|zig-test-2&address=<zig1…> — the authz grants and fee allowances the address has given, read-only, through
 * ZIGoals' relay as /api/positions reads balances: this server asks the network's official LCD at one block height, keeps
 * the answer 60 seconds per network and address, allows 10 chain reads a minute per client and 120 per server, and logs no
 * address (lib/server/chain-grants.ts). An upstream failure answers 200 with `status: 'unavailable'` (H58); a bad query
 * 400, too many reads 429. Any other query key is refused.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {isChainNetwork, type ChainNetwork} from '../../../../lib/server/chain-lcd';
import {readGrants, unavailableGrants} from '../../../../lib/server/chain-grants';
import {isZigAccount} from '../../../../lib/staking/address';
import type {GrantsWire} from '../../../../lib/staking/grants';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<GrantsWire>({read: key => { const [network, address] = key.split(':'); return readGrants(network as ChainNetwork, address!); }, entries: 500});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network'), address = query.get('address');
  if ([...query.keys()].some(k => k !== 'network' && k !== 'address') || query.getAll('network').length !== 1 || query.getAll('address').length !== 1 || !isChainNetwork(network) || !isZigAccount(address))
    return Response.json({error: 'A supported network and a public ZIG address are required.'}, {status: 400, headers});
  try {
    const answer = await relay(`${network}:${address}`, request.headers.get('cf-connecting-ip') ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableGrants(network), {headers});
  }
}
