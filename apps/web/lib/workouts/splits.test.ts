import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {IMPORT_MAX_CHARS, haversineMeters, readWorkoutFile} from './import-file';
import {miniXmlParser} from './mini-xml';
import {MAX_SPLITS, WORKOUT_SPLITS, WORKOUT_SPLITS_KEY, emptySplits, splitsRecordSchema} from './splits-schema';
import {computeSplits, paceText, splitPace, withSplits, withoutSplits} from './splits';

// Session AP (feature 5): pace and per-km splits from a GPX or TCX run's points, computed at import. Fictional tracks.
const read = (text: string) => readWorkoutFile(text, miniXmlParser);
/** 0.009° of latitude is about 1,000.8 m. */
const STEP = 0.0009;
const time = (base: string, s: number) => new Date(Date.parse(base) + s * 1000).toISOString().replace('.000', '');
/** A run north along 20° E: one point every 100 m (0.0009°), `secondsPer100(i)` for each step. */
function gpxRun(steps: number, secondsPer100: (i: number) => number, sport = 'running', pauseAfter?: number) {
  let t = 0; const seg: string[][] = [[]];
  for (let i = 0; i <= steps; i++) {
    if (i > 0) t += secondsPer100(i - 1);
    if (pauseAfter !== undefined && i === pauseAfter + 1) { seg.push([]); t += 600; } // a new segment after a 10-minute pause
    seg.at(-1)!.push(`<trkpt lat="${(50 + i * STEP).toFixed(5)}" lon="20"><ele>10</ele><time>${time('2026-11-01T07:00:00Z', t)}</time></trkpt>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="Fictional Watch" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Park loop</name><type>${sport}</type>${seg.map(s => `<trkseg>${s.join('')}</trkseg>`).join('')}</trk></gpx>`;
}
const tcxRun = (points: [number, number][]) => `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Running"><Id>2026-11-02T06:00:00Z</Id>
  <Lap StartTime="2026-11-02T06:00:00Z"><TotalTimeSeconds>${points.at(-1)![0]}</TotalTimeSeconds><DistanceMeters>${points.at(-1)![1]}</DistanceMeters><Track>${points.map(([s, m]) => `<Trackpoint><Time>${time('2026-11-02T06:00:00Z', s)}</Time><DistanceMeters>${m}</DistanceMeters></Trackpoint>`).join('')}</Track></Lap>
</Activity></Activities></TrainingCenterDatabase>`;

describe('splits at import', () => {
  test('a GPX run of about 2.5 km: two whole kilometres and the rest, each with its own time', () => {
    // 30 s per 100 m for the first 1 km, then 36 s, then 33 s: 5:00, 6:00 and a last 0.5 km.
    const [s] = read(gpxRun(25, i => i < 10 ? 30 : i < 20 ? 36 : 33));
    const splits = s!.splits!;
    expect(splits.source).toBe('gpx');
    expect(splits.splits.map(x => [x.km, x.meters])).toEqual([[1, 1000], [2, 1000], [3, 502]]);
    expect(splits.splits[0]!.seconds).toBeGreaterThanOrEqual(299); expect(splits.splits[0]!.seconds).toBeLessThanOrEqual(301);
    expect(splits.splits[1]!.seconds).toBeGreaterThanOrEqual(359); expect(splits.splits[1]!.seconds).toBeLessThanOrEqual(361);
    expect(Math.abs(splitPace(splits.splits[2]!) - 330)).toBeLessThan(3);
    expect(splits.paceSecondsPerKm).toBe(Math.round(825 / 2.502));
    expect(paceText(splits.paceSecondsPerKm)).toMatch(/^5:\d\d \/km$/);
    expect(JSON.stringify(s)).not.toMatch(/lat|lon|trkpt/);
  });
  test('a pause between segments is not counted as running time', () => {
    const [s] = read(gpxRun(12, () => 30, 'running', 6));
    expect(s!.durationSeconds).toBeGreaterThan(900); // the summary keeps the whole length, as before
    expect(s!.splits!.splits[0]!.seconds).toBeLessThanOrEqual(301);
  });
  test('a TCX run reads its own distances; a GPS jump faster than 15 m/s is skipped', () => {
    const [s] = read(tcxRun([[0, 0], [300, 1000], [600, 2000], [601, 2600], [700, 2300 + 0], [760, 2500]]));
    // 1 km at 5:00, 1 km at 5:00; 2000→2600 m in 1 s is a jump, 2600→2300 goes backwards: both skipped.
    expect(s!.splits!.splits.slice(0, 2)).toEqual([{km: 1, meters: 1000, seconds: 300}, {km: 2, meters: 1000, seconds: 300}]);
    expect(s!.splits!.source).toBe('tcx');
  });
  test('only runs get splits; a short or pointless track gives none (never a made-up pace)', () => {
    expect(read(gpxRun(25, () => 30, 'cycling'))[0]!.splits).toBeUndefined();
    expect(read(gpxRun(1, () => 30))[0]!.splits).toBeNull(); // 100 m
    expect(computeSplits([[{t: 0, lat: null, lon: null, dist: null}, {t: 600_000, lat: null, lon: null, dist: null}]], haversineMeters, 'gpx')).toBeNull();
  });
  test('more than 300 km keeps the pace only', () => {
    const points = [{t: 0, lat: null, lon: null, dist: 0}, ...Array.from({length: 310}, (_, i) => ({t: (i + 1) * 360_000, lat: null, lon: null, dist: (i + 1) * 1000}))];
    const r = computeSplits([points], haversineMeters, 'tcx')!;
    expect(r.splits).toEqual([]);
    expect(r.paceSecondsPerKm).toBe(360);
    expect(MAX_SPLITS).toBe(300);
  });
});

describe('safe parsing (owner rule: a size limit, no network, no external entities, plain field errors)', () => {
  test('a DOCTYPE with an entity is refused before parsing', () => {
    const evil = '<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]><gpx><trk><name>&lol2;</name></trk></gpx>';
    expect(() => read(evil)).toThrow(/declares its own XML entities/);
  });
  test('an external DTD or entity is refused before parsing, whatever its case', () => {
    expect(() => read('<?xml version="1.0"?><!doctype gpx SYSTEM "http://example.invalid/evil.dtd"><gpx/>')).toThrow(/declares a document type \(DOCTYPE\)/);
    expect(() => read('<?xml version="1.0"?><!DOCTYPE gpx PUBLIC "-//x//y" "file:///etc/passwd"><gpx/>')).toThrow(/DOCTYPE/);
  });
  test('an oversized file is refused before parsing, with the limit in the sentence', () => {
    expect(() => read(`<gpx>${'<!-- x -->'.repeat(IMPORT_MAX_CHARS / 10 + 1)}</gpx>`)).toThrow(/larger than 5 MB/);
  });
  test('a broken or foreign file says so plainly', () => {
    expect(() => read('<gpx><trk>')).toThrow(/could not be read as XML/);
    expect(() => read('<kml/>')).toThrow(/not a GPX or TCX file/);
  });
});

describe('the workout-splits record', () => {
  const memory = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)}; };
  test('its own key; written by workout id; removed with its workout; unreadable bytes read as empty', () => {
    expect(WORKOUT_SPLITS.key).toBe(WORKOUT_SPLITS_KEY);
    expect(WORKOUT_SPLITS_KEY).toBe('zigoals:workout-splits:v1');
    const s = memory(), one = {source: 'gpx' as const, paceSecondsPerKm: 330, splits: [{km: 1, meters: 1000, seconds: 330}]};
    updateDeviceRecord(s, WORKOUT_SPLITS, r => withSplits(r, 'workout-abc', one));
    expect(readDeviceRecord(s, WORKOUT_SPLITS).data.workouts).toEqual({'workout-abc': one});
    expect(withoutSplits(readDeviceRecord(s, WORKOUT_SPLITS).data, 'workout-abc')).toEqual(emptySplits());
    s.setItem(WORKOUT_SPLITS_KEY, '{"version":1,"workouts":{"x":{"source":"fit","paceSecondsPerKm":300,"splits":[]}}}');
    expect(readDeviceRecord(s, WORKOUT_SPLITS)).toEqual({data: emptySplits(), unreadable: true});
  });
  test('earlier imports are never back-filled: a workout without splits simply has none', () => {
    const r = withSplits(emptySplits(), 'workout-new', {source: 'tcx', paceSecondsPerKm: 300, splits: []});
    expect(Object.keys(r.workouts)).toEqual(['workout-new']);
    expect(splitsRecordSchema.safeParse({...r, workouts: {...r.workouts, 'workout-old': {source: 'gpx', paceSecondsPerKm: 20, splits: []}}}).success).toBe(false);
  });
});

// Security delta (Low, Session AP): points that span far more time than the laps say give no splits, never a thrown error.
test('an implausible split (one step of 200,000 s) gives no splits instead of failing the import', () => {
  const start = Date.parse('2026-11-01T08:00:00Z');
  const seg = [{lat: 50.85, lon: 4.35, t: start}, {lat: 50.8545, lon: 4.35, t: start + 200_000_000}, {lat: 50.859, lon: 4.35, t: start + 200_300_000}];
  expect(computeSplits([seg as never], (a, b) => Math.abs((b as {lat: number}).lat - (a as {lat: number}).lat) * 111_000, 'tcx')).toBeNull();
});
