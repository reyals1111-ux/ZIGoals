/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H58; P6.5; `TIER 3 (egress routes)`): GET /api/chain/proposal?network=
 * zigchain-1|zig-test-2&id=<number> — one governance proposal with its tally, the governance parameters and the bonded
 * total (an empty list when the chain has no proposal with that number), address-free, read by this server from the
 * network's official LCD at one block height. Kept 2 minutes, 30 seconds while it is being voted on; the limits of
 * lib/server/chain-relay.ts. An upstream failure answers 200 with `status: 'unavailable'` (H58); a bad query 400, too many
 * reads 429. Nothing is logged.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {isChainNetwork, type ChainNetwork} from '../../../../lib/server/chain-lcd';
import {proposalsTtl, readProposal, unavailableProposals} from '../../../../lib/server/chain-governance';
import type {ProposalsWire} from '../../../../lib/governance/wire';
import {marketClientGroup} from '../../../../lib/server/market-client-address';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<ProposalsWire>({read: key => { const [network, id] = key.split(':'); return readProposal(network as ChainNetwork, id!); }, ttl: proposalsTtl});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network'), id = query.get('id');
  if ([...query.keys()].some(k => k !== 'network' && k !== 'id') || query.getAll('network').length !== 1 || query.getAll('id').length !== 1 || !isChainNetwork(network) || !id || !/^[1-9]\d{0,18}$/.test(id))
    return Response.json({error: 'A supported network (zigchain-1 or zig-test-2) and a proposal number are required.'}, {status: 400, headers});
  try {
    const answer = await relay(`${network}:${id}`, marketClientGroup(request.headers.get('cf-connecting-ip')) ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableProposals(network), {headers});
  }
}
