import {CHAIN_READS_LIMITED, chainRelay} from '../server/chain-relay';
import {isChainNetwork, type ChainNetwork} from '../server/chain-lcd';
import {marketClientGroup} from '../server/market-client-address';
import {isCheckableDenom} from './denoms';
import {readDenom, unavailableDenom, type DenomWire} from './denom-reader';

/**
 * Session AK (F4; `TIER 3 (egress routes)`, mounted by the lead): GET /api/chain/denom?network=zigchain-1|zig-test-2&denom=…
 * — one token's facts (lib/zigchain-eco/denom-reader.ts), address-free, from the network's official LCD at one block
 * height. The limits of lib/server/chain-relay.ts (10 reads a minute per client group, 120 per server; kept 10 minutes:
 * a trace and a token's metadata rarely change). An upstream failure answers 200 with `status: 'unavailable'`; a bad
 * query 400; too many reads 429. Nothing is logged. The route file is two lines:
 *   export const dynamic = 'force-dynamic';
 *   export {GET} from '../../../../lib/zigchain-eco/denom-route';
 */
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
export const DENOM_TTL_MS = 10 * 60_000;
export function denomRoute(read: (network: ChainNetwork, denom: string) => Promise<DenomWire> = readDenom) {
  const relay = chainRelay<DenomWire>({read: key => { const at = key.indexOf(':'); return read(key.slice(0, at) as ChainNetwork, key.slice(at + 1)); }, ttl: () => DENOM_TTL_MS, entries: 200});
  return async function GET(request: Request): Promise<Response> {
    const query = new URL(request.url).searchParams, network = query.get('network'), denom = query.get('denom') ?? '';
    if ([...query.keys()].some(k => k !== 'network' && k !== 'denom') || query.getAll('network').length !== 1 || query.getAll('denom').length !== 1 || !isChainNetwork(network) || !isCheckableDenom(denom))
      return Response.json({error: 'A supported network (zigchain-1 or zig-test-2) and a token denom (ibc/…, coin.zig1….name, a zig1… token contract, azig or uzig) are required.'}, {status: 400, headers});
    try {
      const answer = await relay(`${network}:${denom}`, marketClientGroup(request.headers.get('cf-connecting-ip')) ?? '');
      if ('retryAfter' in answer) return Response.json({error: CHAIN_READS_LIMITED, code: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': String(answer.retryAfter)}});
      return Response.json(answer.value, {headers});
    } catch {
      return Response.json(unavailableDenom(network, denom), {headers});
    }
  };
}
export const GET = denomRoute();
