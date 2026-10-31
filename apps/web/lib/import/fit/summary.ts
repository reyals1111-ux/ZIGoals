import {haversineMeters, IMPORT_MAX_SECONDS, importIdFor, sportLabel, type ImportSummary} from '../../workouts/import-file';
import {decodeFit, TIMESTAMP_FIELD, type FitMessage} from './decode';

/**
 * Session AK (4.7): a FIT activity file as the same summary a GPX or TCX import makes (lib/workouts/import-file.ts):
 * start, length, distance, climb and average heart rate, one per session (a multisport file has several). It reads
 * file_id (0), session (18), lap (19), record (20) and activity (34). The file's own session totals come first; points
 * are used only to work out what a session does not say, and are never kept. Profile numbers: FORMATS.md section f.
 */
export const FIT_EPOCH_OFFSET_S = 631_065_600;
/** date_time values below this are seconds since the device was switched on, not a clock time. */
const FIT_MIN_CLOCK = 0x10000000;
const CLIMB_NOISE_M = 1;
const SPORTS: Record<number, string> = {
  0: 'generic', 1: 'running', 2: 'cycling', 3: 'transition', 4: 'fitness equipment', 5: 'swimming', 6: 'basketball', 7: 'soccer', 8: 'tennis',
  9: 'american football', 10: 'training', 11: 'walking', 12: 'cross-country skiing', 13: 'alpine skiing', 14: 'snowboarding', 15: 'rowing',
  16: 'mountaineering', 17: 'hiking', 18: 'multisport', 19: 'paddling', 20: 'flying', 21: 'e-biking', 22: 'motorcycling', 23: 'boating', 24: 'driving',
  25: 'golf', 26: 'hang gliding', 27: 'horseback riding', 28: 'hunting', 29: 'fishing', 30: 'inline skating', 31: 'rock climbing', 32: 'sailing',
  33: 'ice skating', 34: 'sky diving', 35: 'snowshoeing', 36: 'snowmobiling', 37: 'stand up paddleboarding', 38: 'surfing', 39: 'wakeboarding',
  40: 'water skiing', 41: 'kayaking', 42: 'rafting', 43: 'windsurfing', 44: 'kitesurfing', 45: 'tactical', 46: 'jumpmaster', 47: 'boxing', 48: 'floor climbing',
};
export const fitSportWord = (sport: number | null) => sport === null ? '' : SPORTS[sport] ?? '';
const refuse = (sentence: string): never => { throw new Error(sentence); };
const impossible = (what: string): never => refuse(`This file has an impossible ${what}, so nothing was imported.`);

