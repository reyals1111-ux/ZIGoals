import {localDate} from '../local-date';
import {workoutsSchema, type Workout, type Workouts, type WORKOUT_TYPES} from './schema';

/**
 * Session AJ (item 27, D12): read a GPX or TCX workout file on the device and keep its summary only — start, length,
 * distance, climb and average heart rate. The route's points are read once to work these out and are never kept. Pure:
 * the caller passes the browser's DOMParser (tests pass jsdom's). Every refusal is a plain sentence.
 *
 * Safety: the text is limited before parsing, and any entity declaration is refused before the parser sees it (DOMParser
 * never fetches, but it would expand internal entities).
 */
export const IMPORT_MAX_CHARS = 5 * 1024 * 1024;
export const IMPORT_MAX_POINTS = 200_000;
export const IMPORT_MAX_SECONDS = 48 * 3600;
const MAX_ACTIVITIES = 50;
/** Climbs smaller than this are treated as GPS or barometer noise. */
const CLIMB_NOISE_M = 1;

/**
 * Session AK (4.7): FIT files read by lib/import/fit, and Strava archive rows that came without a readable file; their
 * summaries are kept under the workout's new `fileImport` key.
 */
export type ImportSource = 'gpx' | 'tcx' | 'fit' | 'strava';
export type ImportSummary = {
  source: ImportSource;
  /** Stable for the same workout: start (to the minute), length (to 10 s) and distance (to 10 m). */
  importId: string;
  name: string;
  /** The file's own sport word ("running", "Biking"), trimmed; empty when the file has none. */
  sport: string;
  /** "Run", "Ride", "Walk", "Hike", "Swim" or "Workout". */
  label: string;
  type: typeof WORKOUT_TYPES[number];
  startedAt: string;
  durationSeconds: number;
  distanceKm: number | null;
  elevationM: number | null;
  avgHr: number | null;
};
export type XmlParser = {parseFromString(text: string, type: 'application/xml'): Document};

type Point = {t: number | null; lat: number | null; lon: number | null; ele: number | null; hr: number | null; dist: number | null};
type Totals = {start?: number | null; seconds?: number | null; meters?: number | null; avgHr?: number | null};

const refuse = (sentence: string): never => { throw new Error(sentence); };
const impossible = (what: string): never => refuse(`This file has an impossible ${what}, so nothing was imported.`);

const children = (el: Element, name: string) => Array.from(el.children).filter(c => c.localName === name);
const child = (el: Element, name: string) => children(el, name)[0];
const textOf = (el: Element | undefined) => el?.textContent?.trim() ?? '';
const descendant = (el: Element, ...names: string[]) => { for (const n of names) { const found = el.getElementsByTagNameNS('*', n)[0]; if (found) return found; } return undefined; };
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();

