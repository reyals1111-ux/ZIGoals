import {gzipSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {addImportedWorkout, alreadyImported, importInfo} from '../../workouts/import-file';
import {emptyWorkouts, workoutsSchema} from '../../workouts/schema';
import {decodeFit, fitCrc, FIT_ERRORS, type FitMessage} from './decode';
import {fileBytes, gunzip, GZIP_ERRORS, readFitBlob} from './gzip';
import {fitTimeMs, readFitFile} from './summary';
import {FitWriter, fitTime, T} from './test-encoder';

// Session AK (4.7): the hand-written FIT reader, against synthetic files written byte by byte. Fictional readings.
const START = '2026-10-01T08:00:00Z', start = fitTime(START);
const SEMI = 2 ** 31 / 180;
/** file_id (local 0), record (local 1: timestamp, lat, lon, heart rate, distance, enhanced altitude), session (local 2). */
function run({session = true, records = 4, big = false}: {session?: boolean; records?: number; big?: boolean} = {}) {
  const w = new FitWriter()
    .define(0, 0, [[0, T.enum], [1, T.uint16], [4, T.uint32]]).data(0, [4, 1, start])
    .define(1, 20, [[253, T.uint32], [0, T.sint32], [1, T.sint32], [3, T.uint8], [5, T.uint32], [78, T.uint32]], {big});
  for (let i = 0; i < records; i++) w.data(1, [start + i * 60, Math.round((10 + i * 0.001) * SEMI), Math.round(20 * SEMI), i === 2 ? null : 120 + i * 10, i * 15000, (100 + [0, 0.5, 2, 1][i % 4]! + 500) * 5]);
  if (session) w.define(2, 18, [[253, T.uint32], [2, T.uint32], [5, T.enum], [7, T.uint32], [8, T.uint32], [9, T.uint32], [16, T.uint8], [22, T.uint16]])
    .data(2, [start + 1800, start, 1, 1_800_000, 1_750_000, 500_000, 150, 40]);
  return w;
}

describe('the FIT CRC', () => {
  test('a whole file, its CRC included, checks to 0; a known vector matches the protocol table', () => {
    const file = run().file();
    expect(fitCrc(file)).toBe(0);
    expect(fitCrc(new TextEncoder().encode('123456789'))).toBe(0xBB3D); // CRC-16/ARC, which the FIT table computes
  });
});

describe('reading a FIT activity', () => {
  test('the session’s own totals win: start, length, distance, climb, heart rate, sport', () => {
    const [s, ...rest] = readFitFile(run().file());
    expect(rest).toEqual([]);
    expect(s).toMatchObject({source: 'fit', sport: 'running', label: 'Run', type: 'cardio', startedAt: '2026-10-01T08:00:00.000Z',
      durationSeconds: 1800, distanceKm: 5, elevationM: 40, avgHr: 150, name: 'Run (imported)'});
    expect(s!.importId).toBe('20261001T0800Z-1800s-5000m');
  });
  test('without a session, the points give the summary (an invalid heart rate is skipped, never zero)', () => {
    const [s] = readFitFile(run({session: false}).file());
    expect(s).toMatchObject({durationSeconds: 180, distanceKm: 0.45, avgHr: 133, elevationM: 2, sport: '', label: 'Workout', type: 'other'});
  });
  test('a 12-byte header and a header CRC of 0 are both accepted; big-endian definitions read the same', () => {
    expect(readFitFile(run().file({headerSize: 12}))[0]!.durationSeconds).toBe(1800);
    expect(readFitFile(run().file({headerCrc: false}))[0]!.durationSeconds).toBe(1800);
    expect(readFitFile(run({session: false, big: true}).file())[0]).toMatchObject({durationSeconds: 180, distanceKm: 0.45});
  });
  test('compressed-timestamp headers, including the 5-bit rollover', () => {
    const base = start - (start % 32) + 30; // the low five bits are 30, so an offset of 2 rolls over
    const w = new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4])
      .define(1, 20, [[253, T.uint32], [3, T.uint8]]).data(1, [base, 120])
      .define(2, 20, [[3, T.uint8]]).data(2, [130], {compressedOffset: 31}).data(2, [140], {compressedOffset: 2}).data(2, [150], {compressedOffset: 10});
    const seen: number[] = [];
    decodeFit(w.file(), m => { if (m.global === 20) seen.push(m.fields.get(253) as number); });
    expect(seen.map(t => t - base)).toEqual([0, 1, 4, 12]);
    expect(readFitFile(w.file())[0]).toMatchObject({durationSeconds: 12, avgHr: 135});
  });
  test('developer fields are skipped by their size; unknown messages and the invalid field 255 are ignored', () => {
    const w = new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4])
      .define(1, 20, [[253, T.uint32], [3, T.uint8], [255, T.uint8]], {dev: [[0, 4, 0], [1, 2, 0]]}).data(1, [start, 100, 7]).data(1, [start + 600, 110, 7])
      .define(3, 9999, [[0, T.string, 12]]).data(3, ['hello world']);
    const messages: FitMessage[] = [];
    decodeFit(w.file(), m => messages.push(m));
    expect(messages.map(m => m.global)).toEqual([0, 20, 20, 9999]);
    expect(messages[1]!.fields.has(255)).toBe(false);
    expect(messages[3]!.fields.get(0)).toBe('hello world');
    expect(readFitFile(w.file())[0]).toMatchObject({durationSeconds: 600, avgHr: 105});
  });
  test('a multisport file gives one summary per session, each with the points in its own time', () => {
    const w = new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4]).define(1, 20, [[253, T.uint32], [3, T.uint8]]);
    for (let i = 0; i <= 10; i++) w.data(1, [start + i * 60, 100]);
    for (let i = 12; i <= 20; i++) w.data(1, [start + i * 60, 160]);
    w.define(2, 18, [[253, T.uint32], [2, T.uint32], [5, T.enum], [7, T.uint32]]).data(2, [start + 600, start, 5, 600_000]).data(2, [start + 1200, start + 720, 2, 480_000]);
    const list = readFitFile(w.file());
    expect(list.map(s => [s.label, s.durationSeconds, s.avgHr])).toEqual([['Swim', 600, 100], ['Ride', 480, 160]]);
  });
  test('chained FIT files are read one after the other', () => {
    const a = run().file(), b = new FitWriter().define(0, 20, [[253, T.uint32], [3, T.uint8]]).data(0, [start + 5000, 99]).file();
    const both = new Uint8Array(a.length + b.length); both.set(a); both.set(b, a.length);
    let records = 0; decodeFit(both, m => { if (m.global === 20) records++; });
    expect(records).toBe(5);
  });
  test('time conversion: the FIT epoch, and device-relative times are unknown', () => {
    expect(new Date(fitTimeMs(fitTime(START))!).toISOString()).toBe('2026-10-01T08:00:00.000Z');
    expect(fitTimeMs(1000)).toBeNull();
    expect(fitTimeMs(null)).toBeNull();
  });
});

