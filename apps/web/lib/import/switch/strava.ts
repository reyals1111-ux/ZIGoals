import {readFitFile} from '../fit/summary';
import {FIT_MAX_BYTES} from '../fit/decode';
import {gunzip, isGzip} from '../fit/gzip';
import {importIdFor, importInfo, IMPORT_MAX_CHARS, IMPORT_MAX_SECONDS, readWorkoutFile, sportLabel, type ImportSummary} from '../../workouts/import-file';
import {miniXmlParser} from '../../workouts/mini-xml';
import {safeLine} from '../../workouts/import-lifts';
import type {Workouts} from '../../workouts/schema';
import {checkStop, STOPPED} from './common';
import {csvRows, headerIndex} from './csv-stream';
import {baseName, progressCounter, textStream, type ImportFile} from './source';

/**
 * Session AK (4.7): Strava's bulk export ("Download your account": a ZIP; FORMATS.md section g, layout secondary and
 * unverified). `activities.csv` lists every activity; its `Filename` column points at the activity's original file in
 * `activities/` (`.fit.gz`, `.fit`, `.gpx`, `.gpx.gz`, `.tcx`, `.tcx.gz`). Each file is read as the FIT, GPX or TCX
 * importers read one, keeping the summary only; the CSV gives the activity's own name and type. A row without a readable
 * file keeps its date and length from the CSV (no distance: the CSV's units follow the account and are not trusted).
 * The same activity twice (start within two minutes, same type) is kept once, here and against the log.
 *
 * Not a Switch-to-ZIGoals reader: that importer writes Health records under a stored, strict format list, while this one
 * writes workouts. The Workouts import calls it directly with the chosen ZIP.
 */
export const STRAVA_LABEL = 'Strava';
export const STRAVA_MAX_ACTIVITIES = 5000;
export const isStravaExport = (files: readonly Pick<ImportFile, 'path'>[]) => files.some(f => /(^|\/)activities\.csv$/i.test(f.path));
export type StravaPlan = {summaries: ImportSummary[]; fromCsvOnly: number; failed: number; duplicates: number; warnings: string[]};
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Strava's "Activity Date" (UTC): "Oct 1, 2026, 8:00:00 AM", "1 Oct 2026, 08:00:00" or ISO; null when unreadable. */
export function stravaDate(text: string): number | null {
  const t = text.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:Z|\+00:?00)?$/.exec(t);
  let y: number, mo: number, d: number, h: number, mi: number, s: number;
  if (iso) { [y, mo, d, h, mi, s] = [+iso[1]!, +iso[2]!, +iso[3]!, +iso[4]!, +iso[5]!, +(iso[6] ?? 0)]; }
  else {
    const us = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?(AM|PM)?$/i.exec(t);
    const eu = us ? null : /^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/i.exec(t);
    if (!us && !eu) return null;
    const month = MONTHS.indexOf((us ? us[1]! : eu![2]!).toLowerCase());
    if (month < 0) return null;
    y = +(us ? us[3]! : eu![3]!); mo = month + 1; d = +(us ? us[2]! : eu![1]!); h = +(us ? us[4]! : eu![4]!); mi = +(us ? us[5]! : eu![5]!); s = +((us ? us[6] : eu![6]) ?? 0);
    const half = us?.[7]?.toUpperCase();
    if (half) { if (h < 1 || h > 12) return null; h = (h % 12) + (half === 'PM' ? 12 : 0); }
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const ms = Date.UTC(y, mo - 1, d, h, mi, s);
  return new Date(ms).getUTCDate() === d ? ms : null;
}
/** A Strava activity type ("Run", "Weight Training") as the summary's sport word, label and workout type. */
export function stravaKind(type: string): Pick<ImportSummary, 'sport' | 'label' | 'type'> {
  const sport = safeLine(type, 40);
  if (/weight|strength|crossfit|workout/i.test(sport) && !/run|ride|walk|swim/i.test(sport)) return {sport, label: 'Workout', type: 'strength'};
  if (/yoga|pilates|stretch/i.test(sport)) return {sport, label: 'Workout', type: 'mobility'};
  return {sport, ...sportLabel(sport)};
}
/**
 * Session AK Part 15 (F5): a whole export reads at most this many bytes of activity files, counted as they come out of
 * the ZIP and again as a `.gz` unpacks (each file is still capped on its own). A crafted archive of thousands of small
 * files that each expand to the per-file cap is refused in plain words instead of running for hours.
 */
