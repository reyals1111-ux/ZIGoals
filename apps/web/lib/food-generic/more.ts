import * as z from 'zod';
import {GENERIC_FOOD_PATH, STATIC_FETCH, boundedText, type GenericSourceEntry, type GenericSourceId} from './catalog';

/**
 * Session AV lane 2 (rest, LEDGER #93; Cronometer's many nutrients): the further nutrients a source carries — water,
 * starch, the sugars one by one, mono- and polyunsaturated, omega-6 and trans fats, cholesterol, phosphorus, copper,
 * chloride, manganese, selenium, iodine, retinol, carotene, pantothenate and biotin — in a side file beside the library
 * file (`/food-generic/<source>-more-v1.json`, scripts/food/lib/pack.mjs `packMore`), so the library file, its manifest
 * and every released reader are untouched. The side file names the library file it belongs to by its SHA-256 (`main`),
 * which must be the manifest's; a side file that is missing, too large, of another shape or for another file is simply
 * not used (the library works as before). Read alongside the library file; values per 100 g, mg or µg as named.
 */
export const MORE_COLUMNS = ['waterMg', 'starchMg', 'alcoholMg', 'glucoseMg', 'fructoseMg', 'sucroseMg', 'lactoseMg', 'monoFatMg', 'polyFatMg', 'omega6Mg', 'transFatMg', 'cholesterolMg', 'phosphorusMg', 'copperMg', 'chlorideMg', 'manganeseMg', 'seleniumUg', 'iodineUg', 'retinolUg', 'caroteneUg', 'pantothenateMg', 'biotinUg'] as const;
export type MoreColumn = typeof MORE_COLUMNS[number];
/** The sources whose build wrote a side file (CoFID: its workbook carries them; CIQUAL's build needs its source online). */
export const GENERIC_MORE_FILES: Partial<Record<GenericSourceId, {file: string; maxBytes: number}>> = {cofid: {file: 'cofid-more-v1.json', maxBytes: 1024 * 1024}};
const value = z.number().finite().min(0).max(100_000_000).nullable();
export const genericMoreFileSchema = z.strictObject({
  schemaVersion: z.literal(1), source: z.string(), datasetVersion: z.string(), main: z.string().regex(/^[0-9a-f]{64}$/),
  columns: z.array(z.string()).refine(c => c.length === MORE_COLUMNS.length + 1 && c[0] === 'id' && MORE_COLUMNS.every((v, i) => c[i + 1] === v), 'Unknown columns.'),
  foods: z.array(z.tuple([z.string().regex(/^[\w.-]{1,24}$/)], value).refine(r => r.length <= MORE_COLUMNS.length + 1, 'Too many values in a food.')).max(20_000),
});
export type GenericMoreValues = Partial<Record<MoreColumn, number>>;
/** The side file checked against the library file's manifest entry; its rows by food id, unknowns left out. */
export function checkMoreFile(raw: unknown, entry: Pick<GenericSourceEntry, 'source' | 'datasetVersion' | 'sha256'>): Map<string, GenericMoreValues> {
  const file = genericMoreFileSchema.parse(raw);
  if (file.source !== entry.source || file.datasetVersion !== entry.datasetVersion || file.main !== entry.sha256) throw Error('The further nutrients belong to another library file.');
  const out = new Map<string, GenericMoreValues>();
  for (const [id, ...values] of file.foods) {
    const v: GenericMoreValues = {};
    values.forEach((x, i) => { if (typeof x === 'number') v[MORE_COLUMNS[i]!] = x; });
    if (Object.keys(v).length) out.set(id, v);
  }
  return out;
}
/** The further nutrients of each loaded library file (kept beside it for the page's life). */
const attached = new WeakMap<object, Map<string, GenericMoreValues>>();
export const moreOf = (file: object, id: string): GenericMoreValues | undefined => attached.get(file)?.get(id);
/** Fetches and attaches a source's side file, when it has one; never throws (without it the library is as before). */
export async function attachMore(file: object, entry: GenericSourceEntry, fetcher: typeof fetch = fetch): Promise<void> {
  const about = GENERIC_MORE_FILES[entry.source];
  if (!about || attached.has(file)) return;
  try {
    const response = await fetcher(GENERIC_FOOD_PATH + about.file, {...STATIC_FETCH, signal: AbortSignal.timeout(15_000)});
    if (!response.ok) { await response.body?.cancel(); return; }
    attached.set(file, checkMoreFile(JSON.parse(await boundedText(response, about.maxBytes)), entry));
  } catch { /* not used */ }
}
/** Tests: attach values directly. */
export const attachMoreForTests = (file: object, values: Map<string, GenericMoreValues>) => { attached.set(file, values); };