describe('refusing what is not a whole FIT activity, in plain words', () => {
  const file = run().file();
  test.each([
    ['empty', new Uint8Array(0), FIT_ERRORS.empty],
    ['not FIT', new TextEncoder().encode('<gpx>not a fit file at all</gpx>'), FIT_ERRORS.notFit],
    ['cut short', file.subarray(0, file.length - 20), FIT_ERRORS.incomplete],
    ['wrong CRC', run().file({badCrc: true}), FIT_ERRORS.crc],
  ])('%s', (_name, bytes, message) => { expect(() => readFitFile(bytes)).toThrow(message); });
  test('a damaged header CRC', () => { const f = run().file(); f[12] = f[12]! ^ 0xFF; expect(() => readFitFile(f)).toThrow(FIT_ERRORS.headerCrc); });
  test('data before its definition, and a definition that runs past the end', () => {
    expect(() => readFitFile(new FitWriter().raw(0x05, 1, 2, 3).file())).toThrow(FIT_ERRORS.damaged);
    expect(() => readFitFile(new FitWriter().raw(0x40, 0, 0, 20, 0, 9, 1, 1).file())).toThrow(FIT_ERRORS.damaged);
  });
  test('a course file is not an activity; a file without any activity is refused', () => {
    expect(() => readFitFile(new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [6]).file())).toThrow(/not a recorded activity/);
    expect(() => readFitFile(new FitWriter().define(0, 0, [[0, T.enum]]).data(0, [4]).file())).toThrow(/no recorded activity/);
  });
  test('an activity without times, longer than 48 hours, or impossibly far', () => {
    expect(() => readFitFile(new FitWriter().define(1, 20, [[3, T.uint8]]).data(1, [120]).file())).toThrow(/no times/);
    expect(() => readFitFile(new FitWriter().define(2, 18, [[2, T.uint32], [7, T.uint32]]).data(2, [start, 200_000_000]).file())).toThrow(/48 hours/);
    expect(() => readFitFile(new FitWriter().define(2, 18, [[2, T.uint32], [7, T.uint32], [9, T.uint32]]).data(2, [start, 60_000, 300_000_000]).file())).toThrow(/impossible distance/);
  });
  test('the message cap', () => {
    expect(() => decodeFit(run().file(), () => undefined, {maxMessages: 3})).toThrow(FIT_ERRORS.tooMany);
  });
  test('random damage never hangs and only ever throws a plain sentence', () => {
    const good = run().file();
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let n = 0; n < 400; n++) {
      const f = good.slice();
      for (let k = 0; k < 3; k++) f[Math.floor(rand() * f.length)] = Math.floor(rand() * 256);
      // Keep the CRC right half the time, so the decoder's own checks (not only the CRC) are exercised.
      if (n % 2) { const end = f.length - 2; new DataView(f.buffer).setUint16(end, fitCrc(f, 0, end), true); if (f[0] === 14) new DataView(f.buffer).setUint16(12, 0, true); }
      try { readFitFile(f); } catch (e) { expect(e).toBeInstanceOf(Error); expect((e as Error).message).toMatch(/^[A-Z].*\.$/); }
    }
  });
});

