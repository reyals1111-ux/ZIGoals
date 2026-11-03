import {describe, test, expect} from 'vitest';
import {createHash} from 'node:crypto';
import {cp, mkdtemp, readFile, readdir, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';
import {crcStep} from '../../apps/web/lib/import/zip-stream.ts';
import {assertPlainXml, decodeXml} from './lib/xml.mjs';
import {columnIndex, openXlsx} from './lib/xlsx.mjs';
import {COLUMNS, decimal, pack, rounded, serialise, sig3} from './lib/pack.mjs';
import {csvText, parseCsv, readCiqual, readCofid, readFineli} from './lib/sources.mjs';
import {build, parseArgs, readLicences} from './build-generic-db.mjs';

// Session AK Part 1c. Everything here reads the SYNTHETIC files in scripts/food/fixtures/ (see its README); the last
// test checks the committed library in apps/web/public/food-generic/ against its manifest.
const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));
const at = (/** @type {string} */ p) => readFile(join(FIX, p));
/** A ZIP archive of `files` (name → bytes), deflated, as a test-only writer. @param {Record<string,Uint8Array>} files */
function zip(files) {
  const locals = [], central = []; let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const nameBytes = Buffer.from(name), packed = deflateRawSync(data), crc = (crcStep(0xFFFFFFFF, data) ^ 0xFFFFFFFF) >>> 0;
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034B50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8); head.writeUInt32LE(crc, 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBytes.length, 26);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014B50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nameBytes.length, 28); dir.writeUInt32LE(offset, 42);
    locals.push(head, nameBytes, packed); central.push(dir, nameBytes); offset += 30 + nameBytes.length + packed.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054B50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, ...central, end]));
}
/** The fixture workbook's parts, zipped into an .xlsx; `change` may replace a part's text. @param {(name:string,text:string)=>string} [change] */
async function workbook(change = (_, t) => t) {
  const root = join(FIX, 'cofid-xlsx'), files = {};
  const walk = async (/** @type {string} */ dir) => { for (const e of await readdir(dir, {withFileTypes: true})) { const p = join(dir, e.name); if (e.isDirectory()) await walk(p); else { const name = relative(root, p).split('\\').join('/'); files[name] = new Uint8Array(Buffer.from(change(name, await readFile(p, 'utf8')))); } } };
  await walk(root); return zip(files);
}
const ciqualFiles = async () => ({alim: new Uint8Array(await at('ciqual/alim_2099_01_01.xml')), compo: new Uint8Array(await at('ciqual/compo_2099_01_01.xml')), constituents: new Uint8Array(await at('ciqual/const_2099_01_01.xml'))});
const fineliFiles = async () => new Map(await Promise.all(['component.csv', 'component_value.csv', 'food.csv', 'foodname_EN.csv'].map(async n => [n.toLowerCase(), new Uint8Array(await at('fineli/' + n))])));
const byId = (/** @type {{foods:any[]}} */ r) => Object.fromEntries(r.foods.map(f => [f.id, f]));

