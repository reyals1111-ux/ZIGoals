import * as z from 'zod';
import {GENERIC_FOOD_PATH, GENERIC_SOURCE_IDS, MAX_FOODS, STATIC_FETCH, boundedText, loadGenericCatalog, type GenericSourceEntry} from './catalog';
import {readStoredSource, writeStoredSource} from './store';

/**
 * Session AK (Part 1c): one source of the offline generic-food library, loaded on first use. The kept copy in IndexedDB
 * (store.ts) is used when its SHA-256 is the manifest's; otherwise `/food-generic/<source>-v1.json` is fetched (same
 * origin, size-capped by the manifest), its SHA-256 checked against the manifest, its shape checked strictly, and the copy
 * kept. Without IndexedDB the parsed file stays in memory for the page's life. The file's format is documented in
 * scripts/food/lib/pack.mjs: a `columns` header and one array per food, unknown values null (never 0).
 */
export const GENERIC_COLUMNS = ['id', 'nameEn', 'aliases', 'kcal', 'proteinMg', 'carbsMg', 'fatMg', 'fiberMg', 'sugarMg', 'satFatMg', 'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'magnesiumMg', 'zincMg', 'vitAUg', 'vitCMg', 'vitDUg', 'vitEMg', 'vitKUg', 'b1Mg', 'b2Mg', 'b3Mg', 'b6Mg', 'b12Ug', 'folateUg', 'omega3Mg'] as const;
export type GenericNutrientColumn = Exclude<typeof GENERIC_COLUMNS[number], 'id' | 'nameEn' | 'aliases'>;
export const GENERIC_NUTRIENT_COLUMNS = GENERIC_COLUMNS.slice(3) as GenericNutrientColumn[];
const value = z.number().finite().min(0).max(100_000_000).nullable();
const name = z.string().min(1).max(160);
const row = z.tuple([z.string().regex(/^[\w.-]{1,24}$/), name, z.array(name).max(8)], value).refine(r => r.length <= GENERIC_COLUMNS.length, 'Too many values in a food.');
export const genericSourceFileSchema = z.strictObject({
  schemaVersion: z.literal(1), source: z.enum(GENERIC_SOURCE_IDS), name: z.string(), licence: z.string(), licenceUrl: z.string(), attribution: z.string(), notice: z.string(), link: z.string(), datasetVersion: z.string(),
  columns: z.array(z.string()).refine(c => c.length === GENERIC_COLUMNS.length && c.every((v, i) => v === GENERIC_COLUMNS[i]), 'Unknown columns.'),
  foods: z.array(row).min(1).max(MAX_FOODS),
});
export type GenericSourceFile = z.infer<typeof genericSourceFileSchema>;

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** The file checked against its manifest entry: shape, the same source, version and attribution, the food count. */
export function checkSourceFile(raw: unknown, entry: GenericSourceEntry): GenericSourceFile {
  const file = genericSourceFileSchema.parse(raw);
  for (const key of ['source', 'name', 'licence', 'licenceUrl', 'attribution', 'notice', 'link', 'datasetVersion'] as const)
    if (file[key] !== entry[key]) throw Error(`The food library file does not match its catalog (${key}).`);
  if (file.foods.length !== entry.foods || new Set(file.foods.map(f => f[0])).size !== file.foods.length) throw Error('The food library file does not match its catalog (foods).');
  return file;
}
export type SourceLoaderOptions = {fetcher?: typeof fetch; persist?: boolean; now?: () => number};
const memory = new Map<string, Promise<GenericSourceFile>>();
/** One source, from memory, this device's copy, or the network (in that order). A failure is retried on the next call. */
export function loadGenericSource(entry: GenericSourceEntry, options: SourceLoaderOptions = {}): Promise<GenericSourceFile> {
  const key = `${entry.source}@${entry.datasetVersion}#${entry.sha256}`, known = memory.get(key);
  if (known) return known;
  const {fetcher = fetch, persist = true, now = Date.now} = options;
  const loading = (async () => {
    if (persist) {
      const kept = await readStoredSource(entry.source, entry.datasetVersion).catch(() => null);
      if (kept && kept.sha256 === entry.sha256) { try { return checkSourceFile(kept.data, entry); } catch { /* fetch afresh below */ } }
    }
    const response = await fetcher(GENERIC_FOOD_PATH + entry.file, {...STATIC_FETCH, signal: AbortSignal.timeout(60_000)});
    if (!response.ok) { await response.body?.cancel(); throw Error('The food library is unavailable.'); }
    const text = await boundedText(response, entry.bytes);
    if (await sha256Hex(text) !== entry.sha256) throw Error('The food library file does not match its catalog (checksum).');
    const file = checkSourceFile(JSON.parse(text), entry);
    if (persist) await writeStoredSource({version: 1, source: entry.source, datasetVersion: entry.datasetVersion, sha256: entry.sha256, savedAt: now(), data: file}).catch(() => {});
    return file;
  })();
  memory.set(key, loading);
  loading.catch(() => { if (memory.get(key) === loading) memory.delete(key); });
  return loading;
}
/** Every source in the catalog; a source that fails is left out (and named in `failed`), so the others still search. */
export async function loadGenericLibrary(options: SourceLoaderOptions = {}) {
  const catalog = await loadGenericCatalog(options.fetcher);
  const settled = await Promise.allSettled(catalog.sources.map(entry => loadGenericSource(entry, options)));
  return {
    sources: catalog.sources.flatMap((entry, i) => settled[i]!.status === 'fulfilled' ? [{entry, file: (settled[i] as PromiseFulfilledResult<GenericSourceFile>).value}] : []),
    failed: catalog.sources.filter((_, i) => settled[i]!.status === 'rejected').map(entry => entry.source),
  };
}
export type LoadedGenericSource = {entry: GenericSourceEntry; file: GenericSourceFile};
/** Tests only: forget what this page loaded. */
export function resetGenericSources() { memory.clear(); }