describe('.fit.gz and keeping the summary', () => {
  test('gzip is unpacked by its first bytes; a damaged gzip is refused plainly', async () => {
    const gz = new Uint8Array(gzipSync(run().file())) as Uint8Array<ArrayBuffer>;
    expect((await readFitBlob(new Blob([gz])))[0]!.durationSeconds).toBe(1800);
    expect(await fileBytes(new Blob([run().file() as Uint8Array<ArrayBuffer>]))).toHaveLength(run().file().length);
    await expect(gunzip(gz.subarray(0, 20))).rejects.toThrow(GZIP_ERRORS.damaged);
    await expect(gunzip(gzipSync(new Uint8Array(5000)), 1000)).rejects.toThrow(GZIP_ERRORS.tooLarge);
  });
  test('a FIT workout is kept under the new fileImport key (never `imported`, whose source older builds check)', () => {
    const [s] = readFitFile(run().file());
    const w = addImportedWorkout(emptyWorkouts(), s!, new Date('2026-10-02T00:00:00Z'), '2026-10-01');
    const x = w.workouts[0]!;
    expect(x.imported).toBeUndefined();
    expect(x.fileImport).toMatchObject({source: 'fit', importId: s!.importId, distanceKm: 5, avgHr: 150, durationSeconds: 1800});
    expect(importInfo(x)?.source).toBe('fit');
    expect(alreadyImported(w, s!.importId)).toBe(true);
    expect(() => addImportedWorkout(w, s!, new Date('2026-10-02T00:00:00Z'))).toThrow(/Already imported/);
    expect(workoutsSchema.parse(JSON.parse(JSON.stringify(w))).workouts[0]!.fileImport?.source).toBe('fit');
    // An unreadable fileImport is dropped, never a reason to refuse the log.
    const damaged = JSON.parse(JSON.stringify(w)); damaged.workouts[0].fileImport.importId = '!!';
    expect(workoutsSchema.parse(damaged).workouts[0]!.fileImport).toBeUndefined();
  });
});