export const STRAVA_MAX_UNPACKED_BYTES = 1024 * 1024 * 1024;
export const STRAVA_TOO_LARGE = 'This export’s activity files unpack to more than 1 GB, more than ZIGoals reads at once. Nothing was imported.';
class ArchiveTooLarge extends Error {}
type Budget = {spend: (bytes: number) => void; left: () => number};
function archiveBudget(max = STRAVA_MAX_UNPACKED_BYTES): Budget {
  let spent = 0;
  return {spend(bytes) { spent += bytes; if (spent > max) throw new ArchiveTooLarge(STRAVA_TOO_LARGE); }, left: () => max - spent};
}
async function bytesOf(file: ImportFile, limit: number, counter: {add: (n: number) => void}, budget?: Budget, signal?: AbortSignal): Promise<Uint8Array> {
  if (file.size > limit) throw Error('larger than one workout');
  const reader = (await file.open()).getReader(), parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      checkStop(signal);
      const {done, value} = await reader.read();
      if (done) break;
      total += value.length; counter.add(value.length); budget?.spend(value.length);
      if (total > limit) throw Error('larger than one workout');
      parts.push(value);
    }
  } catch (error) { void reader.cancel().catch(() => undefined); throw error; }
  const out = new Uint8Array(total); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
/** One activity file's bytes (already unpacked) as summaries, by its own name without `.gz`. */
function readActivityBytes(plain: string, bytes: Uint8Array): ImportSummary[] {
  if (plain.endsWith('.fit')) return readFitFile(bytes);
  if (plain.endsWith('.gpx') || plain.endsWith('.tcx')) {
    if (bytes.length > IMPORT_MAX_CHARS) throw Error('This file is larger than 5 MB.');
    return readWorkoutFile(new TextDecoder('utf-8').decode(bytes), miniXmlParser);
  }
  throw Error('This kind of activity file is not read.');
}
/** One activity file (by its own name, `.gz` unpacked) as summaries. */
export async function readActivityFile(name: string, raw: Uint8Array): Promise<ImportSummary[]> {
  const bytes = isGzip(raw) ? await gunzip(raw, FIT_MAX_BYTES) : raw;
  return readActivityBytes(name.toLowerCase().replace(/\.gz$/, ''), bytes);
}
/**
 * One file of the archive, within the budget: a `.gz` unpacks no further than what is left of it, and one that fails
 * to unpack counts as if it had used its whole allowance (so damaged files cannot be used to get round the budget).
 */
async function readArchiveFile(file: ImportFile, counter: {add: (n: number) => void}, budget: Budget, signal?: AbortSignal): Promise<ImportSummary[]> {
  if (budget.left() <= 0) throw new ArchiveTooLarge(STRAVA_TOO_LARGE);
  const raw = await bytesOf(file, FIT_MAX_BYTES, counter, budget, signal);
  let bytes = raw;
  if (isGzip(raw)) {
    const limit = Math.max(1, Math.min(FIT_MAX_BYTES, budget.left()));
    try { bytes = await gunzip(raw, limit); } catch (error) { budget.spend(limit); throw error; }
    budget.spend(bytes.length);
  }
  checkStop(signal);
  return readActivityBytes(file.path.toLowerCase().replace(/\.gz$/, ''), bytes);
}

/** True when a summary is the same activity as one already kept: the same import, or the same type starting within 2 minutes. */
export function sameActivity(a: {startedAt: string; type: string; importId?: string}, b: {startedAt: string; type: string; importId?: string}): boolean {
  if (a.importId && a.importId === b.importId) return true;
  return a.type === b.type && Math.abs(Date.parse(a.startedAt) - Date.parse(b.startedAt)) <= 2 * 60_000;
}
/** The summaries not yet in the log (by import, or the same type starting within two minutes). */
export function notInLog(w: Workouts, summaries: readonly ImportSummary[]): {fresh: ImportSummary[]; duplicates: number} {
  const have = activityIndex();
  for (const x of w.workouts) have.add({startedAt: x.startedAt, type: x.type, importId: importInfo(x)?.importId});
  const fresh = summaries.filter(s => !have.has(s));
  return {fresh, duplicates: summaries.length - fresh.length};
}
/**
 * Session AK Part 15 (F5): sameActivity over a set, without comparing every pair: import ids in a Set, starts by type in
 * two-minute buckets (a neighbour within two minutes is in the same bucket or the one either side).
 */
const TWO_MINUTES = 2 * 60_000;
function activityIndex() {
  const ids = new Set<string>(), buckets = new Map<string, number[]>();
  const bucket = (type: string, ms: number) => `${type}|${Math.floor(ms / TWO_MINUTES)}`;
  return {
    add(a: {startedAt: string; type: string; importId?: string}) {
      if (a.importId) ids.add(a.importId);
      const ms = Date.parse(a.startedAt); if (!Number.isFinite(ms)) return;
      const key = bucket(a.type, ms), list = buckets.get(key);
      if (list) list.push(ms); else buckets.set(key, [ms]);
    },
    has(a: {startedAt: string; type: string; importId?: string}): boolean {
      if (a.importId && ids.has(a.importId)) return true;
      const ms = Date.parse(a.startedAt); if (!Number.isFinite(ms)) return false;
      const key = Math.floor(ms / TWO_MINUTES);
      for (let k = key - 1; k <= key + 1; k++) if (buckets.get(`${a.type}|${k}`)?.some(s => Math.abs(s - ms) <= TWO_MINUTES)) return true;
      return false;
    },
  };
}