describe('strict XML and XLSX reading', () => {
  test('only the five predefined entities and numeric references; a DTD, an entity declaration or CDATA is refused', () => {
    expect(decodeXml('Fish &amp; chips &lt;3 &#233;&#x00E9; &quot;&apos;')).toBe('Fish & chips <3 éé "\'');
    for (const bad of ['&nbsp;', '&xxe;', '&#0;', '&#xD800;', 'a & b']) expect(() => decodeXml(bad), bad).toThrow();
    for (const bad of ['<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><x/>', '<x><![CDATA[y]]></x>', '<?xml version="1.0"?><?evil x?><x/>']) expect(() => assertPlainXml(bad, 'fixture')).toThrow();
    expect(() => assertPlainXml('<?xml version="1.0"?><!-- note --><x/>', 'fixture')).not.toThrow();
  });
  test('cells: shared, inline and rich strings, numbers, blanks kept in place; column letters', async () => {
    const wb = await openXlsx(await workbook());
    expect(wb.sheetNames()).toEqual(['1.1 Notes', '1.3 Proximates', '1.4 Inorganics', '1.5 Vitamins']);
    expect(await wb.rows('1.1 Notes')).toEqual([[], [null, 'SYNTHETIC fixture notes']]);
    const rows = await wb.rows('1.3 Proximates');
    expect(rows[0]?.slice(0, 4)).toEqual(['Food Code', 'Food Name', 'Description', 'Group']);
    expect(rows[1]?.slice(0, 8)).toEqual([null, null, null, null, null, null, null, 'PROT']);
    expect(rows[5]?.slice(0, 9)).toEqual(['50-003', 'Fixture cheddar & cress', 'Fixture description', 'BL', 123, 'Fixture reference', null, '25.4', 34.9]);
    expect([columnIndex('A'), columnIndex('Z'), columnIndex('AA'), columnIndex('AZ')]).toEqual([0, 25, 26, 51]);
    expect(() => columnIndex('a1')).toThrow();
  });
  test('a sheet with a DTD, a worksheet outside xl/worksheets, a bad shared-string index or too many rows is refused', async () => {
    await expect(openXlsx(await workbook((n, t) => n === 'xl/sharedStrings.xml' ? t.replace('<sst', '<!DOCTYPE sst [<!ENTITY lol "lol">]><sst') : t))).rejects.toThrow('DTD');
    await expect(openXlsx(await workbook((n, t) => n === 'xl/_rels/workbook.xml.rels' ? t.replace('worksheets/sheet1.xml', '../../etc/passwd') : t))).rejects.toThrow('Unexpected worksheet path');
    const badIndex = await openXlsx(await workbook((n, t) => n === 'xl/worksheets/sheet1.xml' ? t.replace('<c r="A1" t="s"><v>0</v>', '<c r="A1" t="s"><v>99999</v>') : t));
    await expect(badIndex.rows('1.3 Proximates')).rejects.toThrow('shared string');
    const small = await openXlsx(await workbook(), {rows: 3});
    await expect(small.rows('1.3 Proximates')).rejects.toThrow('rows');
    await expect(openXlsx(new Uint8Array(100))).rejects.toThrow();
  });
});

describe('the sources', () => {
  test('CIQUAL: comma decimals; "-", traces and "<" values unknown; vitamin E falls back to alpha-tocopherol; omega-3 only when ALA, EPA and DHA are known; French aliases', async () => {
    const foods = byId(readCiqual(await ciqualFiles()));
    expect(foods['990001']).toEqual({id: '990001', nameEn: 'Fixture apple, raw', aliases: ['Pomme fictive, crue'], values: expect.objectContaining({kcal: 52, proteinMg: 300, carbsMg: 11400, fatMg: null, fiberMg: 2040, sugarMg: 10100, satFatMg: null, sodiumMg: null, potassiumMg: 107, magnesiumMg: null, vitCMg: 5, vitEMg: 0.18, omega3Mg: 20})});
    expect(foods['990002']?.nameEn).toBe('Fixture salmon & dill');
    expect(foods['990002']?.values).toEqual(expect.objectContaining({vitEMg: 1.2, vitDUg: 10.9, b12Ug: 3.2, omega3Mg: null, satFatMg: 3050}));
    expect(foods['990003']?.nameEn).toBe('');
  });
  test('CIQUAL: a constituent in another unit, or missing, is refused rather than converted by a guess', async () => {
    const files = await ciqualFiles(), text = Buffer.from(files.constituents).toString('utf8');
    await expect(async () => readCiqual({...files, constituents: new Uint8Array(Buffer.from(text.replace('Protein (g/100g)', 'Protein (mg/100g)')))})).rejects.toThrow('25000');
    await expect(async () => readCiqual({...files, constituents: new Uint8Array(Buffer.from(text.replace(/<CONST><const_code> 10300 <\/const_code>.*?<\/CONST>/, '')))})).rejects.toThrow('10300');
  });
  test('CoFID: units checked, "Tr" and "N" unknown, alcoholic drinks (per 100 ml) left out, a repeated code kept once', async () => {
    const read = await readCofid(await workbook()), foods = byId(read);
    expect(Object.keys(foods)).toEqual(['50-001', '50-003']);
    expect(foods['50-001']).toEqual({id: '50-001', nameEn: 'Fixture oat porridge, made with water', aliases: [], values: expect.objectContaining({kcal: 49, proteinMg: 1500, carbsMg: 9000, fiberMg: 800, omega3Mg: 30, sodiumMg: 3, ironMg: 0.5, vitKUg: null, b1Mg: 0.05})});
    expect(foods['50-003']?.values).toEqual(expect.objectContaining({fatMg: 34900, kcal: 416, fiberMg: null, omega3Mg: null, vitAUg: null, vitCMg: null, b12Ug: 1.1, folateUg: 26}));
    expect(read.notes[0]).toBe('1 alcoholic drinks (per 100 ml) left out.');
    await expect(readCofid(await workbook((n, t) => n === 'xl/worksheets/sheet2.xml' ? t.replace('Sodium (mg)', 'Sodium (g)') : t))).rejects.toThrow('not in mg');
  });
  test('Fineli: kJ to kcal, units from component.csv, Finnish aliases, Windows-1252 text; an unknown unit is refused', async () => {
    const foods = byId(readFineli(await fineliFiles()));
    expect(foods['99001']).toEqual({id: '99001', nameEn: 'Fixture oat flakes', aliases: ['KAURAHIUTALE, FIKTIIVINEN'], values: expect.objectContaining({kcal: 1569 / 4.184, proteinMg: 12500, fatMg: 7100, omega3Mg: 120, ironMg: 3.9, folateUg: 56})});
    expect(foods['99002']).toEqual(expect.objectContaining({nameEn: 'Fixture herring, boiled', aliases: ['SILAKKA; FIKTIIVINEN, KYPSENNETTY']}));
    expect(foods['99002']?.values.fatMg).toBeNull();
    expect(foods['99003']?.nameEn).toBe('');
    expect(csvText(new Uint8Array([0x50, 0xE4, 0xE4]))).toBe('Pää');
    expect(parseCsv('A;B\r\n1;"x;""y"""\r\n')).toEqual([{A: '1', B: 'x;"y"'}]);
    const files = await fineliFiles();
    files.set('component.csv', new Uint8Array(Buffer.from(Buffer.from(files.get('component.csv') ?? []).toString().replace('VITD;UG', 'VITD;IU'))));
    expect(() => readFineli(files)).toThrow('VITD');
  });
});

