#!/usr/bin/env node
// Session AK Part 1c: builds the offline generic-food library from the sources' official files, without a dependency.
//
//   node scripts/food/build-generic-db.mjs                     download the official files, then build every source
//   node scripts/food/build-generic-db.mjs --from <dir>        build from raw files already on disk (no network)
//   node scripts/food/build-generic-db.mjs --only ciqual,cofid --out <dir> --keep-downloads <dir>
// Behind an HTTPS proxy, Node's fetch needs NODE_USE_ENV_PROXY=1 (and NODE_EXTRA_CA_CERTS for a proxy's own CA).
//
// Raw files for --from: <dir>/ciqual/{alim,compo,const}_*.xml (CIQUAL's XML tables), <dir>/cofid/*.xlsx (the CoFID 2021
// integrated dataset; CoFID_oldFoods is ignored), <dir>/fineli/*.zip or the zip's CSV files. A file with a pinned
// checksum in LICENCES.json must match it; another file name is built and reported as unpinned.
//
// Output (default apps/web/public/food-generic/): <source>-v1.json per source (pack.mjs documents the shape) and
// manifest.json, the small list the app reads first (apps/web/lib/food-generic/catalog.ts). A source whose licence is not
// verified in LICENCES.json is never built. Downloaded files are data: they are parsed by the strict readers in lib/,
// never executed. The XLS (old binary Excel) files are not read; CIQUAL's XML is used instead.
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, readdir, rename, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {pack, serialise, SCHEMA_VERSION} from './lib/pack.mjs';
import {fineliZipFiles, readCiqual, readCofid, readFineli} from './lib/sources.mjs';

export const SOURCES = /** @type {const} */ (['ciqual', 'cofid', 'fineli']);
/** @typedef {typeof SOURCES[number]} SourceId */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const DEFAULT_OUT = join(ROOT, 'apps/web/public/food-generic');
const LIMIT = {xml: 200 * 1024 * 1024, xlsx: 64 * 1024 * 1024, zip: 64 * 1024 * 1024, page: 4 * 1024 * 1024};
const AGENT = 'ZIGoals food library build (scripts/food/build-generic-db.mjs)';
const hash = (/** @type {string} */ algo, /** @type {Uint8Array} */ bytes) => createHash(algo).update(bytes).digest('hex');

/** The licence record (scripts/food/LICENCES.json). */
export async function readLicences(path = new URL('./LICENCES.json', import.meta.url)) { return JSON.parse(await readFile(path, 'utf8')); }

/** Bytes of a URL, at most `limit`; redirects are followed (the archives serve files from a storage host). @param {string} url @param {number} limit */
async function download(url, limit) {
  const res = await fetch(url, {headers: {'User-Agent': AGENT}, redirect: 'follow', signal: AbortSignal.timeout(600_000)});
  if (!res.ok || !res.body) throw Error(`${url} answered ${res.status}${res.headers.get('cf-mitigated') ? ` (${res.headers.get('cf-mitigated')})` : ''}.`);
  const reader = res.body.getReader(), parts = []; let size = 0;
  for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw Error(`${url} is larger than ${limit} bytes.`); } parts.push(value); }
  return new Uint8Array(Buffer.concat(parts));
}
/** @param {string} path @param {number} limit */
async function readLimited(path, limit) { if ((await stat(path)).size > limit) throw Error(`${path} is larger than ${limit} bytes.`); return new Uint8Array(await readFile(path)); }
/** Files of a directory (missing → []). @param {string} dir */
const list = async dir => { try { return (await readdir(dir, {withFileTypes: true})).filter(d => d.isFile()).map(d => d.name).sort(); } catch { return []; } };

/** Raw files of one source, from disk (`from`) or from the official URLs (saved in `keep`). Returns the parsed rows and
 * notes about provenance. @param {SourceId} source @param {any} about @param {{from?:string,keep:string}} where */
