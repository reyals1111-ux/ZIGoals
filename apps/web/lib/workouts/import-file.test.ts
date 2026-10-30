// @vitest-environment jsdom
import {describe, expect, test} from 'vitest';
import {addImportedWorkout, alreadyImported, elevationGain, importIdFor, readWorkoutFile} from './import-file';
import {emptyWorkouts, workoutSchema, workoutsSchema} from './schema';
import {miniXmlParser, parseXml, XmlReadError} from './mini-xml';

// Session AJ (item 27, D12): GPX and TCX import, summary only. Fictional places, times and readings.
// The app reads files with its own strict XML reader (lib/workouts/mini-xml.ts: the browser's DOMParser is a Trusted Types
// sink under the app's CSP); jsdom's DOMParser is kept as a cross-check below.
const parser = miniXmlParser;
const read = (text: string) => readWorkoutFile(text, parser);
const gpxPoint = (lat: number, time: string | null, ele: number | null, hr: number | null) =>
  `<trkpt lat="${lat}" lon="20">${ele === null ? '' : `<ele>${ele}</ele>`}${time ? `<time>${time}</time>` : ''}${hr === null ? '' : `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`}</trkpt>`;
const gpx = (points: string, extra = '') => `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Fictional Watch" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata><name>Fictional file</name></metadata>
  <trk><name>Morning Run</name><type>running</type>${extra}<trkseg>${points}</trkseg></trk>
</gpx>`;
const RUN = gpx([
  gpxPoint(10.000, '2026-10-01T08:00:00Z', 100, 120),
  gpxPoint(10.001, '2026-10-01T08:01:00Z', 100.5, 130),
  gpxPoint(10.002, '2026-10-01T08:02:00Z', 102, 0),
  gpxPoint(10.003, '2026-10-01T08:03:00Z', 101, 140),
].join(''));
const tcxLap = (start: string, seconds: string, meters: string, hr: number | null, points: string) =>
  `<Lap StartTime="${start}"><TotalTimeSeconds>${seconds}</TotalTimeSeconds><DistanceMeters>${meters}</DistanceMeters>${hr === null ? '' : `<AverageHeartRateBpm><Value>${hr}</Value></AverageHeartRateBpm>`}<Track>${points}</Track></Lap>`;
const tcxPoint = (time: string, alt: number | null) => `<Trackpoint><Time>${time}</Time>${alt === null ? '' : `<AltitudeMeters>${alt}</AltitudeMeters>`}</Trackpoint>`;
const tcx = (laps: string, sport = 'Biking') => `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="${sport}"><Id>2026-10-02T06:00:00Z</Id>${laps}</Activity></Activities>
</TrainingCenterDatabase>`;
const RIDE = tcx(tcxLap('2026-10-02T06:00:00Z', '600', '4000', 140, tcxPoint('2026-10-02T06:00:00Z', 50) + tcxPoint('2026-10-02T06:05:00Z', 55))
  + tcxLap('2026-10-02T06:10:00Z', '1200', '8000', 150, tcxPoint('2026-10-02T06:10:00Z', 53) + tcxPoint('2026-10-02T06:20:00Z', 60)));

describe('reading a GPX file', () => {
  test('one summary per track: start, length, distance, climb and average heart rate', () => {
    const [s, ...rest] = read(RUN);
    expect(rest).toEqual([]);
    expect(s).toMatchObject({source: 'gpx', name: 'Morning Run', sport: 'running', label: 'Run', type: 'cardio',
      startedAt: '2026-10-01T08:00:00.000Z', durationSeconds: 180, elevationM: 2, avgHr: 130});
    // Three steps of 0.001° of latitude, about 111.2 m each.
    expect(s!.distanceKm).toBeCloseTo(0.334, 2);
    expect(s!.importId).toBe('20261001T0800Z-180s-330m');
    expect(JSON.stringify(s)).not.toContain('trkpt');
  });
  test('no heart rate and no elevation read as null; a nameless track is named by its sport', () => {
    const [s] = read(gpx(gpxPoint(10, '2026-10-01T08:00:00Z', null, null) + gpxPoint(10.01, '2026-10-01T08:10:00Z', null, null)).replace('<name>Morning Run</name>', '').replace('<metadata><name>Fictional file</name></metadata>', ''));
    expect(s).toMatchObject({avgHr: null, elevationM: null, name: 'Run (imported)', durationSeconds: 600});
  });
  test('the climb ignores wobbles under 1 m and counts slow rises', () => {
    expect(elevationGain([[10, 10.8, 10, 10.8, 10]])).toBe(0);
    expect(elevationGain([[0, 0.5, 1, 1.5, 2]])).toBe(2);
    expect(elevationGain([[5, 8], [100, 104]])).toBe(7);
    expect(elevationGain([[null, null]])).toBeNull();
  });
  test('an unknown sport is "other"', () => {
    const [s] = read(RUN.replace('<type>running</type>', '<type>rowing</type>'));
    expect(s).toMatchObject({type: 'other', label: 'Workout', sport: 'rowing'});
  });
});

