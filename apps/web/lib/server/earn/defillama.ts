import 'server-only';
import * as z from 'zod';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import {DEFILLAMA_SLUGS, type DefillamaData, type DefillamaProtocol, type DefillamaSlug} from '../../earn/live/types';
import {defillamaFailures} from '../../earn/live/ranges.mjs';
import {UpstreamFailure, ensure, getJson, shape, type Fetcher} from './upstream';

/**
 * Session AF (ADR-028 H17, D5 (a); `TIER 3 (egress routes)`): GET /api/earn/defillama. DefiLlama's own figures for the
 * ZIGChain apps, labelled third party wherever they are shown and never ranked, summed or mixed with chain figures: each
 * app's value locked on ZIGChain (`currentChainTvls.ZIGChain` of /protocol/<slug>) with any incident DefiLlama lists for
 * it (date and classification), and DefiLlama's yield pools on ZIGChain for those apps (yields.llama.fi/pools, about
 * 11 MB, filtered to the ZIGChain rows of these five apps). One app's failure leaves the others.
 */
export {DEFILLAMA_SLUGS};
export const PROTOCOL_MAX_CHARS = 4_000_000, POOLS_MAX_CHARS = 24_000_000;
const usd = z.number().finite().nonnegative();
const protocolSchema = z.object({
  name: z.string().max(100),
  currentChainTvls: z.record(z.string().max(60), z.number().finite()).optional(),
  hacks: z.array(z.object({date: z.number().int().positive(), classification: z.string().max(80).nullable().optional(), technique: z.string().max(120).nullable().optional()})).max(20).nullable().optional(),
});
const poolRow = z.object({chain: z.string(), project: z.string(), symbol: z.string().max(60), poolMeta: z.string().max(120).nullable().optional(), pool: z.string().regex(/^[0-9a-f-]{8,64}$/i), tvlUsd: usd.nullable(), apy: z.number().finite().nullable(), apyBase: z.number().finite().nullable().optional(), apyReward: z.number().finite().nullable().optional()});
const source = {name: 'DefiLlama (third party)', origin: 'https://api.llama.fi'};
const failed = (error: unknown) => { if (error instanceof UpstreamFailure) return {status: 'unavailable' as const, reason: error.reason}; throw error; };

export async function readDefillama(fetcher: Fetcher, now: () => number = Date.now): Promise<LiveEnvelope<DefillamaData>> {
  const protocols = await Promise.all(DEFILLAMA_SLUGS.map(async (slug): Promise<[DefillamaSlug, DefillamaProtocol]> => {
    try {
      const p = shape(protocolSchema, (await getJson(fetcher, `https://api.llama.fi/protocol/${slug}`, {maxChars: PROTOCOL_MAX_CHARS})).value);
      const tvl = p.currentChainTvls?.ZIGChain;
      ensure(tvl === undefined || tvl >= 0, 'OUT_OF_RANGE');
      return [slug, {status: 'ok', name: p.name, tvlUsd: tvl ?? null, incidents: (p.hacks ?? []).map(h => ({date: new Date(h.date * 1000).toISOString().slice(0, 10), classification: h.classification ?? null}))}];
    } catch (error) { return [slug, failed(error)]; }
  }));
  let pools: DefillamaData['pools'];
  try {
    const all = shape(z.object({data: z.array(z.unknown()).max(100_000)}), (await getJson(fetcher, 'https://yields.llama.fi/pools', {maxChars: POOLS_MAX_CHARS})).value).data;
    const wanted = new Set<string>(DEFILLAMA_SLUGS);
    // Only the rows this answer shows are checked row by row; the other ~16,000 are not ZIGoals' to judge.
    const rows = all.filter(row => typeof row === 'object' && row !== null && (row as {chain?: unknown}).chain === 'ZIGChain' && wanted.has(String((row as {project?: unknown}).project))).map(row => shape(poolRow, row));
    pools = {status: 'ok', rows: rows.slice(0, 50).map(r => ({pool: r.pool, project: r.project as DefillamaSlug, symbol: r.symbol, label: r.poolMeta ?? null, tvlUsd: r.tvlUsd, apy: r.apy, apyBase: r.apyBase ?? null, apyReward: r.apyReward ?? null}))};
  } catch (error) { pools = failed(error); }
  const fetchedAt = new Date(now()).toISOString(), data: DefillamaData = {thirdParty: true, protocols: Object.fromEntries(protocols) as DefillamaData['protocols'], pools};
  const bad = defillamaFailures(data);
  // A figure outside its range is withdrawn on its own; the rest of DefiLlama's answer stays.
  for (const name of bad) {
    const [kind, id] = name.split(':') as [string, string];
    if (kind === 'tvl') data.protocols[id as DefillamaSlug] = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
    else data.pools = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
  }
  const any = Object.values(data.protocols).some(p => p.status === 'ok') || data.pools.status === 'ok';
  if (!any) { const first = Object.values(data.protocols)[0]!; return liveUnavailable(source, first.status === 'unavailable' ? first.reason : 'UPSTREAM_DOWN', fetchedAt); }
  return liveOk(source, data, {fetchedAt});
}
