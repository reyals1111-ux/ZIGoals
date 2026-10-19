/**
 * Session AF chunk 3 (lane L2a; ADR-028 D4, H16 (a), H42, H48, H58; `TIER 3 (egress routes)`): GET /api/chain/attestations?
 * network=zig-test-2&address=<zig1…> — the practice badges an address wrote (1 azig self-sends with a ZIGoals code as the
 * memo), read back by a sender-scoped transaction search on Polkachu's public testnet LCD (the official LCDs refuse
 * transaction searches), through ZIGoals' relay: kept 60 seconds per address, 10 chain reads a minute per client and 120 per
 * server, no address logged (lib/server/chain-attestations.ts). The practice network only: any other network is a 400.
 * An upstream failure answers 200 with `status: 'unavailable'` (H58); too many reads 429. Any other query key is refused.
 */
import {CHAIN_READS_LIMITED, chainRelay} from '../../../../lib/server/chain-relay';
import {readAttestations, unavailableAttestations} from '../../../../lib/server/chain-attestations';
import {ATTESTATION_CHAIN_ID, type AttestationsWire} from '../../../../lib/staking/attestation';
import {isZigAccount} from '../../../../lib/staking/address';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
const relay = chainRelay<AttestationsWire>({read: address => readAttestations(address), entries: 500});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, network = query.get('network'), address = query.get('address');
  if ([...query.keys()].some(k => k !== 'network' && k !== 'address') || query.getAll('network').length !== 1 || query.getAll('address').length !== 1 || !isZigAccount(address))
    return Response.json({error: 'The practice network (zig-test-2) and a public ZIG address are required.'}, {status: 400, headers});
  if (network !== ATTESTATION_CHAIN_ID) return Response.json({error: 'Practice badges are on the practice network (zig-test-2) only.'}, {status: 400, headers});
  try {
    const answer = await relay(address!, request.headers.get('cf-connecting-ip') ?? '');
    if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.value, {headers});
  } catch {
    return Response.json(unavailableAttestations(), {headers});
  }
}