describe('packing', () => {
  test('rounding: kcal whole, gram nutrients whole mg at 3 significant figures, others 3 significant figures; implausible values unknown', () => {
    expect([rounded('kcal', 52.5), rounded('proteinMg', 12345.6), rounded('ironMg', 0.12345), rounded('vitDUg', 10.94), rounded('kcal', 1200), rounded('fatMg', -1), rounded('sodiumMg', null)]).toEqual([53, 12300, 0.123, 10.9, null, null, null]);
    expect([sig3(0), sig3(123456), sig3(0.0001234)]).toEqual([0, 123000, 0.000123]);
    expect([decimal('1,5'), decimal('2.25'), decimal('< 0,5'), decimal('traces'), decimal('-'), decimal('Tr'), decimal('N'), decimal(''), decimal(3)]).toEqual([1.5, 2.25, null, null, null, null, null, null, 3]);
  });
  test('rows in column order; trailing unknowns left off; no English name or a repeated id skipped; serialised as valid JSON', () => {
    const about = {source: 'x', name: 'X', licence: 'L', licenceUrl: 'https://l.example/', attribution: 'A', notice: 'N', link: 'https://x.example/', datasetVersion: '1'};
    const {json, skipped} = pack(about, [
      {id: '1', nameEn: '  Fixture\u0007  bread ', aliases: ['Pain fictif', 'fixture bread', ''], values: {kcal: 250.4, proteinMg: 8000}},
      {id: '1', nameEn: 'Repeated', aliases: [], values: {}}, {id: '2', nameEn: '', aliases: ['Sans nom'], values: {}},
      {id: '3', nameEn: 'Fixture water', aliases: [], values: {}}, {id: '4', nameEn: 'Fixture oil', aliases: [], values: {fatMg: 100000, omega3Mg: 9000}},
    ]);
    expect(skipped).toBe(2);
    expect(json.columns).toEqual(COLUMNS);
    expect(json.foods).toEqual([['1', 'Fixture bread', ['Pain fictif'], 250, 8000], ['3', 'Fixture water', []], ['4', 'Fixture oil', [], null, null, null, 100000, ...Array(20).fill(null), 9000]]);
    expect(JSON.parse(serialise(json))).toEqual(json);
  });
});