describe('reading a TCX file', () => {
  test('laps add up; heart rate is the laps’ average weighted by time', () => {
    const [s] = read(RIDE);
    expect(s).toMatchObject({source: 'tcx', sport: 'Biking', label: 'Ride', type: 'cardio', name: 'Ride (imported)',
      startedAt: '2026-10-02T06:00:00.000Z', durationSeconds: 1800, distanceKm: 12, elevationM: 12, avgHr: 147});
  });
  test('without heart rate or altitude those stay empty', () => {
    const [s] = read(tcx(tcxLap('2026-10-02T06:00:00Z', '900', '2500', null, tcxPoint('2026-10-02T06:00:00Z', null)), 'Running'));
    expect(s).toMatchObject({avgHr: null, elevationM: null, durationSeconds: 900, distanceKm: 2.5, label: 'Run'});
  });
  test('trackpoint heart rates are averaged when the laps have none', () => {
    const point = (t: string, hr: number) => `<Trackpoint><Time>${t}</Time><HeartRateBpm><Value>${hr}</Value></HeartRateBpm></Trackpoint>`;
    const [s] = read(tcx(tcxLap('2026-10-02T06:00:00Z', '600', '1000', null, point('2026-10-02T06:00:00Z', 100) + point('2026-10-02T06:10:00Z', 111))));
    expect(s!.avgHr).toBe(106);
  });
});

describe('importing twice', () => {
  test('the same workout has the same id and is refused the second time', () => {
    const [s] = read(RUN), now = new Date('2026-10-05T12:00:00Z');
    const w = addImportedWorkout(emptyWorkouts(), s!, now, '2026-10-01');
    const x = w.workouts[0]!;
    expect(x).toMatchObject({name: 'Morning Run', date: '2026-10-01', type: 'cardio', startedAt: '2026-10-01T08:00:00.000Z', endedAt: '2026-10-01T08:03:00.000Z', exercises: [],
      imported: {source: 'gpx', importId: s!.importId, sport: 'running', durationSeconds: 180, elevationM: 2, avgHr: 130}});
    expect(workoutsSchema.safeParse(w).success).toBe(true);
    expect(alreadyImported(w, read(RUN)[0]!.importId)).toBe(true);
    expect(() => addImportedWorkout(w, read(RUN)[0]!, now, '2026-10-01')).toThrow(/^Already imported/);
    expect(addImportedWorkout(w, read(RIDE)[0]!, now, '2026-10-02').workouts).toHaveLength(2);
  });
  test('rounding: a few seconds or metres apart is the same workout', () => {
    expect(importIdFor(Date.parse('2026-10-01T08:00:10Z'), 1802, 5003)).toBe(importIdFor(Date.parse('2026-10-01T07:59:55Z'), 1798, 4998));
    expect(importIdFor(Date.parse('2026-10-01T08:00:00Z'), 1800, null)).toBe('20261001T0800Z-1800s-nodist');
  });
  test('a workout in the future is refused', () => {
    expect(() => addImportedWorkout(emptyWorkouts(), read(RUN)[0]!, new Date('2026-09-01T00:00:00Z'), '2026-10-01')).toThrow(/future/);
  });
});