async function rawRows(source, about, where) {
  const notes = [], dl = about.download ?? {};
  const pinned = /** @param {string} name @param {Uint8Array} bytes @param {'md5'|'sha256'} algo @param {string|undefined} want */ (name, bytes, algo, want) => {
    if (!want) { notes.push(`${name}: unpinned file (${algo} ${hash(algo, bytes)}).`); return; }
    if (hash(algo, bytes) !== want) throw Error(`${name}: ${algo} does not match the pinned ${want}.`);
    notes.push(`${name}: ${algo} matches the pinned value.`);
  };
  if (source === 'ciqual') {
    /** @type {Record<'alim'|'compo'|'constituents',Uint8Array>} */
    const files = /** @type {any} */ ({});
    const prefix = {alim: /^alim_\d[\w-]*\.xml$/i, compo: /^compo_[\w-]*\.xml$/i, constituents: /^const_[\w-]*\.xml$/i};
    if (where.from) {
      const dir = join(where.from, 'ciqual'), names = await list(dir);
      for (const [key, re] of Object.entries(prefix)) {
        const name = names.find(n => re.test(n)); if (!name) throw Error(`CIQUAL: no ${re} file in ${dir}.`);
        const bytes = await readLimited(join(dir, name), LIMIT.xml); pinned(name, bytes, 'md5', dl.md5?.[name]); files[/** @type {keyof typeof prefix} */(key)] = bytes;
      }
    } else {
      const meta = JSON.parse(new TextDecoder().decode(await download(dl.metadata, LIMIT.page))).data?.latestVersion;
      const licence = String(meta?.license?.name ?? '').toLowerCase();
      if (licence !== 'etalab 2.0') throw Error(`CIQUAL: the dataset's licence reads "${licence}", not "etalab 2.0".`);
      notes.push('Dataset licence (Recherche Data Gouv metadata): etalab 2.0.');
      await mkdir(join(where.keep, 'ciqual'), {recursive: true});
      for (const [key, re] of Object.entries(prefix)) {
        const file = (meta.files ?? []).map((/** @type {any} */ f) => f.dataFile).find((/** @type {any} */ f) => re.test(f?.filename ?? '') && dl.files.includes(f.filename));
        if (!file) throw Error(`CIQUAL: the dataset has no file among ${dl.files.join(', ')} for ${re}; a new version needs LICENCES.json updated.`);
        if (!Number.isSafeInteger(file.id)) throw Error('CIQUAL: a file id is not a number.');
        const bytes = await download(dl.fileUrl.replace('{id}', String(file.id)), LIMIT.xml);
        pinned(file.filename, bytes, 'md5', dl.md5?.[file.filename]);
        await writeFile(join(where.keep, 'ciqual', file.filename), bytes);
        files[/** @type {keyof typeof prefix} */(key)] = bytes;
      }
    }
    return {...readCiqual(files), provenance: notes};
  }
  if (source === 'cofid') {
    let bytes, name;
    if (where.from) {
      const dir = join(where.from, 'cofid'); name = (await list(dir)).find(n => /\.xlsx$/i.test(n) && !/oldfoods/i.test(n));
      if (!name) throw Error(`CoFID: no .xlsx file in ${dir}.`);
      bytes = await readLimited(join(dir, name), LIMIT.xlsx);
      // The official file under any name is recognised by its checksum; the official name with another checksum is refused.
      pinned(name, bytes, 'sha256', hash('sha256', bytes) === dl.sha256 || name === decodeURIComponent(dl.url.split('/').pop()) ? dl.sha256 : undefined);
    } else {
      const page = new TextDecoder().decode(await download(dl.page, LIMIT.page));
      if (!page.includes(dl.pageLicence)) throw Error(`CoFID: the publication page no longer says "${dl.pageLicence}".`);
      notes.push(`Publication page states: ${dl.pageLicence}.`);
      name = decodeURIComponent(dl.url.split('/').pop()); bytes = await download(dl.url, LIMIT.xlsx);
      pinned(name, bytes, 'sha256', dl.sha256);
      await mkdir(join(where.keep, 'cofid'), {recursive: true}); await writeFile(join(where.keep, 'cofid', name), bytes);
    }
    return {...await readCofid(bytes), provenance: notes};
  }
  /** @type {Map<string,Uint8Array>} */
  let files = new Map();
  if (where.from) {
    const dir = join(where.from, 'fineli'), names = await list(dir), zip = names.find(n => /\.zip$/i.test(n));
    if (zip) { const bytes = await readLimited(join(dir, zip), LIMIT.zip); notes.push(`${zip}: sha256 ${hash('sha256', bytes)}.`); files = await fineliZipFiles(bytes); }
    else for (const n of names.filter(n => /\.csv$/i.test(n))) files.set(n.toLowerCase(), await readLimited(join(dir, n), LIMIT.zip));
    if (!files.size) throw Error(`Fineli: no .zip or .csv files in ${dir}.`);
  } else {
    if (!dl.url) throw Error(`Fineli: no verified download URL (${dl.page} could not be read from here); give the open-data zip with --from <dir>/fineli/.`);
    const bytes = await download(dl.url, LIMIT.zip); files = await fineliZipFiles(bytes);
  }
  return {...readFineli(files), provenance: notes};
}

