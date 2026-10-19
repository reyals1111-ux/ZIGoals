/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16 (a), H58; P6.6; `TIER 3 (egress routes)`): GET /api/chain/vote?network=
 * zigchain-1|zig-test-2&proposal=<number>&voter=<zig1…> — the person's own vote on a proposal during its voting period,
 * read through ZIGoals' read-only relay as /api/positions reads balances (H16 (a)): this server asks the network's official
 * LCD at one block height, keeps the answer 60 seconds per network, proposal and address, allows 10 chain reads a minute
 * per client and 120 per server, and logs no address. `vote: null` means the address has not voted (the chain removes
 * votes when it counts them, so after the voting period the device's own vote journal is the record). An upstream failure
 * answers 200 with `status: 'unavailable'` (H58); a bad query 400, too many reads 429. Any other query key is refused.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {isChainNetwork, type ChainNetwork} from '../../../../lib/server/chain-lcd';
import {readVote, unavailableVote} from '../../../../lib/server/chain-governance';
import {isZigAccount} from '../../../../lib/staking/address';
import type {VoteWire} from '../../../../lib/governance/wire';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<VoteWire>({read: key => { const [network, id, voter] = key.split(':'); return readVote(network as ChainNetwork, id!, voter!); }, entries: 500});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network'), id = query.get('proposal'), voter = query.get('voter');
  if ([...query.keys()].some(k => k !== 'network' && k !== 'proposal' && k !== 'voter') || ['network', 'proposal', 'voter'].some(k => query.getAll(k).length !== 1)
    || !isChainNetwork(network) || !id || !/^[1-9]\d{0,18}$/.test(id) || !isZigAccount(voter))
    return Response.json({error: 'A supported network, a proposal number and a public ZIG address are required.'}, {status: 400, headers});
  try {
    const answer = await relay(`${network}:${id}:${voter}`, request.headers.get('cf-connecting-ip') ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableVote(network, id), {headers});
  }
}
