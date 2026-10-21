import 'server-only';
import * as z from 'zod';
import {PROVIDER_USER_AGENT} from '../../server/provider-user-agent';
import {OFFERED_RAMP_CODES, RAMP_ASSETS_SOURCE, rampAssetsWire, type RampAssets} from '../ramp-assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H16 (d), H35, H58, H89; `TIER 3 (egress routes)`): the server read behind
 * `GET /api/onramps/ramp-assets`. Egress to `https://api.rampnetwork.com` only (server-only, never in connect-src), one plain
 * GET with no person's data at all (the currency code is the only parameter), no credentials, no referrer, no redirect
 * followed, 12 s, at most 512 kB. Cached one hour per currency; on a failure the last good list is served (with its own
 * "as of") for up to a day, else `status: 'unavailable'` with a reason, HTTP 200 (H58). At most 12 upstream loads per hour
 * per server instance; a failure is remembered 60 s. Nothing is logged.
 */
export const RAMP_EGRESS = 'https://api.rampnetwork.com';
export const FRESH_MS = 60 * 60 * 1000, STALE_MS = 24 * 60 * 60 * 1000, FAILURE_MS = 60 * 1000, LOADS_PER_HOUR = 12, MAX_CHARS = 512 * 1024;
type Currency = 'USD' | 'EUR';
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const upstream = z.object({
  currencyCode: z.string(), minFeePercent: z.number(), maxFeePercent: z.number(), minFeeAmount: z.number(), minPurchaseAmount: z.number(), maxPurchaseAmount: z.number(),
  assets: z.array(z.looseObject({symbol: z.string().max(16), chain: z.string().max(16), enabled: z.boolean(), hidden: z.boolean().optional(), minPurchaseAmount: z.number().nullable().optional(), maxPurchaseAmount: z.number().nullable().optional(), networkFee: z.number().nullable().optional()})).max(2000),
}).loose();
type Failure = Extract<RampAssets, {status: 'unavailable'}>['reason'];
class Unavailable extends Error { constructor(readonly reason: Failure) { super(reason); } }
const clean = (n: number | null | undefined) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
export async function loadRampAssets(currency: Currency, fetcher: Fetcher, now: () => Date = () => new Date()): Promise<Extract<RampAssets, {status: 'ok'}>> {
  const url = `${RAMP_ASSETS_SOURCE}?currencyCode=${currency}`;
  if (new URL(url).origin !== RAMP_EGRESS) throw Error('Refusing an upstream outside the on-ramp egress list.');
  let response: Response;
  try { response = await fetcher(url, {method: 'GET', headers: {accept: 'application/json', 'user-agent': PROVIDER_USER_AGENT}, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(12_000)}); }
  catch (error) { throw new Unavailable(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'TIMEOUT' : 'UPSTREAM_DOWN'); }
  if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Unavailable('UPSTREAM_DOWN'); }
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_CHARS) { void response.body?.cancel().catch(() => {}); throw new Unavailable('TOO_LARGE'); }
  let text: string;
  try { text = await response.text(); } catch { throw new Unavailable('UPSTREAM_DOWN'); }
  if (text.length > MAX_CHARS) throw new Unavailable('TOO_LARGE');
  let parsed: z.infer<typeof upstream>;
  try { parsed = upstream.parse(JSON.parse(text)); } catch { throw new Unavailable('MALFORMED'); }
  if (parsed.currencyCode !== currency) throw new Unavailable('MALFORMED');
  const assets = parsed.assets.flatMap(a => {
    const code = `${a.chain}_${a.symbol}`.toUpperCase();
    return OFFERED_RAMP_CODES.has(code) ? [{code, enabled: a.enabled && !a.hidden, minPurchaseAmount: clean(a.minPurchaseAmount), maxPurchaseAmount: clean(a.maxPurchaseAmount), networkFee: clean(a.networkFee)}] : [];
  });
  const fees = {minFeePercent: clean(parsed.minFeePercent), maxFeePercent: clean(parsed.maxFeePercent), minFeeAmount: clean(parsed.minFeeAmount), minPurchaseAmount: clean(parsed.minPurchaseAmount), maxPurchaseAmount: clean(parsed.maxPurchaseAmount)};
  if (Object.values(fees).some(v => v === null)) throw new Unavailable('MALFORMED');
  const answer = {version: 1 as const, status: 'ok' as const, source: RAMP_ASSETS_SOURCE, currency, asOf: now().toISOString(), fees: fees as {[K in keyof typeof fees]: number}, assets: [...new Map(assets.map(a => [a.code, a])).values()]};
  return rampAssetsWire.parse(answer) as Extract<RampAssets, {status: 'ok'}>;
}
/** One cache per server instance: one hour fresh, a day of last-good on failure, a failure memory, an hourly load limit. */
export function rampAssetsService(fetcher: Fetcher = (input, init) => fetch(input, init), now: () => Date = () => new Date()) {
  const cache = new Map<Currency, {at: number; value: Extract<RampAssets, {status: 'ok'}>}>(), failed = new Map<Currency, {at: number; reason: Failure}>(), loads: number[] = [];
  return async (currency: Currency): Promise<RampAssets> => {
    const t = now().getTime(), hit = cache.get(currency);
    if (hit && t - hit.at < FRESH_MS) return hit.value;
    const stale = (reason: Failure): RampAssets => hit && t - hit.at < STALE_MS ? hit.value : {version: 1, status: 'unavailable', source: RAMP_ASSETS_SOURCE, currency, reason};
    const miss = failed.get(currency);
    if (miss && t - miss.at < FAILURE_MS) return stale(miss.reason);
    while (loads.length && t - loads[0]! > 60 * 60 * 1000) loads.shift();
    if (loads.length >= LOADS_PER_HOUR) return stale('RATE_LIMITED');
    loads.push(t);
    try { const value = await loadRampAssets(currency, fetcher, now); cache.set(currency, {at: t, value}); failed.delete(currency); return value; }
    catch (error) { const reason: Failure = error instanceof Unavailable ? error.reason : 'UPSTREAM_DOWN'; failed.set(currency, {at: t, reason}); return stale(reason); }
  };
}
