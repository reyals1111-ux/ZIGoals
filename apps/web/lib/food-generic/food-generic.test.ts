import 'fake-indexeddb/auto';
import {afterEach, describe, expect, test} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {genericCatalogSchema, loadGenericCatalog, resetGenericCatalog, type GenericSourceEntry} from './catalog';
import {GENERIC_FOOD_DATABASE, forgetGenericFoods, readStoredSource, writeStoredSource} from './store';
import {GENERIC_COLUMNS, checkSourceFile, loadGenericLibrary, loadGenericSource, resetGenericSources, type GenericSourceFile} from './load';
import {normaliseFoodText, searchGenericFoods, searchGenericLibrary} from './search';

// Session AK (Part 1c). FIXTURE, not real data: two made-up sources in the build's format (scripts/food/lib/pack.mjs);
// the last block reads the committed library in apps/web/public/food-generic/.
const about = (source: 'ciqual' | 'cofid', foods: GenericSourceFile['foods']) => ({schemaVersion: 1 as const, source, name: `Fixture ${source}`, licence: 'Fixture licence', licenceUrl: 'https://licence.example/', attribution: `Fixture attribution ${source}`, notice: 'Fixture notice', link: `https://${source}.example/`, datasetVersion: '2099', columns: [...GENERIC_COLUMNS], foods});
const N = null;
const FR = about('ciqual', [
  ['1', 'Apple, raw', ['Pomme, crue'], 52, 300, 11400, 200, 2040, 10100, N, N, 107, 5, 0.12, 4.5, N, N, 5, 0, 0.18, N, 0.02, 0.03, 0.1, 0.04, 0, 3.5, 20],
  ['2', 'Crème brûlée', ['Crème brûlée'], 287, 4500],
  ['3', 'Pineapple, raw', ['Ananas, cru'], 50],
  ['4', 'Apple juice', ['Jus de pomme'], 46],
  ['5', 'Baked apple with cinnamon', ['Pomme au four'], 90],
  ['6', 'Cheese, crab apple flavour', [], 300],
]);
const UK = about('cofid', [
  ['14-319', 'Apple, Raw', [], 51, 600, 11600, 500],
  ['14-320', 'Apples, cooking, raw', [], 35],
]);
const bytesOf = (file: unknown) => JSON.stringify(file);
const entryFor = (file: ReturnType<typeof about>, extra: Partial<GenericSourceEntry> = {}): GenericSourceEntry => {
  const bytes = Buffer.from(bytesOf(file));
  return {source: file.source, name: file.name, licence: file.licence, licenceUrl: file.licenceUrl, attribution: file.attribution, notice: file.notice, link: file.link, datasetVersion: file.datasetVersion, file: `${file.source}-v1.json`, foods: file.foods.length, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...extra};
};
function server(files: Record<string, string>) {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input); calls.push(path);
    expect(init).toMatchObject({credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer'});
    const body = files[path];
    return body === undefined ? new Response('missing', {status: 404}) : new Response(body, {headers: {'content-type': 'application/json'}});
  }) as typeof fetch;
  return {fetcher, calls};
}
const library = () => {
  const manifest = {schemaVersion: 1, sources: [entryFor(FR), entryFor(UK)]};
  return {manifest, ...server({'/food-generic/manifest.json': JSON.stringify(manifest), '/food-generic/ciqual-v1.json': bytesOf(FR), '/food-generic/cofid-v1.json': bytesOf(UK)})};
};
afterEach(async () => { resetGenericCatalog(); resetGenericSources(); await forgetGenericFoods(); });

describe('catalog', () => {
  test('the manifest is checked strictly: https links, a file named after its source, each source once, bounded sizes', () => {
    const good = {schemaVersion: 1, sources: [entryFor(FR)]};
    expect(genericCatalogSchema.parse(good)).toEqual(good);
    const one = good.sources[0]!;
    for (const bad of [{...one, link: 'http://ciqual.example/'}, {...one, licenceUrl: 'javascript:alert(1)'}, {...one, file: 'cofid-v1.json'}, {...one, file: '../x-v1.json'}, {...one, bytes: 5 * 1024 * 1024}, {...one, sha256: 'x'}, {...one, source: 'nevo'}, {...one, extra: 1}])
      expect(() => genericCatalogSchema.parse({schemaVersion: 1, sources: [bad]})).toThrow();
    expect(() => genericCatalogSchema.parse({schemaVersion: 1, sources: [one, one]})).toThrow();
    expect(() => genericCatalogSchema.parse({schemaVersion: 2, sources: []})).toThrow();
  });
  test('fetched once per page; a failure is retried on the next call', async () => {
    const {fetcher, calls} = library();
    let fail = true;
    const flaky = (async (input: RequestInfo | URL, init?: RequestInit) => fail ? new Response('down', {status: 503}) : fetcher(input, init)) as typeof fetch;
    await expect(loadGenericCatalog(flaky)).rejects.toThrow('unavailable');
    fail = false;
    expect((await loadGenericCatalog(flaky)).sources.map(s => s.source)).toEqual(['ciqual', 'cofid']);
    await loadGenericCatalog(flaky);
    expect(calls).toEqual(['/food-generic/manifest.json']);
  });
});

