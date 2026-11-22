import 'fake-indexeddb/auto';
import {afterEach, describe, expect, test} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resetGenericCatalog, type GenericSourceEntry} from './catalog';
import {forgetGenericFoods} from './store';
import {GENERIC_COLUMNS, loadGenericSource, resetGenericSources, type GenericSourceFile} from './load';
import {MORE_COLUMNS, checkMoreFile, moreOf} from './more';
import {entryOf} from './search';
import {sourceExtras} from '../food-scans/match';
import {libraryExtras} from '../food-plus/library-extras';
import {nutrientDay, type ReportContext} from '../health-aa/nutrient-report';
import {emptyNutrientExtras, rememberExtras} from '../health-vitamins/extras';
import {emptyHealthVitamins} from '../health-vitamins/schema';
import {emptyMicroTargets} from '../health-aa/micro';

/** Session AV lane 2 (rest, LEDGER #93; Cronometer's many nutrients): the library's further nutrients, from its side file. FIXTURE data. */
const UK: GenericSourceFile = {schemaVersion: 1, source: 'cofid', name: 'Fixture cofid', licence: 'L', licenceUrl: 'https://l.example/', attribution: 'A', notice: 'N', link: 'https://c.example/', datasetVersion: '2099', columns: [...GENERIC_COLUMNS], foods: [['14-319', 'Apple, Raw', [], 51, 600, 11600, 500], ['14-320', 'Apples, cooking, raw', [], 35]]};
const text = JSON.stringify(UK), sha = createHash('sha256').update(text).digest('hex');
const entry: GenericSourceEntry = {source: 'cofid', name: UK.name, licence: UK.licence, licenceUrl: UK.licenceUrl, attribution: UK.attribution, notice: UK.notice, link: UK.link, datasetVersion: '2099', file: 'cofid-v1.json', foods: 2, bytes: Buffer.byteLength(text), sha256: sha};
const side = (over: Record<string, unknown> = {}) => JSON.stringify({schemaVersion: 1, source: 'cofid', datasetVersion: '2099', main: sha, columns: ['id', ...MORE_COLUMNS], foods: [['14-319', 85_600, 0, null, 1700, 6000, 2300, 0, null, null, null, null, 0, 11, 0.02, null, 0.04, 1, null, 0, 18]], ...over});
function server(files: Record<string, string>) {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => { const path = String(input); calls.push(path); const body = files[path]; return body === undefined ? new Response('missing', {status: 404}) : new Response(body); }) as typeof fetch;
  return {fetcher, calls};
}
afterEach(async () => { resetGenericCatalog(); resetGenericSources(); await forgetGenericFoods(); });

describe('the side file', () => {
  test('read beside the library file; its values land in `more` in mg; the barcode/library path keeps them as extras', async () => {
    const {fetcher, calls} = server({'/food-generic/cofid-v1.json': text, '/food-generic/cofid-more-v1.json': side()});
    const file = await loadGenericSource(entry, {fetcher, persist: false});
    expect(calls).toEqual(['/food-generic/cofid-v1.json', '/food-generic/cofid-more-v1.json']);
    expect(moreOf(file, '14-319')).toMatchObject({waterMg: 85_600, sucroseMg: 2300, phosphorusMg: 11, seleniumUg: 1, caroteneUg: 18});
    const apple = entryOf(file, entry, file.foods[0]!);
    expect(apple.more).toMatchObject({waterMg: 85_600, seleniumUg: 0.001, caroteneUg: 0.018, copperMg: 0.02});
    // Kept as thousandths of a mg: 1 µg of selenium is 1, 85.6 g of water 85,600,000.
    expect(sourceExtras({source: 'CoFID', nutrients: apple.nutrients as Record<string, number | null>, vitamins: apple.vitamins, more: apple.more}).extras).toMatchObject({waterMg: 85_600_000, seleniumUg: 1, caroteneUg: 18, copperMg: 20, phosphorusMg: 11_000});
    expect(libraryExtras(apple).extras.sucroseMg).toBe(2_300_000);
    expect(entryOf(file, entry, file.foods[1]!).more).toEqual({});
  });
  test('missing, broken, too large or for another file: not used, and the library works as before', async () => {
    for (const files of [{} as Record<string, string>, {'/food-generic/cofid-more-v1.json': '{broken'}, {'/food-generic/cofid-more-v1.json': side({main: '0'.repeat(64)})}, {'/food-generic/cofid-more-v1.json': side({columns: ['id', 'waterMg']})}, {'/food-generic/cofid-more-v1.json': 'x'.repeat(1024 * 1024 + 10)}]) {
      resetGenericSources();
      const {fetcher} = server({'/food-generic/cofid-v1.json': text, ...files});
      const file = await loadGenericSource(entry, {fetcher, persist: false});
      expect(file.foods).toHaveLength(2);
      expect(moreOf(file, '14-319')).toBeUndefined();
    }
    expect(() => checkMoreFile(JSON.parse(side({source: 'ciqual'})), entry)).toThrow(/another library file/);
  });
  test('the nutrient report shows them in their own unit, with a reference where there is one (cholesterol as a limit)', () => {
    const extras = rememberExtras(emptyNutrientExtras(), ['health_e-000001'], 'health_f-apple0001', {seleniumUg: 30, waterMg: 85_600_000, cholesterolMg: 150_000}, {id: 'health_e-000001', quantityMilli: 1000});
    const data = {diary: [{id: 'health_e-000001', date: '2026-11-20', meal: 'Breakfast', sourceKind: 'food', sourceId: 'health_f-apple0001', quantityMilli: 1000, snapshot: {name: 'Fixture apple', servingLabel: '100 g', nutrients: {kcal: 52, proteinMg: 300, carbsMg: 11_400, fatMg: 200}}, createdAt: '2026-11-20T08:00:00.000Z'}], recipes: []} as unknown as ReportContext['data'];
    const rows = nutrientDay({data, vitamins: emptyHealthVitamins(), extras, micro: emptyMicroTargets()}, '2026-11-20').filter(r => r.total !== null && r.key.startsWith('extra:'));
    expect(rows.map(r => [r.key, r.total! / r.scale, r.unit, r.reference === null ? null : r.reference / r.scale, r.direction, r.group])).toEqual([
      ['extra:waterMg', 85.6, 'g', null, null, 'More'],
      ['extra:cholesterolMg', 150, 'mg', 300, 'at-most', 'Carbs and fats'],
      ['extra:seleniumUg', 30, 'µg', 55, 'at-least', 'Minerals'],
    ]);
  });
});

test('the committed side file: CoFID 2021, bound to the committed CoFID file, every food in it', () => {
  const dir = new URL('../../public/food-generic/', import.meta.url), manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));
  const cofid = manifest.sources.find((s: GenericSourceEntry) => s.source === 'cofid');
  const map = checkMoreFile(JSON.parse(readFileSync(new URL('cofid-more-v1.json', dir), 'utf8')), cofid);
  expect(map.size).toBeGreaterThan(2000);
  const ids = new Set(JSON.parse(readFileSync(new URL('cofid-v1.json', dir), 'utf8')).foods.map((f: unknown[]) => f[0]));
  for (const id of map.keys()) expect(ids.has(id)).toBe(true);
});
