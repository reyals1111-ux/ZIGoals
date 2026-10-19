/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H58; P6.5; `TIER 3 (egress routes)`): GET /api/chain/proposals?network=
 * zigchain-1|zig-test-2 — the newest governance proposals of a ZIGChain network with their tallies, the governance
 * parameters and the bonded total, address-free, read by this server from the network's official LCD at one block height
 * (lib/server/chain-governance.ts). Kept 2 minutes for every client, 30 seconds while a proposal is being voted on
 * (lib/server/chain-relay.ts: 10 chain reads a minute per client, 120 per server). An upstream failure answers 200 with
 * `status: 'unavailable'` and a reason (H58); only this route's own faults answer ≥ 400 (a bad query 400, too many reads
 * 429). Nothing is logged.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {isChainNetwork, type ChainNetwork} from '../../../../lib/server/chain-lcd';
import {proposalsTtl, readProposals, unavailableProposals} from '../../../../lib/server/chain-governance';
import type {ProposalsWire} from '../../../../lib/governance/wire';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<ProposalsWire>({read: key => readProposals(key as ChainNetwork), ttl: proposalsTtl});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network');
  if ([...query.keys()].some(k => k !== 'network') || query.getAll('network').length !== 1 || !isChainNetwork(network))
    return Response.json({error: 'A supported network is required: zigchain-1 or zig-test-2.'}, {status: 400, headers});
  try {
    const answer = await relay(network, request.headers.get('cf-connecting-ip') ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableProposals(network), {headers});
  }
}