describe('store', () => {
  test('one record per source and dataset version; a new version replaces the old; forgetting deletes the database', async () => {
    const record = {version: 1 as const, source: 'ciqual', datasetVersion: '2098', sha256: 'a'.repeat(64), savedAt: 1, data: FR};
    await writeStoredSource(record);
    expect(await readStoredSource('ciqual', '2098')).toEqual(record);
    await writeStoredSource({...record, datasetVersion: '2099', sha256: 'b'.repeat(64)});
    expect(await readStoredSource('ciqual', '2098')).toBeNull();
    expect((await readStoredSource('ciqual', '2099'))?.sha256).toBe('b'.repeat(64));
    await writeStoredSource({...record, source: 'cofid', data: UK});
    expect(await readStoredSource('ciqual', '2099')).not.toBeNull();
    await forgetGenericFoods();
    expect((await indexedDB.databases()).map(d => d.name)).not.toContain(GENERIC_FOOD_DATABASE);
    expect(await readStoredSource('cofid', '2098')).toBeNull();
  });
  test('without IndexedDB: nothing is kept and nothing fails', async () => {
    const saved = globalThis.indexedDB;
    try {
      delete (globalThis as {indexedDB?: unknown}).indexedDB;
      await writeStoredSource({version: 1, source: 'ciqual', datasetVersion: '2099', sha256: 'a'.repeat(64), savedAt: 1, data: FR});
      expect(await readStoredSource('ciqual', '2099')).toBeNull();
      await expect(forgetGenericFoods()).resolves.toBeUndefined();
    } finally { globalThis.indexedDB = saved; }
  });
});

describe('load', () => {
  test('fetched on first use, its checksum and shape checked, then kept: the next page load reads this device', async () => {
    const {manifest, fetcher, calls} = library(), entry = manifest.sources[0]!;
    expect(await loadGenericSource(entry, {fetcher, now: () => 7})).toEqual(FR);
    expect(calls).toEqual(['/food-generic/ciqual-v1.json']);
    expect((await readStoredSource('ciqual', '2099'))?.savedAt).toBe(7);
    resetGenericSources();
    expect(await loadGenericSource(entry, {fetcher})).toEqual(FR);
    expect(calls).toHaveLength(1);
  });
  test('a changed file is refused: another checksum, a larger size, another attribution or count, an extra key, an unknown value', async () => {
    const {manifest} = library(), entry = manifest.sources[0]!;
    const tampered = {...FR, attribution: 'Someone else'};
    for (const [body, e] of [[bytesOf(tampered), entry], [bytesOf(FR), {...entry, bytes: 100}], [bytesOf(tampered), {...entryFor(tampered), attribution: FR.attribution}], [bytesOf(FR), {...entry, foods: 5}]] as const) {
      resetGenericSources();
      await expect(loadGenericSource(e, {fetcher: server({'/food-generic/ciqual-v1.json': body}).fetcher, persist: false})).rejects.toThrow();
    }
    for (const bad of [{...FR, extra: 1}, {...FR, columns: [...GENERIC_COLUMNS].reverse()}, {...FR, foods: [['1', 'Apple', [], -1]]}, {...FR, foods: [['1', 'Apple', [], 'x']]}, {...FR, foods: [['1', 'Apple', [], ...Array(26).fill(1)]]}, {...FR, foods: [...FR.foods, FR.foods[0]]}])
      expect(() => checkSourceFile(bad, entryFor(bad as unknown as typeof FR)), JSON.stringify(bad).slice(0, 80)).toThrow();
  });
  test('without IndexedDB the library still loads (memory only); a source that fails is left out and named', async () => {
    const saved = globalThis.indexedDB;
    try {
      delete (globalThis as {indexedDB?: unknown}).indexedDB;
      const manifest = {schemaVersion: 1, sources: [entryFor(FR), entryFor(UK)]};
      const {fetcher} = server({'/food-generic/manifest.json': JSON.stringify(manifest), '/food-generic/ciqual-v1.json': bytesOf(FR)});
      const loaded = await loadGenericLibrary({fetcher});
      expect(loaded.sources.map(s => s.entry.source)).toEqual(['ciqual']);
      expect(loaded.failed).toEqual(['cofid']);
    } finally { globalThis.indexedDB = saved; }
  });
});