export async function readStrava(files: readonly ImportFile[], {onProgress, signal, maxUnpackedBytes}: {onProgress?: (done: number) => void; signal?: AbortSignal; maxUnpackedBytes?: number} = {}): Promise<StravaPlan> {
  const list = files.filter(f => /(^|\/)activities\.csv$/i.test(f.path)).sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];
  if (!list) throw Error('This is not a Strava export: activities.csv is missing. In Strava: Settings → My Account → Download your account, then choose the ZIP from the e-mail.');
  const root = list.path.slice(0, list.path.length - baseName(list.path).length), counter = progressCounter(onProgress);
  const byPath = new Map(files.map(f => [f.path.toLowerCase(), f]));
  let header: Map<string, number> | null = null, failed = 0, fromCsvOnly = 0, unreadableRows = 0, rowsSeen = 0;
  const kept: ImportSummary[] = [], warnings: string[] = [], seen = activityIndex();
  // Session AK Part 15 (F5): each file of the archive is read once, however many rows name it; the whole read has a budget.
  const outcomes = new Map<string, ImportSummary[] | null>(), budget = archiveBudget(maxUnpackedBytes);
  let duplicates = 0;
  for await (const row of csvRows(textStream(list, counter))) {
    checkStop(signal);
    if (!header) {
      header = headerIndex(row);
      if (!header.has('activity date') || !header.has('activity type')) throw Error('This Strava export’s activities.csv has other columns (Strava writes it in the account’s language). Set Strava to English, request the export again, then choose it.');
      continue;
    }
    if (++rowsSeen > STRAVA_MAX_ACTIVITIES) throw Error(`This export holds more than ${STRAVA_MAX_ACTIVITIES.toLocaleString('en')} activities, more than ZIGoals reads at once.`);
    const get = (name: string) => (row[header!.get(name) ?? -1] ?? '').trim();
    const name = safeLine(get('activity name'), 80), kind = stravaKind(get('activity type')), fileName = get('filename');
    let found: ImportSummary[] = [], csvOnly = false;
    const file = fileName ? byPath.get(`${root}${fileName}`.toLowerCase()) ?? byPath.get(fileName.toLowerCase()) : undefined;
    if (file) {
      const key = file.path.toLowerCase();
      let outcome = outcomes.get(key);
      if (outcome === undefined) {
        try { outcome = await readArchiveFile(file, counter, budget, signal); } catch (error) {
          if (error instanceof ArchiveTooLarge || (error instanceof Error && error.message === STOPPED)) throw error;
          outcome = null;
        }
        outcomes.set(key, outcome);
      }
      if (outcome) found = outcome; else failed++;
    }
    if (!found.length) {
      // The CSV alone: its date (UTC) and elapsed time, nothing more.
      const start = stravaDate(get('activity date')), seconds = Number(get('elapsed time'));
      if (start === null || !Number.isFinite(seconds) || seconds < 1 || seconds > IMPORT_MAX_SECONDS) { unreadableRows++; continue; }
      csvOnly = true;
      found = [{source: 'strava', importId: importIdFor(start, seconds, null), name: '', sport: '', label: '', type: 'other', startedAt: new Date(start).toISOString(),
        durationSeconds: Math.round(seconds), distanceKm: null, elevationM: null, avgHr: null}];
    }
    for (const s of found) {
      const summary: ImportSummary = {...s, ...(kind.sport ? kind : {}), name: name || s.name || `${kind.label || s.label || 'Workout'} (imported)`};
      if (!summary.label) Object.assign(summary, {label: 'Workout'});
      if (seen.has(summary)) { duplicates++; continue; }
      kept.push(summary); seen.add(summary);
      if (csvOnly) fromCsvOnly++;
    }
  }
  counter.flush();
  if (!header) throw Error('This Strava export’s activities.csv is empty.');
  if (!kept.length) throw Error('This Strava export has no activity ZIGoals can read.');
  if (fromCsvOnly) warnings.push(`${fromCsvOnly.toLocaleString('en')} ${fromCsvOnly === 1 ? 'activity has' : 'activities have'} no readable file, so ${fromCsvOnly === 1 ? 'it keeps' : 'they keep'} only the date and length from activities.csv.`);
  if (failed) warnings.push(`${failed.toLocaleString('en')} activity ${failed === 1 ? 'file' : 'files'} could not be read (damaged, too large, or a kind ZIGoals does not read).`);
  if (unreadableRows) warnings.push(`${unreadableRows.toLocaleString('en')} ${unreadableRows === 1 ? 'row' : 'rows'} in activities.csv had neither a readable file nor a readable date and length, and ${unreadableRows === 1 ? 'was' : 'were'} skipped.`);
  if (duplicates) warnings.push(`${duplicates.toLocaleString('en')} ${duplicates === 1 ? 'activity appears' : 'activities appear'} twice in the export and ${duplicates === 1 ? 'is' : 'are'} kept once.`);
  kept.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return {summaries: kept, fromCsvOnly, failed, duplicates, warnings};
}