const num = (m: FitMessage, field: number): number | null => { const v = m.fields.get(field); return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const scaled = (m: FitMessage, field: number, scale: number, offset = 0): number | null => { const v = num(m, field); return v === null ? null : v / scale - offset; };
/** A FIT date_time in Unix milliseconds; null when absent or only a device-relative count. */
export const fitTimeMs = (value: number | null): number | null => value === null || value < FIT_MIN_CLOCK ? null : (value + FIT_EPOCH_OFFSET_S) * 1000;
const hr = (v: number | null) => v !== null && v >= 20 && v <= 250 ? v : null;

type Session = {start: number | null; end: number | null; sport: number | null; elapsed: number | null; timer: number | null; meters: number | null; avgHr: number | null; ascent: number | null};
type Totals = {first: number | null; last: number | null; hrSum: number; hrN: number; distMin: number | null; distMax: number | null; gps: number; gpsAny: boolean;
  prev: {lat: number; lon: number} | null; gain: number; gainAny: boolean; ref: number | null};
const freshTotals = (): Totals => ({first: null, last: null, hrSum: 0, hrN: 0, distMin: null, distMax: null, gps: 0, gpsAny: false, prev: null, gain: 0, gainAny: false, ref: null});
const SEMICIRCLE = 180 / 2 ** 31;

/** Reads a FIT activity file's bytes into one summary per session, or throws a plain sentence. */
export function readFitFile(bytes: Uint8Array): ImportSummary[] {
  // Pass 1: the file's own summaries (file_id, session, lap, activity). Records are skipped here.
  let fileType: number | null = null, sawFileId = false, anyRecord = false;
  const sessions: Session[] = [], laps: Session[] = [];
  decodeFit(bytes, m => {
    if (m.global === 0) { sawFileId = true; fileType = num(m, 0); }
    else if (m.global === 18 || m.global === 19) {
      const start = fitTimeMs(num(m, 2)), end = fitTimeMs(num(m, TIMESTAMP_FIELD));
      const s: Session = {start, end, sport: m.global === 18 ? num(m, 5) : null, elapsed: scaled(m, 7, 1000), timer: scaled(m, 8, 1000), meters: scaled(m, 9, 100),
        avgHr: hr(num(m, m.global === 18 ? 16 : 15)), ascent: m.global === 18 ? num(m, 22) : num(m, 21)};
      (m.global === 18 ? sessions : laps).push(s);
    } else if (m.global === 20) anyRecord = true;
  });
  if (sawFileId && fileType !== null && fileType !== 4) refuse('This FIT file is not a recorded activity (it holds a course, a workout plan or settings). Export the activity itself.');
  if (!sessions.length && !laps.length && !anyRecord) refuse('This FIT file has no recorded activity in it. Export the activity itself.');
  // Without a session message, the laps (or else the points) stand in for one session.
  const plan: Session[] = sessions.length ? sessions : [laps.length ? {
    start: laps.map(l => l.start).filter((t): t is number => t !== null).sort((a, b) => a - b)[0] ?? null,
    end: laps.map(l => l.end).filter((t): t is number => t !== null).sort((a, b) => b - a)[0] ?? null, sport: null,
    elapsed: sumOrNull(laps.map(l => l.elapsed)), timer: sumOrNull(laps.map(l => l.timer)), meters: sumOrNull(laps.map(l => l.meters)), avgHr: weightedHr(laps), ascent: sumOrNull(laps.map(l => l.ascent)),
  } : {start: null, end: null, sport: null, elapsed: null, timer: null, meters: null, avgHr: null, ascent: null}];
  if (plan.length > 50) refuse('This file holds more than 50 workouts. Export fewer at a time.');

  // Pass 2: points, only to fill in what a session does not say. Each point goes to the session whose time holds it.
  const windows = plan.map(s => ({from: s.start, to: s.start !== null && (s.elapsed ?? s.timer) !== null ? s.start + (s.elapsed ?? s.timer)! * 1000 : s.end}));
  const totals = plan.map(freshTotals);
  if (anyRecord) decodeFit(bytes, m => {
    if (m.global !== 20) return;
    const t = fitTimeMs(num(m, TIMESTAMP_FIELD));
    let i = plan.length === 1 ? 0 : -1;
    if (plan.length > 1) { if (t === null) return; i = windows.findIndex(w => w.from !== null && w.to !== null && t >= w.from && t <= w.to); if (i < 0) return; }
    const x = totals[i]!;
    if (t !== null) { x.first = x.first === null ? t : Math.min(x.first, t); x.last = x.last === null ? t : Math.max(x.last, t); }
    const h = hr(num(m, 3)); if (h !== null) { x.hrSum += h; x.hrN++; }
    const d = scaled(m, 5, 100); if (d !== null && d >= 0) { x.distMin = x.distMin === null ? d : Math.min(x.distMin, d); x.distMax = x.distMax === null ? d : Math.max(x.distMax, d); }
    const lat = num(m, 0), lon = num(m, 1);
    if (lat !== null && lon !== null) {
      const here = {lat: lat * SEMICIRCLE, lon: lon * SEMICIRCLE};
      if (Math.abs(here.lat) > 90 || Math.abs(here.lon) > 180) impossible('position');
      if (x.prev) { x.gps += haversineMeters(x.prev, here); x.gpsAny = true; }
      x.prev = here;
    }
    const ele = scaled(m, 78, 5, 500) ?? scaled(m, 2, 5, 500);
    if (ele !== null) {
      // The same climb rule as GPX and TCX: rises of at least a metre count, small wobbles do not.
      x.gainAny = true;
      if (x.ref === null || ele < x.ref) x.ref = ele;
      else if (ele - x.ref >= CLIMB_NOISE_M) { x.gain += ele - x.ref; x.ref = ele; }
    }
  });

  return plan.map((s, i) => {
    const x = totals[i]!;
    const start = s.start ?? x.first;
    if (start === null) refuse('This file has no times, so its start and length are unknown. Export it again with times included.');
    const seconds = s.elapsed ?? s.timer ?? (x.first !== null && x.last !== null ? (x.last - x.first) / 1000 : null) ?? (s.end !== null ? (s.end - start!) / 1000 : null);
    if (seconds === null) refuse('This file has no times, so its start and length are unknown. Export it again with times included.');
    if (!Number.isFinite(seconds!) || seconds! < 0) impossible('length of time');
    if (seconds! > IMPORT_MAX_SECONDS) refuse('This workout lasts more than 48 hours, which is longer than one workout can be.');
    if (Math.round(seconds!) < 1) refuse('This workout has no length of time, so nothing was imported.');
    const meters = s.meters ?? (x.distMax !== null ? x.distMax - (x.distMin ?? 0) : x.gpsAny ? x.gps : null);
    if (meters !== null && (meters < 0 || meters / 1000 > 2000)) impossible('distance');
    const gain = s.ascent ?? (x.gainAny ? x.gain : null);
    if (gain !== null && (gain < 0 || gain > 20_000)) impossible('climb');
    const avg = s.avgHr ?? (x.hrN ? x.hrSum / x.hrN : null), avgHr = avg === null ? null : Math.round(avg);
    const sport = fitSportWord(s.sport), {label, type} = sportLabel(sport);
    return {source: 'fit', importId: importIdFor(start!, seconds!, meters), name: `${label} (imported)`, sport, label, type,
      startedAt: new Date(start!).toISOString(), durationSeconds: Math.round(seconds!), distanceKm: meters === null ? null : Math.round(meters) / 1000,
      elevationM: gain === null ? null : Math.round(gain), avgHr: avgHr !== null && avgHr >= 20 && avgHr <= 250 ? avgHr : null} satisfies ImportSummary;
  });
}
function sumOrNull(xs: (number | null)[]): number | null { return xs.some(x => x !== null) ? xs.reduce<number>((t, x) => t + (x ?? 0), 0) : null; }
function weightedHr(laps: Session[]): number | null {
  const known = laps.filter(l => l.avgHr !== null).map(l => ({hr: l.avgHr!, w: l.elapsed ?? l.timer ?? 1}));
  const total = known.reduce((t, x) => t + x.w, 0);
  return known.length && total > 0 ? known.reduce((t, x) => t + x.hr * x.w, 0) / total : null;
}
