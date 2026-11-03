import {gzipSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {buildStoredZip} from '../../export/zip';
import {addImportedWorkout} from '../../workouts/import-file';
import {emptyWorkouts} from '../../workouts/schema';
import {FitWriter, fitTime, T} from '../fit/test-encoder';
import {filesFrom, type ImportFile} from './source';
import {STOPPED} from './common';
import {isStravaExport, notInLog, readStrava, stravaDate, stravaKind, STRAVA_TOO_LARGE} from './strava';

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

  // Session AK Part 15 (F5): the security review's archive: hundreds of rows naming one big file.
  const bigGpx = '<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>' + Array.from({length: 2000}, (_, i) => `<trkpt lat="${(i / 1e5).toFixed(5)}" lon="0"><time>2026-01-01T08:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z</time></trkpt>`).join('') + '</trkseg></trk></gpx>';
  const counted = (f: ImportFile, opens: {n: number}): ImportFile => ({...f, open: () => { opens.n++; return f.open(); }});
  test('a file named by many rows is read once', async () => {
    const csv = ['Activity ID,Activity Date,Activity Name,Activity Type,Elapsed Time,Filename', ...Array.from({length: 200}, (_, i) => `${i},"Jan 1, 2026, 8:00:00 AM",x,Run,600,activities/a.gpx`)];
    const opens = {n: 0};
    const plan = await readStrava([file('activities.csv', csv.join('\n')), counted(file('activities/a.gpx', bigGpx), opens)]);
    expect(opens.n).toBe(1);
    expect(plan.summaries).toHaveLength(1);
    expect(plan.duplicates).toBe(199);
  });
  test('a damaged file named by many rows is read once and counted for each row', async () => {
    const opens = {n: 0};
    const plan = await readStrava([file('activities.csv', ['Activity Date,Activity Type,Elapsed Time,Filename', '"Oct 4, 2026, 7:00:00 AM",Run,900,activities/444.fit', '"Oct 5, 2026, 7:00:00 AM",Run,900,activities/444.fit'].join('\n')), counted(file('activities/444.fit', new Uint8Array([1, 2, 3, 4])), opens)]);
    expect(opens.n).toBe(1);
    expect(plan).toMatchObject({failed: 2, fromCsvOnly: 2});
  });
  test('the whole archive has an unpacking budget, refused in plain words', async () => {
    const gz = gzipSync(new Uint8Array(400_000)), rows = ['Activity Date,Activity Type,Elapsed Time,Filename'];
    const files = [file('activities.csv', '')];
    for (let i = 0; i < 10; i++) { rows.push(`"Oct ${i + 1}, 2026, 7:00:00 AM",Run,900,activities/${i}.fit.gz`); files.push(file(`activities/${i}.fit.gz`, gz)); }
    files[0] = file('activities.csv', rows.join('\n'));
    await expect(readStrava(files, {maxUnpackedBytes: 1_000_000})).rejects.toThrow(STRAVA_TOO_LARGE);
    expect(STRAVA_TOO_LARGE).toBe('This export’s activity files unpack to more than 1 GB, more than ZIGoals reads at once. Nothing was imported.');
    // Within the budget the same files are read (as damaged FIT files, which they are) and nothing is refused.
    expect((await readStrava(files, {maxUnpackedBytes: 10_000_000})).failed).toBe(10);
  });
  test('Stop ends the read between files', async () => {
    const controller = new AbortController(), rows = ['Activity Date,Activity Type,Elapsed Time,Filename'], files = [file('activities.csv', '')];
    for (let i = 0; i < 20; i++) { rows.push(`"Oct ${i + 1}, 2026, 7:00:00 AM",Run,900,activities/${i}.gpx`); files.push(i === 3 ? {...file(`activities/${i}.gpx`, gpx), open: () => { controller.abort(); return file('x', gpx).open(); }} : file(`activities/${i}.gpx`, gpx)); }
    files[0] = file('activities.csv', rows.join('\n'));
    await expect(readStrava(files, {signal: controller.signal})).rejects.toThrow(STOPPED);
  });
  test('duplicates among 5,000 activities are found without comparing every pair', async () => {
    const rows = ['Activity Date,Activity Type,Elapsed Time,Filename'];
    for (let i = 0; i < 5000; i++) rows.push(`${new Date(Date.UTC(2020, 0, 1) + i * 3_600_000).toISOString().slice(0, 19).replace('T', ' ')},Run,900,`);
    const started = performance.now(), plan = await readStrava([file('activities.csv', rows.join('\n'))]);
    expect(plan.summaries).toHaveLength(5000);
    const log = {...emptyWorkouts(), workouts: plan.summaries.slice(0, 2500).map((s, i) => ({id: `w${i}`, name: 'x', date: s.startedAt.slice(0, 10), type: s.type, startedAt: new Date(Date.parse(s.startedAt) + 90_000).toISOString(), endedAt: s.startedAt, exercises: []}))};
    expect(notInLog(log as never, plan.summaries).duplicates).toBe(2500);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
