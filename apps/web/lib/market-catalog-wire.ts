import {marketAssetRefSchema, type MarketCatalogAsset} from './market-assets';

/**
 * Session AJ (item 5, WE16; owner decision D8; owner amendment A4): the coin catalog as the browser needs it. Before
 * this, /api/market-assets sent every asset with its full `ref` object and each token's `platforms` map (contract
 * addresses on every chain), about 5.1 MB raw, on every 24 h refresh. A4 checked what the browser reads: search ranking
 * (WE1: the provider id, the name, the ticker, and the verified list by id), the coin pickers and the asset pages read
 * `ref` (provider, kind, id; an RWA's asset type), `name` and `symbol`; nothing in the browser reads `platforms` (only the
 * server's market evidence does, unchanged). Version 2 sends exactly those, as rows:
 *   coins: [id, name, symbol][]; rwas: [id, name, symbol, assetType][]
 * with a `catalogVersion` (a SHA-256 of the rows) that is also the ETag, so a browser that has the same version gets 304
 * and downloads nothing. A client asks for it with the header below; without it the route answers version 1 as before
 * (an older open tab, and the specs' fixtures, keep working).
 */
export const CATALOG_WIRE_HEADER = 'x-zigoals-catalog';
export const CATALOG_WIRE_VERSION = '2';
type CatalogResult = {assets: readonly MarketCatalogAsset[]; error: string | null; fetchedAt: string | null; stale: boolean};
export type CompactCatalog = {version: 2; catalogVersion: string; error: string | null; fetchedAt: string | null; stale: boolean; coins: [string, string, string][]; rwas: [string, string, string, string][]};
export function compactRows(assets: readonly MarketCatalogAsset[]): Pick<CompactCatalog, 'coins' | 'rwas'> {
  const coins: [string, string, string][] = [], rwas: [string, string, string, string][] = [];
  for (const a of assets) {
    if (a.ref.kind === 'coin') coins.push([a.ref.id, a.name, a.symbol]);
    else rwas.push([a.ref.id, a.name, a.symbol, a.ref.assetType]);
  }
  return {coins, rwas};
}
/** The rows' version: the first 16 hex digits of SHA-256 over their JSON (the same rows give the same version anywhere). */
export async function catalogVersionOf(rows: Pick<CompactCatalog, 'coins' | 'rwas'>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([rows.coins, rows.rwas])));
  return Array.from(new Uint8Array(digest).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}
export async function toCompactCatalog(result: CatalogResult): Promise<CompactCatalog> {
  const rows = compactRows(result.assets);
  return {version: 2, catalogVersion: await catalogVersionOf(rows), error: result.error, fetchedAt: result.fetchedAt, stale: result.stale, ...rows};
}
export const etagOf = (catalogVersion: string) => `"cat-${catalogVersion}"`;
const text = (v: unknown, max: number, min = 0): v is string => typeof v === 'string' && v.length >= min && v.length <= max;
/** The browser's catalog from either answer (version 2 rows, or version 1 `assets`), every row checked; null when not usable. */
export function catalogFromWire(raw: unknown): MarketCatalogAsset[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  if (body.version === 2) {
    const {coins, rwas} = body;
    if (!Array.isArray(coins) || !Array.isArray(rwas) || coins.length + rwas.length > 50_000) return null;
    const out: MarketCatalogAsset[] = [];
    for (const row of coins) {
      if (!Array.isArray(row) || !text(row[1], 300, 1) || !text(row[2], 100)) return null;
      const ref = marketAssetRefSchema.safeParse({provider: 'coingecko', kind: 'coin', id: row[0]}); if (!ref.success) return null;
      out.push({ref: ref.data, name: row[1], symbol: row[2]});
    }
    for (const row of rwas) {
      if (!Array.isArray(row) || !text(row[1], 300, 1) || !text(row[2], 100)) return null;
      const ref = marketAssetRefSchema.safeParse({provider: 'coingecko', kind: 'rwa', id: row[0], assetType: row[3]}); if (!ref.success) return null;
      out.push({ref: ref.data, name: row[1], symbol: row[2]});
    }
    return out;
  }
  const assets = body.assets;
  if (!Array.isArray(assets) || assets.length > 50_000) return null;
  const out: MarketCatalogAsset[] = [];
  for (const row of assets) {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>, ref = marketAssetRefSchema.safeParse(r.ref);
    if (!ref.success || !text(r.name, 300, 1) || !text(r.symbol, 100)) return null;
    out.push({ref: ref.data, name: r.name, symbol: r.symbol});
  }
  return out;
}
