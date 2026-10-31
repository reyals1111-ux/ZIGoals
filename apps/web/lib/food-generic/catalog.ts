import * as z from 'zod';

/**
 * Session AK (Part 1c): the offline generic-food library's catalog — which sources exist, their licence and the
 * attribution to show beside every result. It is read from the small static manifest the build writes
 * (`/food-generic/manifest.json`, scripts/food/build-generic-db.mjs, from scripts/food/LICENCES.json), never bundled into
 * route JS: load this module with a dynamic import when the person opens the food search.
 */
export const GENERIC_FOOD_PATH = '/food-generic/';
export const GENERIC_SOURCE_IDS = ['ciqual', 'cofid', 'fineli'] as const;
export type GenericSourceId = typeof GENERIC_SOURCE_IDS[number];
/** The largest source file the app accepts (CIQUAL 2025 is about 0.7 MB); the manifest itself is a few kB. */
export const MAX_SOURCE_BYTES = 4 * 1024 * 1024, MAX_MANIFEST_BYTES = 64 * 1024, MAX_FOODS = 20_000;
const text = (max: number) => z.string().min(1).max(max);
const https = z.string().max(300).refine(v => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }, 'An https link.');
export const genericSourceEntrySchema = z.strictObject({
  source: z.enum(GENERIC_SOURCE_IDS), name: text(200), licence: text(200), licenceUrl: https, attribution: text(300), notice: text(600), link: https,
  datasetVersion: z.string().regex(/^[\w .-]{1,40}$/), file: z.string().regex(/^[a-z]+-v1\.json$/), foods: z.number().int().min(1).max(MAX_FOODS),
  bytes: z.number().int().min(1).max(MAX_SOURCE_BYTES), sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).refine(e => e.file === `${e.source}-v1.json`, 'The file is named after its source.');
export type GenericSourceEntry = z.infer<typeof genericSourceEntrySchema>;
export const genericCatalogSchema = z.strictObject({schemaVersion: z.literal(1), sources: z.array(genericSourceEntrySchema).max(GENERIC_SOURCE_IDS.length)})
  .refine(c => new Set(c.sources.map(s => s.source)).size === c.sources.length, 'Each source once.');
export type GenericCatalog = z.infer<typeof genericCatalogSchema>;

/** A response's text, refused above `limit` bytes (by its length header, then as it streams). */
export async function boundedText(response: Response, limit: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) { await response.body?.cancel(); throw Error('The food library file is larger than expected.'); }
  if (!response.body) return '';
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', {fatal: true}); let size = 0, out = '';
  for (;;) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.length; if (size > limit) { await reader.cancel(); throw Error('The food library file is larger than expected.'); }
    out += decoder.decode(value, {stream: true});
  }
  return out + decoder.decode();
}
/** Same-origin, no credentials, no redirects, no referrer: the library is public static data. */
export const STATIC_FETCH: RequestInit = {method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'};

let pending: Promise<GenericCatalog> | undefined;
/** The catalog, fetched once per page load (a failure is retried on the next call). */
export function loadGenericCatalog(fetcher: typeof fetch = fetch): Promise<GenericCatalog> {
  pending ??= (async () => {
    const response = await fetcher(GENERIC_FOOD_PATH + 'manifest.json', {...STATIC_FETCH, signal: AbortSignal.timeout(15_000)});
    if (!response.ok) { await response.body?.cancel(); throw Error('The food library is unavailable.'); }
    return genericCatalogSchema.parse(JSON.parse(await boundedText(response, MAX_MANIFEST_BYTES)));
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
/** Tests only: forget the fetched catalog. */
export function resetGenericCatalog() { pending = undefined; }
