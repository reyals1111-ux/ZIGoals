/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): GET /api/chain/validators?network=zigchain-1|zig-test-2 — the
 * validators of a ZIGChain network, address-free, read by this server from the network's official LCD at one block height
 * (lib/server/chain-validators.ts) and kept 60 seconds for every client (lib/server/chain-relay.ts: 10 chain reads a minute
 * per client, 120 per server). An upstream failure answers 200 with `status: 'unavailable'` and a reason (H58); only this
 * route's own faults answer ≥ 400 (a bad query 400, too many reads 429). Nothing is logged.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {VALIDATOR_LCDS, readValidators, unavailableValidators, type ValidatorNetwork} from '../../../../lib/server/chain-validators';
import type {ValidatorsWire} from '../../../../lib/chain/validators-wire';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<ValidatorsWire>({read: key => readValidators(key as ValidatorNetwork)});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network');
  if ([...query.keys()].some(k => k !== 'network') || query.getAll('network').length !== 1 || !network || !Object.hasOwn(VALIDATOR_LCDS, network))
    return Response.json({error: 'A supported network is required: zigchain-1 or zig-test-2.'}, {status: 400, headers});
  try {
    const answer = await relay(network, request.headers.get('cf-connecting-ip') ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableValidators(network as ValidatorNetwork), {headers});
  }
}
