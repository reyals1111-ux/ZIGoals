import 'server-only';
import type {LiveEnvelope, LiveSource} from '../../earn/live/envelope';
import {marketClientGroup} from '../market-client-address';
import {earnRelay, type RelayOptions} from './cache';
import {chainSource, readChain} from './chain';
import {readDefillama} from './defillama';
import {readOroswap} from './oroswap';
import {readValdora} from './valdora';
import type {Fetcher, LcdNetwork} from './upstream';

/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): the four /api/earn/* GET handlers, on the positions relay's
 * pattern. The query is strict (only the named key, once, from its list; anything else is 400). A source that fails is a
 * 200 `unavailable` body (H58); too many requests from one client is 429 with Retry-After; only a fault of the route
 * itself is 500. Every answer is `no-store` with no referrer. The client group (cf-connecting-ip) is only counted in
 * memory, never stored or forwarded.
 */
export const EARN_HEADERS = Object.freeze({'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'});
type Query = Record<string, string>;
export type EarnRouteOptions<T> = {allowed: Readonly<Record<string, readonly string[]>>; relay: RelayOptions; key: (q: Query) => string; source: (q: Query) => LiveSource; read: (q: Query) => Promise<LiveEnvelope<T>>};
export function earnGet<T>({allowed, relay: options, key, source, read}: EarnRouteOptions<T>) {
  const relay = earnRelay<T>(options);
  return async function GET(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams, query: Query = {};
    const keys = [...params.keys()];
    const valid = keys.every(k => Object.hasOwn(allowed, k)) && Object.entries(allowed).every(([k, values]) => params.getAll(k).length === 1 && values.includes(params.get(k)!));
    if (!valid) return Response.json({error: `Expected ${Object.keys(allowed).length ? Object.entries(allowed).map(([k, v]) => `${k}=${v.join('|')}`).join('&') : 'no query'}.`}, {status: 400, headers: EARN_HEADERS});
    for (const k of Object.keys(allowed)) query[k] = params.get(k)!;
    try {
      const answer = await relay(key(query), marketClientGroup(request.headers.get('cf-connecting-ip')), source(query), () => read(query));
      return Response.json(answer.body, {status: answer.status, headers: answer.retryAfter ? {...EARN_HEADERS, 'Retry-After': String(answer.retryAfter)} : EARN_HEADERS});
    } catch {
      return Response.json({error: 'The Earn data route failed on its own side.'}, {status: 500, headers: EARN_HEADERS});
    }
  };
}
const MIN = 60_000;
/** TTLs: chain parameters, Valdora and OroSwap 2 minutes (stale up to 10); DefiLlama 5 minutes (stale up to 60). */
export const EARN_TTLS = Object.freeze({chain: 2 * MIN, valdora: 2 * MIN, oroswap: 2 * MIN, defillama: 5 * MIN});
export function chainRoute(fetcher: Fetcher = (input, init) => fetch(input, init), now?: () => number) {
  return earnGet({allowed: {network: ['mainnet', 'testnet']}, relay: {ttlMs: EARN_TTLS.chain, staleMs: 10 * MIN, now}, key: q => `chain:${q.network}`, source: q => chainSource(q.network as LcdNetwork), read: q => readChain(fetcher, q.network as LcdNetwork, now)});
}
export function valdoraRoute(fetcher: Fetcher = (input, init) => fetch(input, init), now?: () => number) {
  return earnGet({allowed: {}, relay: {ttlMs: EARN_TTLS.valdora, staleMs: 10 * MIN, now}, key: () => 'valdora', source: () => chainSource('mainnet'), read: () => readValdora(fetcher, now)});
}
export function oroswapRoute(fetcher: Fetcher = (input, init) => fetch(input, init), now?: () => number) {
  return earnGet({allowed: {}, relay: {ttlMs: EARN_TTLS.oroswap, staleMs: 10 * MIN, now}, key: () => 'oroswap', source: () => chainSource('mainnet'), read: () => readOroswap(fetcher, now)});
}
export function defillamaRoute(fetcher: Fetcher = (input, init) => fetch(input, init), now?: () => number) {
  return earnGet({allowed: {}, relay: {ttlMs: EARN_TTLS.defillama, staleMs: 60 * MIN, failMs: 60_000, now}, key: () => 'defillama', source: () => ({name: 'DefiLlama (third party)', origin: 'https://api.llama.fi'}), read: () => readDefillama(fetcher, now)});
}
