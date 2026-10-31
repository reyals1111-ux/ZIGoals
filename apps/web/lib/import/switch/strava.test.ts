import {gzipSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {buildStoredZip} from '../../export/zip';
import {addImportedWorkout} from '../../workouts/import-file';
import {emptyWorkouts} from '../../workouts/schema';
import {FitWriter, fitTime, T} from '../fit/test-encoder';
import {filesFrom, type ImportFile} from './source';
import {isStravaExport, notInLog, readStrava, stravaDate, stravaKind} from './strava';

// Session AK (4.7): Strava's bulk export ZIP. Fictional activities.
const fit = (iso: string, seconds: number, meters: number) => new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4])
  .define(1, 18, [[2, T.uint32], [5, T.enum], [7, T.uint32], [9, T.uint32], [16, T.uint8]]).data(1, [fitTime(iso), 1, seconds * 1000, meters * 100, 151]).file();
const gpx = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>From file</name><type>cycling</type><trkseg>
<trkpt lat="10" lon="20"><time>2026-10-02T06:00:00Z</time></trkpt><trkpt lat="10.01" lon="20"><time>2026-10-02T06:20:00Z</time></trkpt></trkseg></trk></gpx>`;
const CSV = ['Activity ID,Activity Date,Activity Name,Activity Type,Activity Description,Elapsed Time,Distance,Filename,Elapsed Time',
  '1,"Oct 1, 2026, 6:00:00 AM",Morning Run,Run,,1800,5.0,activities/111.fit.gz,1800',
  '2,"Oct 2, 2026, 6:00:00 AM",Commute,Ride,,1200,3.3,activities/222.gpx,1200',
  '3,"Oct 3, 2026, 5:30:00 PM",Gym,Weight Training,,3600,0,,3600',
  '4,"Oct 4, 2026, 7:00:00 AM",Broken,Run,,900,2,activities/444.fit,900',
  '5,"Oct 1, 2026, 6:01:00 AM",Same run again,Run,,1800,5.0,,1800',
  '6,"sometime",Lost,Run,,,,,',
].join('\n');
const file = (path: string, bytes: Uint8Array | string): ImportFile => {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  return {path, size: data.length, open: async () => new Blob([data as Uint8Array<ArrayBuffer>]).stream() as ReadableStream<Uint8Array>};
};
const FILES = [file('export_123/activities.csv', CSV), file('export_123/activities/111.fit.gz', gzipSync(fit('2026-10-01T06:00:00Z', 1800, 5000))),
  file('export_123/activities/222.gpx', gpx), file('export_123/activities/444.fit', new Uint8Array([1, 2, 3, 4])), file('export_123/profile.csv', 'x')];

describe('Strava’s bulk export', () => {
  test('dates and types in Strava’s words', () => {
    expect(new Date(stravaDate('Oct 1, 2026, 6:00:00 AM')!).toISOString()).toBe('2026-10-01T06:00:00.000Z');
    expect(new Date(stravaDate('Oct 1, 2026, 12:30:00 PM')!).toISOString()).toBe('2026-10-01T12:30:00.000Z');
    expect(new Date(stravaDate('Oct 1, 2026, 12:05:00 AM')!).toISOString()).toBe('2026-10-01T00:05:00.000Z');
    expect(new Date(stravaDate('1 Oct 2026, 18:00:00')!).toISOString()).toBe('2026-10-01T18:00:00.000Z');
    expect([stravaDate('Feb 30, 2026, 1:00:00 AM'), stravaDate('13:00 PM'), stravaDate('')]).toEqual([null, null, null]);
    expect(stravaKind('Weight Training')).toEqual({sport: 'Weight Training', label: 'Workout', type: 'strength'});
    expect(stravaKind('Ride')).toEqual({sport: 'Ride', label: 'Ride', type: 'cardio'});
    expect(stravaKind('Yoga').type).toBe('mobility');
  });
  test('activities.csv plus the files: FIT (gzip), GPX, the CSV alone; damaged files, duplicates and unreadable rows counted', async () => {
    expect(isStravaExport(FILES)).toBe(true);
    const plan = await readStrava(FILES);
    expect(plan.summaries.map(s => [s.name, s.source, s.label, s.type, s.startedAt, s.durationSeconds, s.distanceKm, s.avgHr])).toEqual([
      ['Morning Run', 'fit', 'Run', 'cardio', '2026-10-01T06:00:00.000Z', 1800, 5, 151],
      ['Commute', 'gpx', 'Ride', 'cardio', '2026-10-02T06:00:00.000Z', 1200, expect.any(Number), null],
      ['Gym', 'strava', 'Workout', 'strength', '2026-10-03T17:30:00.000Z', 3600, null, null],
      ['Broken', 'strava', 'Run', 'cardio', '2026-10-04T07:00:00.000Z', 900, null, null],
    ]);
    expect(plan).toMatchObject({fromCsvOnly: 2, failed: 1, duplicates: 1});
    expect(plan.warnings.join(' ')).toMatch(/1 activity file could not be read/);
    expect(plan.warnings.join(' ')).toMatch(/1 row in activities.csv had neither/);
  });
  test('read from a real ZIP through the streaming reader', async () => {
    const zip = buildStoredZip([{name: 'activities.csv', data: CSV, modified: new Date('2026-10-05T00:00:00Z')}, {name: 'activities/222.gpx', data: gpx, modified: new Date('2026-10-05T00:00:00Z')}]);
    const plan = await readStrava(await filesFrom([new File([zip as Uint8Array<ArrayBuffer>], 'export_123.zip', {type: 'application/zip'})]));
    expect(plan.summaries.find(s => s.name === 'Commute')?.source).toBe('gpx');
  });
  test('against the log: already imported, or the same type within two minutes, is skipped', async () => {
    const plan = await readStrava(FILES);
    let w = addImportedWorkout(emptyWorkouts(), plan.summaries[0]!, new Date('2026-10-30T00:00:00Z'), '2026-10-01');
    w = {...w, workouts: [...w.workouts, {id: 'workout-own', name: 'Ride', date: '2026-10-02', type: 'cardio', startedAt: '2026-10-02T06:01:30.000Z', endedAt: '2026-10-02T06:30:00.000Z', exercises: []}]};
    const {fresh, duplicates} = notInLog(w, plan.summaries);
    expect(duplicates).toBe(2); expect(fresh.map(s => s.name)).toEqual(['Gym', 'Broken']);
    // A CSV-only row is kept under the new key, never under `imported`.
    const gym = addImportedWorkout(emptyWorkouts(), plan.summaries[2]!, new Date('2026-10-30T00:00:00Z'), '2026-10-03').workouts[0]!;
    expect(gym.imported).toBeUndefined(); expect(gym.fileImport?.source).toBe('strava');
  });
  test('refusals: no activities.csv, other columns, nothing readable', async () => {
    await expect(readStrava([file('a/profile.csv', 'x')])).rejects.toThrow(/activities.csv is missing/);
    await expect(readStrava([file('activities.csv', 'Aktivitäts-ID,Datum\n1,2')])).rejects.toThrow(/other columns/);
    await expect(readStrava([file('activities.csv', 'Activity Date,Activity Type\nnever,Run')])).rejects.toThrow(/no activity ZIGoals can read/);
    await expect(readStrava([file('activities.csv', '')])).rejects.toThrow(/empty/);
  });
});