describe('search', () => {
  const sources = [{entry: entryFor(FR), file: FR}, {entry: entryFor(UK), file: UK}];
  test('accents, case and punctuation do not matter', () => {
    expect(normaliseFoodText('  Crème BRÛLÉE, œuf!  ')).toBe('creme brulee oeuf');
    expect(searchGenericFoods('creme brulee', sources).map(r => r.name)).toEqual(['Crème brûlée']);
  });
  test('ranking: exact > prefix > word-prefix > substring; English before an alias; then the shorter name', () => {
    const results = searchGenericFoods('apple', sources);
    expect(results.map(r => [r.name, r.match])).toEqual([['Apple, raw', 'prefix'], ['Apple juice', 'prefix'], ['Apples, cooking, raw', 'prefix'], ['Baked apple with cinnamon', 'word-prefix'], ['Cheese, crab apple flavour', 'word-prefix'], ['Pineapple, raw', 'substring']]);
    expect(searchGenericFoods('apple raw', sources).map(r => [r.name, r.match])).toEqual([['Apple, raw', 'exact'], ['Apples, cooking, raw', 'word-prefix'], ['Pineapple, raw', 'substring']]);
    // A French alias finds the food and is named.
    expect(searchGenericFoods('pomme', sources).map(r => [r.name, r.match, r.matchedAlias])).toEqual([['Apple, raw', 'prefix', 'Pomme, crue'], ['Baked apple with cinnamon', 'prefix', 'Pomme au four'], ['Apple juice', 'word-prefix', 'Jus de pomme']]);
    expect(searchGenericFoods('a', sources)).toEqual([]);
    expect(searchGenericFoods('apple', sources, 2)).toHaveLength(2);
  });
  test('the same English name in two sources is one result with every source; values in the app units, unknown never 0', () => {
    const [apple] = searchGenericFoods('apple, raw', sources);
    expect(apple?.entries.map(e => [e.source, e.id, e.attribution, e.link])).toEqual([['ciqual', '1', 'Fixture attribution ciqual', 'https://ciqual.example/'], ['cofid', '14-319', 'Fixture attribution cofid', 'https://cofid.example/']]);
    expect(apple?.entries[0]).toMatchObject({basis: 'per-100g', nutrients: {kcal: 52, proteinMg: 300, carbsMg: 11400, fatMg: 200, fiberMg: 2040, sugarMg: 10100, potassiumMg: 107, calciumMg: 5, ironMg: 0}, vitamins: {cMg: 5000, dUg: 0, eMg: 180, b12Ug: 0, folateUg: 3500}, more: {magnesiumMg: 4.5, b1Mg: 0.02, b2Mg: 0.03, b3Mg: 0.1, b6Mg: 0.04, omega3Mg: 20}});
    expect(apple?.entries[0]?.nutrients).not.toHaveProperty('sodiumMg');
    expect(apple?.entries[0]?.vitamins).not.toHaveProperty('aUg');
    expect(apple?.entries[1]?.nutrients).toEqual({kcal: 51, proteinMg: 600, carbsMg: 11600, fatMg: 500});
    const [pineapple] = searchGenericFoods('pineapple', sources);
    expect(pineapple?.entries[0]?.nutrients).toEqual({kcal: 50, proteinMg: null, carbsMg: null, fatMg: null});
    expect(pineapple?.entries[0]?.vitamins).toEqual({});
  });
  test('searchGenericLibrary loads on first use and searches only on this device', async () => {
    const {fetcher, calls} = library();
    const {results, failed} = await searchGenericLibrary('apple raw', {fetcher});
    expect(failed).toEqual([]);expect(results[0]?.entries).toHaveLength(2);
    expect(calls).toEqual(['/food-generic/manifest.json', '/food-generic/ciqual-v1.json', '/food-generic/cofid-v1.json']);
    expect(calls.join(' ')).not.toContain('apple');
  });
});

describe('the committed library', () => {
  const dir = new URL('../../public/food-generic/', import.meta.url);
  const files = (path: string) => readFileSync(new URL(path, dir), 'utf8');
  test('every committed source loads strictly and is searchable in English and by its aliases', async () => {
    const manifest = JSON.parse(files('manifest.json'));
    const served = Object.fromEntries([['/food-generic/manifest.json', files('manifest.json')], ...manifest.sources.map((s: GenericSourceEntry) => ['/food-generic/' + s.file, files(s.file)])]);
    const {fetcher} = server(served);
    const loaded = await loadGenericLibrary({fetcher, persist: false});
    expect(loaded.failed).toEqual([]);
    expect(loaded.sources.length).toBe(manifest.sources.length);
    const apple = searchGenericFoods('apple', loaded.sources);
    expect(apple.length).toBeGreaterThan(5);
    for (const result of apple) for (const e of result.entries) { expect(e.attribution.length).toBeGreaterThan(10); expect(e.link).toMatch(/^https:\/\//); }
    if (manifest.sources.some((s: GenericSourceEntry) => s.source === 'ciqual')) expect(searchGenericFoods('pomme', loaded.sources).some(r => r.matchedAlias !== null)).toBe(true);
  }, 30_000);
});