/** A number from the file: null when absent, refused when it is not a finite number. */
function num(raw: string | null | undefined, what: string): number | null {
  const s = raw?.trim(); if (!s) return null;
  const n = Number(s); return Number.isFinite(n) ? n : impossible(what);
}
const nonNegative = (n: number | null, what: string) => n !== null && n < 0 ? impossible(what) : n;
/** An ISO time; one written without a zone is read as UTC, as GPX and TCX both require. */
function time(raw: string | null | undefined): number | null {
  const s = raw?.trim(); if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/.test(s)) return impossible('time');
  const ms = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`);
  return Number.isFinite(ms) ? ms : impossible('time');
}
function heartRate(raw: string | null | undefined): number | null {
  const n = nonNegative(num(raw, 'heart rate'), 'heart rate');
  return n !== null && n >= 20 && n <= 250 ? n : null; // 0 and the like are sensor drop-outs, not readings
}
function position(latRaw: string | null | undefined, lonRaw: string | null | undefined): {lat: number | null; lon: number | null} {
  const lat = num(latRaw, 'position'), lon = num(lonRaw, 'position');
  if (lat === null || lon === null) return {lat: null, lon: null};
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) impossible('position');
  return {lat, lon};
}
/** The distance in metres between two points on the Earth (haversine). */
export function haversineMeters(a: {lat: number; lon: number}, b: {lat: number; lon: number}): number {
  const R = 6_371_008.8, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** Climb in metres: rises of at least the noise threshold count, small wobbles do not; null without any elevation. */
export function elevationGain(segments: (number | null)[][]): number | null {
  let gain = 0, any = false;
  for (const seg of segments) {
    let ref: number | null = null;
    for (const e of seg) {
      if (e === null) continue; any = true;
      if (ref === null || e < ref) ref = e;
      else if (e - ref >= CLIMB_NOISE_M) { gain += e - ref; ref = e; }
    }
  }
  return any ? gain : null;
}

const SPORTS: [RegExp, string][] = [[/run|jog/i, 'Run'], [/bik|cycl|ride/i, 'Ride'], [/walk/i, 'Walk'], [/hik|trek/i, 'Hike'], [/swim/i, 'Swim']];
export function sportLabel(sport: string): {label: string; type: ImportSummary['type']} {
  const hit = SPORTS.find(([re]) => re.test(sport));
  return hit ? {label: hit[1], type: 'cardio'} : {label: 'Workout', type: 'other'};
}
const stamp = (ms: number) => new Date(Math.round(ms / 60_000) * 60_000).toISOString().slice(0, 16).replace(/[-:]/g, '');
export function importIdFor(startMs: number, seconds: number, meters: number | null): string {
  return `${stamp(startMs)}Z-${Math.round(seconds / 10) * 10}s-${meters === null ? 'nodist' : `${Math.round(meters / 10) * 10}m`}`;
}

function summarize(source: ImportSource, segments: Point[][], meta: {name: string; sport: string} & Totals): ImportSummary {
  const points = segments.flat(), timed = points.filter(p => p.t !== null).map(p => p.t!);
  const start = meta.start ?? timed[0] ?? null;
  if (start === null) refuse('This file has no times, so its start and length are unknown. Export it again with times included.');
  const seconds = meta.seconds ?? (timed.length ? (timed.at(-1)! - timed[0]!) / 1000 : null);
  if (seconds === null) refuse('This file has no times, so its start and length are unknown. Export it again with times included.');
  if (!Number.isFinite(seconds!) || seconds! < 0) impossible('length of time');
  if (seconds! > IMPORT_MAX_SECONDS) refuse('This workout lasts more than 48 hours, which is longer than one workout can be.');
  if (Math.round(seconds!) < 1) refuse('This workout has no length of time, so nothing was imported.');
  let meters = meta.meters ?? null;
  if (meters === null) {
    let sum = 0, any = false;
    for (const seg of segments) {
      let prev: {lat: number; lon: number} | null = null;
      for (const p of seg) { if (p.lat === null || p.lon === null) continue; const here = {lat: p.lat, lon: p.lon}; if (prev) { sum += haversineMeters(prev, here); any = true; } prev = here; }
    }
    meters = any ? sum : null;
  }
  if (meters !== null && meters / 1000 > 2000) impossible('distance');
  const gain = elevationGain(segments.map(seg => seg.map(p => p.ele)));
  if (gain !== null && gain > 20_000) impossible('climb');
  const hrs = points.map(p => p.hr).filter((h): h is number => h !== null);
  const avg = meta.avgHr ?? (hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null);
  const avgHr = avg === null ? null : Math.round(avg);
  const sport = clean(meta.sport, 40), {label, type} = sportLabel(sport);
  return {source, importId: importIdFor(start!, seconds!, meters), name: clean(meta.name, 80) || `${label} (imported)`, sport, label, type,
    startedAt: new Date(start!).toISOString(), durationSeconds: Math.round(seconds!),
    distanceKm: meters === null ? null : Math.round(meters) / 1000, elevationM: gain === null ? null : Math.round(gain), avgHr: avgHr !== null && avgHr >= 20 && avgHr <= 250 ? avgHr : null};
}

function readGpx(root: Element): ImportSummary[] {
  const fileName = textOf(child(child(root, 'metadata') ?? root, 'name'));
  const tracks = children(root, 'trk');
  if (!tracks.length) refuse('This GPX file has no recorded track (only a planned route or places). Export the workout itself.');
  return tracks.map(trk => {
    const segments = children(trk, 'trkseg').map(seg => children(seg, 'trkpt').map((pt): Point => ({
      t: time(textOf(child(pt, 'time'))), ...position(pt.getAttribute('lat'), pt.getAttribute('lon')),
      ele: num(textOf(child(pt, 'ele')), 'elevation'), hr: heartRate(textOf(descendant(pt, 'hr', 'heartrate'))), dist: null,
    })));
    return summarize('gpx', segments, {name: textOf(child(trk, 'name')) || fileName, sport: textOf(child(trk, 'type'))});
  });
}

function readTcx(root: Element): ImportSummary[] {
  const activities = children(child(root, 'Activities') ?? root, 'Activity');
  if (!activities.length) refuse('This TCX file has no recorded activity. Export the workout itself.');
  return activities.map(activity => {
    const laps = children(activity, 'Lap');
    const lapTimes = laps.map(l => nonNegative(num(textOf(child(l, 'TotalTimeSeconds')), 'length of time'), 'length of time'));
    const lapMeters = laps.map(l => nonNegative(num(textOf(child(l, 'DistanceMeters')), 'distance'), 'distance'));
    const lapHr = laps.map(l => heartRate(textOf(child(child(l, 'AverageHeartRateBpm') ?? l, 'Value'))));
    const segments = laps.flatMap(l => children(l, 'Track')).map(track => children(track, 'Trackpoint').map((tp): Point => {
      const pos = child(tp, 'Position');
      return {t: time(textOf(child(tp, 'Time'))), ...(pos ? position(textOf(child(pos, 'LatitudeDegrees')), textOf(child(pos, 'LongitudeDegrees'))) : {lat: null, lon: null}),
        ele: num(textOf(child(tp, 'AltitudeMeters')), 'elevation'), hr: heartRate(textOf(child(child(tp, 'HeartRateBpm') ?? tp, 'Value'))),
        dist: nonNegative(num(textOf(child(tp, 'DistanceMeters')), 'distance'), 'distance')};
    }));
    const sum = (xs: (number | null)[]) => xs.some(x => x !== null) ? xs.reduce<number>((t, x) => t + (x ?? 0), 0) : null;
    const pointMeters = segments.flat().map(p => p.dist).filter((d): d is number => d !== null);
    // The laps' own average heart rates, weighted by each lap's length when known.
    const hrLaps = laps.map((_, i) => ({hr: lapHr[i] ?? null, w: lapTimes[i] || 1})).filter((x): x is {hr: number; w: number} => x.hr !== null);
    const avgHr = hrLaps.length ? hrLaps.reduce((t, x) => t + x.hr * x.w, 0) / hrLaps.reduce((t, x) => t + x.w, 0) : null;
    const start = laps.map(l => time(l.getAttribute('StartTime'))).find(t => t !== null) ?? time(textOf(child(activity, 'Id')));
    return summarize('tcx', segments, {name: '', sport: activity.getAttribute('Sport') ?? '', start, seconds: sum(lapTimes),
      meters: sum(lapMeters) ?? (pointMeters.length ? Math.max(...pointMeters) : null), avgHr});
  });
}

/** Reads a GPX or TCX file's text into one summary per track or activity, or throws a plain sentence. */
export function readWorkoutFile(text: string, parser: XmlParser): ImportSummary[] {
  if (typeof text !== 'string' || !text.trim()) refuse('This file is empty. Choose a GPX or TCX file.');
  if (text.length > IMPORT_MAX_CHARS) refuse('This file is larger than 5 MB. Export one workout at a time, then try again.');
  if (/<!ENTITY/i.test(text)) refuse('This file declares its own XML entities. ZIGoals does not open such files, to keep your device safe.');
  let doc: Document;
  try { doc = parser.parseFromString(text, 'application/xml'); } catch { return refuse('This file could not be read as XML. Choose a GPX or TCX file.'); }
  if (doc.getElementsByTagName('parsererror').length || !doc.documentElement) refuse('This file could not be read as XML. Choose a GPX or TCX file.');
  const root = doc.documentElement, kind = root.localName === 'gpx' ? 'gpx' : root.localName === 'TrainingCenterDatabase' ? 'tcx' : null;
  if (!kind) refuse('This is not a GPX or TCX file. Choose a file exported from a watch, phone or fitness app.');
  const points = doc.getElementsByTagNameNS('*', kind === 'gpx' ? 'trkpt' : 'Trackpoint').length;
  if (points > IMPORT_MAX_POINTS) refuse('This file has more than 200,000 track points. Export a shorter workout, then try again.');
  const out = kind === 'gpx' ? readGpx(root) : readTcx(root);
  if (out.length > MAX_ACTIVITIES) refuse('This file holds more than 50 workouts. Export fewer at a time.');
  return out;
}

/**
 * Session AK (4.7): where a workout's import summary lives. GPX and TCX keep `imported` (the key older builds read); every
 * newer source (FIT, Strava's archive, Strong, Hevy) keeps `fileImport`, a new optional key older builds pass through.
 */
export type ImportInfo = {source: string; importId: string; sport?: string; distanceKm?: number; elevationM?: number; avgHr?: number; durationSeconds?: number};
export const importInfo = (x: Workout): ImportInfo | undefined => x.imported ?? x.fileImport;
export const alreadyImported = (w: Workouts, importId: string) => w.workouts.some(x => importInfo(x)?.importId === importId);
/**
 * Adds an imported workout as a normal finished workout (no exercises; the summary under `imported`). Refuses one already
 * imported and one that starts in the future. `day` is the local date of the start (the Health time zone's, from the page);
 * it defaults to this device's.
 */
export function addImportedWorkout(w: Workouts, s: ImportSummary, now: Date, day = localDate(new Date(s.startedAt))): Workouts {
  if (alreadyImported(w, s.importId)) refuse('Already imported: this workout is in your log.');
  const startMs = Date.parse(s.startedAt);
  if (!Number.isFinite(startMs)) impossible('time');
  if (startMs > now.getTime() + 10 * 60_000) refuse('This workout starts in the future. Check the date on the device that recorded it.');
  const summary = {source: s.source, importId: s.importId, sport: clean(s.sport, 40), durationSeconds: s.durationSeconds,
    ...(s.distanceKm !== null ? {distanceKm: s.distanceKm} : {}), ...(s.elevationM !== null ? {elevationM: s.elevationM} : {}), ...(s.avgHr !== null ? {avgHr: s.avgHr} : {})};
  const workout: Workout = {id: `workout-${crypto.randomUUID()}`, name: clean(s.name, 80) || `${s.label} (imported)`, date: day, type: s.type,
    startedAt: new Date(startMs).toISOString(), endedAt: new Date(startMs + s.durationSeconds * 1000).toISOString(), exercises: [],
    ...(s.source === 'gpx' || s.source === 'tcx' ? {imported: {...summary, source: s.source}} : {fileImport: summary})};
  return workoutsSchema.parse({...w, workouts: [...w.workouts, workout]});
}
