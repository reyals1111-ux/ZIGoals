import {expect, test, vi} from 'vitest';
import {searchMarketAssets, type MarketCatalogAsset} from './market-assets';
import {catalogFromWire, compactRows, etagOf, toCompactCatalog} from './market-catalog-wire';
import {createCatalogLoader} from './market-catalog-client';
import type {StoredCatalog} from './market-catalog-store';

// Session AJ (item 5, WE16; D8, A4).
const coin = (id: string, name: string, symbol: string): MarketCatalogAsset => ({ref: {provider: 'coingecko', kind: 'coin', id}, name, symbol});
const catalog: MarketCatalogAsset[] = [coin('bitcoin', 'Bitcoin', 'btc'), {...coin('bitcoin-token', 'Bitcoin Token', 'bitcoin'), platforms: {ethereum: '0xabc'}} as MarketCatalogAsset, coin('ethereum', 'Ethereum', 'eth'), {ref: {provider: 'coingecko', kind: 'rwa', id: 'gold', assetType: 'commodity'}, name: 'Gold', symbol: 'xau'}];
test('version 2 keeps every field the browser reads (A4) and drops platforms; it reads back exactly; version 1 still reads', async () => {
  const compact = await toCompactCatalog({assets: catalog, error: null, fetchedAt: '2026-10-29T00:00:00.000Z', stale: false});
  expect(compact.coins).toEqual([['bitcoin', 'Bitcoin', 'btc'], ['bitcoin-token', 'Bitcoin Token', 'bitcoin'], ['ethereum', 'Ethereum', 'eth']]);
  expect(compact.rwas).toEqual([['gold', 'Gold', 'xau', 'commodity']]);
  expect(compact.catalogVersion).toMatch(/^[0-9a-f]{16}$/);
  const back = catalogFromWire(JSON.parse(JSON.stringify(compact)))!;
  expect(back).toEqual(catalog.map(({ref, name, symbol}) => ({ref, name, symbol})));
  expect(catalogFromWire({assets: catalog})).toEqual(back);
  expect(catalogFromWire({version: 2, coins: [['Bad Id!', 'x', 'y']], rwas: []})).toBeNull();
  expect(catalogFromWire({version: 2, coins: [['ok', '', 'y']], rwas: []})).toBeNull();
});
test('WE1 ranking is unchanged on the catalog read back from version 2 (the pinned order: bitcoin before the BITCOIN ticker)', async () => {
  const compact = await toCompactCatalog({assets: catalog, error: null, fetchedAt: null, stale: false});
  const back = catalogFromWire(JSON.parse(JSON.stringify(compact)))!;
  for (const q of ['bitcoin', 'btc', 'eth', 'gold', 'token']) expect(searchMarketAssets(q, back).map(a => a.ref.id)).toEqual(searchMarketAssets(q, catalog).map(a => a.ref.id));
  expect(searchMarketAssets('bitcoin', back).map(a => a.ref.id)).toEqual(['bitcoin', 'bitcoin-token']);
});
test('the same rows give the same version and ETag; other rows another', async () => {
  const a = await toCompactCatalog({assets: catalog, error: null, fetchedAt: 'x', stale: false}), b = await toCompactCatalog({assets: catalog, error: null, fetchedAt: 'y', stale: true});
  expect(a.catalogVersion).toBe(b.catalogVersion);
  expect(etagOf(a.catalogVersion)).toBe(`"cat-${a.catalogVersion}"`);
  expect((await toCompactCatalog({assets: catalog.slice(1), error: null, fetchedAt: null, stale: false})).catalogVersion).not.toBe(a.catalogVersion);
  expect(compactRows([]).coins).toEqual([]);
});
test('the loader: the kept copy first (offline), then 304 when unchanged, a new copy kept when changed, the kept copy when the network fails', async () => {
  const compact = await toCompactCatalog({assets: catalog, error: null, fetchedAt: null, stale: false});
  let kept: StoredCatalog | null = null, now = 1_000_000_000;
  const persistence = {read: async () => kept, write: async (v: StoredCatalog) => { kept = v; }};
  const asked: Record<string, string>[] = [];
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => { const h = init!.headers as Record<string, string>; asked.push(h); return h['If-None-Match'] === `"cat-${compact.catalogVersion}"` ? new Response(null, {status: 304}) : Response.json(compact); });
  const first = createCatalogLoader(fetcher as unknown as typeof fetch, () => now, persistence);
  expect((await first()).length).toBe(4);
  await Promise.resolve(); await Promise.resolve();
  expect(kept!.catalogVersion).toBe(compact.catalogVersion);
  expect(asked[0]).toMatchObject({'x-zigoals-catalog': '2'}); expect(asked[0]!['If-None-Match']).toBeUndefined();
  // A new visit, a day later: the kept copy answers at once is stale, so one conditional request; unchanged: 304.
  now += 25 * 3600_000;
  const second = createCatalogLoader(fetcher as unknown as typeof fetch, () => now, persistence);
  expect((await second()).length).toBe(4);
  expect(asked.at(-1)!['If-None-Match']).toBe(`"cat-${compact.catalogVersion}"`);
  // Offline: the kept copy.
  now += 25 * 3600_000;
  const offline = createCatalogLoader(vi.fn(async () => { throw new TypeError('offline'); }) as unknown as typeof fetch, () => now, persistence);
  expect((await offline()).map(a => a.ref.id)).toEqual(['bitcoin', 'bitcoin-token', 'ethereum', 'gold']);
  // A fresh kept copy: no request at all.
  const quiet = vi.fn(), within = createCatalogLoader(quiet as unknown as typeof fetch, () => kept!.savedAt + 1000, persistence);
  await within(); expect(quiet).not.toHaveBeenCalled();
});