describe('refusals, each a plain sentence', () => {
  const cases: [string, string, RegExp][] = [
    ['not XML', 'hello, this is a text file', /could not be read as XML/],
    ['broken XML', '<gpx><trk></gpx>', /could not be read as XML/],
    ['neither GPX nor TCX', '<?xml version="1.0"?><kml><Document/></kml>', /not a GPX or TCX file/],
    ['empty', '   ', /empty/],
    ['no timestamps', gpx(gpxPoint(10, null, 5, null) + gpxPoint(10.1, null, 6, null)), /no times/],
    ['entity declarations', '<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY a "aaaaaaaa">]><gpx>&a;</gpx>', /entities/],
    ['over 48 hours', gpx(gpxPoint(10, '2026-10-01T08:00:00Z', null, null) + gpxPoint(10.1, '2026-10-03T08:00:01Z', null, null)), /more than 48 hours/],
    ['a negative length', tcx(tcxLap('2026-10-02T06:00:00Z', '-5', '1000', null, '')), /impossible length of time/],
    ['a negative distance', tcx(tcxLap('2026-10-02T06:00:00Z', '60', '-1000', null, '')), /impossible distance/],
    ['an elevation that is not a number', gpx(gpxPoint(10, '2026-10-01T08:00:00Z', null, null).replace('<time>', '<ele>abc</ele><time>') + gpxPoint(10.1, '2026-10-01T08:10:00Z', null, null)), /impossible elevation/],
    ['a position off the globe', gpx(gpxPoint(95, '2026-10-01T08:00:00Z', null, null) + gpxPoint(10.1, '2026-10-01T08:10:00Z', null, null)), /impossible position/],
    ['an unreadable time', gpx(gpxPoint(10, 'yesterday', null, null)), /impossible time/],
    ['no length of time', gpx(gpxPoint(10, '2026-10-01T08:00:00Z', null, null)), /no length of time/],
    ['no track', '<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="1" lon="1"/></gpx>', /no recorded track/],
  ];
  test.each(cases)('%s', (_label, text, sentence) => {
    expect(() => read(text)).toThrow(sentence);
  });
  test('more than 5 MB of text', () => {
    expect(() => read(`<gpx>${' '.repeat(5 * 1024 * 1024)}</gpx>`)).toThrow(/larger than 5 MB/);
  });
  test('more than 200,000 track points', () => {
    expect(() => read(`<gpx><trk><trkseg>${'<trkpt/>'.repeat(200_001)}</trkseg></trk></gpx>`)).toThrow(/more than 200,000 track points/);
  });
});

describe('the stored workout', () => {
  const base = {id: 'workout-1', name: 'Morning Run', date: '2026-10-01', type: 'cardio', startedAt: '2026-10-01T08:00:00.000Z', endedAt: '2026-10-01T08:30:00.000Z', exercises: []};
  test('reads with and without `imported`, and keeps fields it does not know', () => {
    expect(workoutSchema.parse(base)).not.toHaveProperty('imported');
    const withImport = workoutSchema.parse({...base, laterField: 'kept', imported: {source: 'tcx', importId: '20261001T0800Z-1800s-5000m', sport: 'Running', distanceKm: 5, elevationM: 40, avgHr: 150, durationSeconds: 1800, laterNested: 1}});
    expect(withImport).toMatchObject({laterField: 'kept', imported: {source: 'tcx', distanceKm: 5, avgHr: 150, laterNested: 1}});
  });
  test('an unreadable `imported` value is dropped, never a reason to refuse the workout', () => {
    const parsed = workoutSchema.safeParse({...base, imported: {source: 'kml', importId: '../../x', sport: 'Running', durationSeconds: -1}});
    expect(parsed.success).toBe(true);
    expect(parsed.data!.imported).toBeUndefined();
  });
});

describe('the strict XML reader (Trusted Types safe)', () => {
  test('gives the same summaries as the browser\'s DOMParser for GPX', () => {
    expect(readWorkoutFile(RUN, miniXmlParser)).toEqual(readWorkoutFile(RUN, new DOMParser()));
  });
  test('reads attributes, CDATA, comments and the standard entities; refuses broken or odd documents', () => {
    const d = parseXml('<?xml version="1.0"?><!-- c --><a x="1 &amp; 2"><b>t&lt;<![CDATA[<raw>]]>&#65;</b><c/></a>');
    expect(d.documentElement.getAttribute('x')).toBe('1 & 2');
    expect(d.documentElement.getElementsByTagNameNS('*', 'b')[0]!.textContent).toBe('t<<raw>A');
    expect(d.documentElement.children.map(c => c.localName)).toEqual(['b', 'c']);
    for (const bad of ['<a><b></a>', '<a>', '<a></a><b/>', 'text<a/>', '<a x="1" x="2"/>', '<a>&nope;</a>', '<!DOCTYPE a [<!ELEMENT a ANY>]><a/>', '']) expect(() => parseXml(bad), bad).toThrow(XmlReadError);
  });
});