/** Builds the chosen sources into `out`. Returns one report row per source; a failure is reported, never faked.
 * @param {{only?:SourceId[],from?:string,out?:string,keep?:string,licences?:any,log?:(line:string)=>void}} [options] */
export async function build(options = {}) {
  const licences = options.licences ?? await readLicences(), out = options.out ?? DEFAULT_OUT, log = options.log ?? (line => console.log(line));
  const keep = options.from ? '' : options.keep ?? await mkdtemp(join(tmpdir(), 'zigoals-food-raw-'));
  await mkdir(out, {recursive: true});
  /** @type {any[]} */
  const report = [];
  for (const source of options.only ?? SOURCES) {
    const about = licences.sources?.[source];
    try {
      if (!about) throw Error(`${source} is not in LICENCES.json.`);
      if (about.verified !== true) throw Error(`${source}: its licence is not verified in LICENCES.json; nothing is built.`);
      const rows = await rawRows(source, about, {from: options.from, keep});
      const {json, skipped} = pack({source, name: about.name, licence: about.licence, licenceUrl: about.licenceUrl, attribution: about.attribution, notice: about.notice, link: about.link, datasetVersion: about.datasetVersion}, rows.foods);
      if (!json.foods.length) throw Error(`${source}: no food with an English name was read.`);
      const text = serialise(json), bytes = Buffer.from(text), file = `${source}-v1.json`;
      // Written next to the target first, then moved, so an interrupted build never leaves half a file.
      await writeFile(join(out, file + '.tmp'), bytes); await rename(join(out, file + '.tmp'), join(out, file));
      const row = {source, ok: true, file, foods: json.foods.length, skipped, bytes: bytes.length, gzipBytes: gzipSync(bytes, {level: 9}).length, sha256: hash('sha256', bytes), notes: [...rows.provenance, ...rows.notes]};
      report.push(row); log(`${source}: ${row.foods} foods (${skipped} skipped), ${row.bytes} bytes, ${row.gzipBytes} gzip.`);
    } catch (error) {
      report.push({source, ok: false, error: error instanceof Error ? error.message : String(error)}); log(`${source}: NOT BUILT — ${report.at(-1).error}`);
    }
  }
  await writeManifest(out, licences, report);
  if (keep) log(`Raw downloads kept in ${keep} (use --from ${keep} to rebuild offline).`);
  return report;
}
/** manifest.json: every source whose file exists in `out` (built now, or kept from an earlier build), in SOURCES order.
 * @param {string} out @param {any} licences @param {any[]} report */
async function writeManifest(out, licences, report) {
  /** @type {any} */
  let previous = {sources: []};
  try { previous = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8')); } catch { /* first build */ }
  const entries = [];
  for (const source of SOURCES) {
    const built = report.find(r => r.source === source && r.ok), about = licences.sources?.[source];
    if (built) { entries.push({source, name: about.name, licence: about.licence, licenceUrl: about.licenceUrl, attribution: about.attribution, notice: about.notice, link: about.link, datasetVersion: about.datasetVersion, file: built.file, foods: built.foods, bytes: built.bytes, sha256: built.sha256}); continue; }
    const old = (previous.sources ?? []).find((/** @type {any} */ e) => e.source === source);
    if (old && about?.verified === true && await stat(join(out, old.file)).then(() => true, () => false)) entries.push(old);
  }
  await writeFile(join(out, 'manifest.json'), JSON.stringify({schemaVersion: SCHEMA_VERSION, sources: entries}, null, 1) + '\n');
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{only?:SourceId[],from?:string,out?:string,keep?:string}} */
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = argv[i + 1];
    if (!['--only', '--from', '--out', '--keep-downloads'].includes(flag ?? '') || value === undefined || value.startsWith('--')) throw Error(`Unknown or incomplete option ${flag}. Use --from <dir>, --out <dir>, --only ciqual,cofid,fineli, --keep-downloads <dir>.`);
    i++;
    if (flag === '--only') { const only = value.split(','); if (!only.every(s => SOURCES.includes(/** @type {SourceId} */(s)))) throw Error(`--only takes ${SOURCES.join(', ')}.`); options.only = /** @type {SourceId[]} */(only); }
    else if (flag === '--from') options.from = resolve(value);
    else if (flag === '--out') options.out = resolve(value);
    else options.keep = resolve(value);
  }
  return options;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await build(parseArgs(process.argv.slice(2)));
  if (report.some(r => !r.ok)) process.exitCode = 1;
}
