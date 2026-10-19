import 'server-only';
import {marketClientGroup} from '../../server/market-client-address';
import {rampAssetsService, type Fetcher} from './ramp-assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H58, H89; `TIER 3 (egress routes)`): the `GET /api/onramps/ramp-assets` handler. The
 * query is exactly `currency=EUR` or `currency=USD` (anything else 400); an upstream failure is a 200 `unavailable` body
 * (H58); more than 30 requests a minute from one client group is 429 with Retry-After (the group is counted in memory
 * only, never stored or forwarded); only the route's own fault is 500. No address of anyone is asked for or read.
 */
export const ONRAMP_HEADERS = Object.freeze({'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'});
export const CLIENT_LIMIT_PER_MINUTE = 30;
export function rampAssetsRoute(fetcher?: Fetcher, now: () => Date = () => new Date()) {
  const read = rampAssetsService(fetcher, now), clients = new Map<string, number[]>();
  return async function GET(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams, currency = params.get('currency');
    if ([...params.keys()].some(k => k !== 'currency') || params.getAll('currency').length !== 1 || (currency !== 'EUR' && currency !== 'USD'))
      return Response.json({error: 'Expected currency=EUR|USD.'}, {status: 400, headers: ONRAMP_HEADERS});
    const group = marketClientGroup(request.headers.get('cf-connecting-ip')), t = now().getTime();
    if (group) {
      const seen = (clients.get(group) ?? []).filter(at => t - at < 60_000);
      if (seen.length >= CLIENT_LIMIT_PER_MINUTE) return Response.json({error: 'Too many requests; try again in a minute.'}, {status: 429, headers: {...ONRAMP_HEADERS, 'Retry-After': String(Math.ceil((60_000 - (t - seen[0]!)) / 1000))}});
      seen.push(t); clients.set(group, seen);
      if (clients.size > 5000) clients.delete(clients.keys().next().value!);
    }
    try { return Response.json(await read(currency), {headers: ONRAMP_HEADERS}); }
    catch { return Response.json({error: 'The on-ramp route failed on its own side.'}, {status: 500, headers: ONRAMP_HEADERS}); }
  };
}