describe('the build', () => {
  test('--from fixtures: CIQUAL and CoFID built, Fineli refused while its licence is unverified, the manifest lists what exists', async () => {
    const out = await mkdtemp(join(tmpdir(), 'food-generic-out-')), from = await mkdtemp(join(tmpdir(), 'food-generic-raw-'));
    await cp(join(FIX, 'ciqual'), join(from, 'ciqual'), {recursive: true}); await cp(join(FIX, 'fineli'), join(from, 'fineli'), {recursive: true});
    await mkdir(join(from, 'cofid')); await writeFile(join(from, 'cofid', 'fixture-cofid.xlsx'), await workbook());
    const lines = [], report = await build({from, out, log: line => lines.push(line)});
    expect(report.map(r => [r.source, r.ok])).toEqual([['ciqual', true], ['cofid', true], ['fineli', false]]);
    expect(report[2].error).toBe('fineli: its licence is not verified in LICENCES.json; nothing is built.');
    expect(report[0].notes.some((/** @type {string} */ n) => n.startsWith('alim_2099_01_01.xml: unpinned file (md5'))).toBe(true);
    const ciqual = JSON.parse(await readFile(join(out, 'ciqual-v1.json'), 'utf8')), manifest = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
    const licences = await readLicences();
    expect(ciqual).toMatchObject({schemaVersion: 1, source: 'ciqual', attribution: licences.sources.ciqual.attribution, licence: licences.sources.ciqual.licence, link: licences.sources.ciqual.link, columns: COLUMNS});
    expect(ciqual.foods.map((/** @type {any[]} */ f) => f[0])).toEqual(['990001', '990002']);
    expect(manifest.sources.map((/** @type {any} */ s) => [s.source, s.file, s.foods])).toEqual([['ciqual', 'ciqual-v1.json', 2], ['cofid', 'cofid-v1.json', 2]]);
    for (const s of manifest.sources) expect(s.sha256).toBe(createHash('sha256').update(await readFile(join(out, s.file))).digest('hex'));
    expect(await readdir(out)).toEqual(['ciqual-v1.json', 'cofid-v1.json', 'manifest.json']);
    // Fineli, once its licence is verified, builds from the CSV files; a rebuild of one source keeps the others listed.
    const verified = structuredClone(licences); verified.sources.fineli = {...verified.sources.fineli, verified: true, attribution: 'Fixture attribution', datasetVersion: 'Fixture'};
    const again = await build({from, out, only: ['fineli'], licences: verified, log: () => {}});
    expect(again[0]).toMatchObject({source: 'fineli', ok: true, foods: 2});
    const after = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'));
    expect(after.sources.map((/** @type {any} */ s) => s.source)).toEqual(['ciqual', 'cofid', 'fineli']);
    // A pinned checksum that does not match is refused.
    const pinned = structuredClone(licences); pinned.sources.ciqual.download.md5['alim_2099_01_01.xml'] = '0'.repeat(32);
    expect((await build({from, out, only: ['ciqual'], licences: pinned, log: () => {}}))[0].error).toContain('does not match the pinned');
  }, 60_000);
  test('options: only the known flags and sources', () => {
    expect(parseArgs(['--only', 'ciqual,cofid', '--from', 'x'])).toMatchObject({only: ['ciqual', 'cofid']});
    for (const bad of [['--only', 'nevo'], ['--from'], ['--evil', 'x'], ['--out', '--from']]) expect(() => parseArgs(bad), bad.join(' ')).toThrow();
  });
});

test('the committed library matches its manifest, its licence record and the column header', async () => {
  const dir = fileURLToPath(new URL('../../apps/web/public/food-generic/', import.meta.url)), manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')), licences = await readLicences();
  expect(manifest.schemaVersion).toBe(1);
  expect(manifest.sources.length).toBeGreaterThan(0);
  for (const entry of manifest.sources) {
    const bytes = await readFile(join(dir, entry.file)), json = JSON.parse(bytes.toString('utf8')), about = licences.sources[entry.source];
    expect(about.verified, entry.source).toBe(true);
    expect(entry.file).toBe(`${entry.source}-v1.json`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
    expect(bytes.length).toBe(entry.bytes);
    for (const key of ['name', 'licence', 'licenceUrl', 'attribution', 'notice', 'link', 'datasetVersion']) { expect(entry[key], key).toBe(about[key]); expect(json[key], key).toBe(about[key]); }
    expect(json.columns).toEqual(COLUMNS); expect(json.foods).toHaveLength(entry.foods);
  }
  expect((await readdir(dir)).sort()).toEqual(['manifest.json', ...manifest.sources.map((/** @type {any} */ s) => s.file)].sort());
});
