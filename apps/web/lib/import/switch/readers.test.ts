import {describe, expect, test} from 'vitest';
import {asleep, nightDay} from '../../sleep/engine';
import {createEmptyHealth} from '../../health';
import {emptyHabitData} from '../../habits';
import {healthGroupIn} from '../../vault/w-homes';
import {buildStoredZip} from '../../export/zip';
import {readApple, workoutName} from './apple';
import {readFitbit, FITBIT_LEGACY_ONLY} from './fitbit';
import {readSamsung} from './samsung';
import {readOura} from './oura';
import {readLoop, previewHabits, undoHabits, undoHabitsPlan, loopSchedule, uuidFrom} from './loop';
import {readGarmin} from './garmin';
import {readFiles, NOT_RECOGNISED} from './read';
import {filesFrom} from './source';
import {csvRows} from './csv-stream';
import {buildNight, parseStamp, zoneFor} from './common';
import {batchFor, emptyItems, GROUP_LIMITS, previewImport, sizeCheck, undoImport, undoPlan, windowThatFits} from './apply';
import type {SleepNight} from '../../sleep/schema';
import {APPLE_XML, FITBIT, GARMIN, LOOP, OURA, SAMSUNG, fileOf, filesOf} from './test-fixtures';
import type {ImportBatch} from '../batches-schema';

// Session W Part 7: every reader against fictional files shaped like the vendor's (IMPORT_FORMATS.md), then the shared
// preview, apply and undo. Times are checked in the zone they were lived in; the person's zone here is Brussels.
const ctx = {zone: 'Europe/Brussels', now: Date.parse('2026-10-07T00:00:00Z')};
const at = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, '.000Z');

describe('shared pieces', () => {
  test('stamps: Apple, Fitbit and ISO forms give the same instant; a missing offset is reported as such', () => {
    expect(parseStamp('2019-04-10 08:10:34 -0500')).toEqual({ms: Date.parse('2019-04-10T13:10:34Z'), offset: -300});
    expect(parseStamp('2026-04-12 12:32:30+0000')!.ms).toBe(Date.parse('2026-04-12T12:32:30Z'));
    expect(parseStamp('2025-09-13T20:35:59.000-06:00')!.ms).toBe(Date.parse('2025-09-14T02:35:59Z'));
    expect(parseStamp('2025-04-06T05:01:57.0')).toEqual({ms: Date.parse('2025-04-06T05:01:57Z'), offset: null});
    expect(parseStamp('10/04/2026')).toBeNull();
  });
  test('a file\'s offset becomes home\'s zone when it matches, a fixed Etc zone for another whole hour, home otherwise (counted)', () => {
    expect(zoneFor(Date.parse('2026-10-05T04:30:00Z'), 120, 'Europe/Brussels')).toEqual({zone: 'Europe/Brussels', guessed: false});
    expect(zoneFor(Date.parse('2026-12-05T04:30:00Z'), 60, 'Europe/Brussels')).toEqual({zone: 'Europe/Brussels', guessed: false});
    expect(zoneFor(Date.parse('2026-09-20T08:00:00Z'), -240, 'Europe/Brussels')).toEqual({zone: 'Etc/GMT+4', guessed: false});
    expect(zoneFor(Date.parse('2026-09-20T08:00:00Z'), 330, 'Europe/Brussels')).toEqual({zone: 'Europe/Brussels', guessed: true});
  });
  test('CSV rows across chunk boundaries: a quoted delimiter, a doubled quote and a line break, CRLF split in two, a skipped first line', async () => {
    const chunks = ['meta,1,2\r', '\nname;"a;b";"say ""hi""\nthere"\r', '\nx;y;z'];
    const stream = new ReadableStream<string>({start(c) { for (const ch of chunks) c.enqueue(ch); c.close(); }});
    const rows: string[][] = [];
    for await (const r of csvRows(stream, {skipLines: 1})) rows.push(r);
    expect(rows).toEqual([['name', 'a;b', 'say "hi"\nthere'], ['x', 'y', 'z']]);
    const long = new ReadableStream<string>({start(c) { c.enqueue(`a,b\n${'x'.repeat(50)}`); c.close(); }});
    await expect((async () => { for await (const r of csvRows(long, {maxRecord: 20})) void r; })()).rejects.toThrow('too long');
  });
});

describe('Apple Health', () => {
  test('steps, energy, heart, weight, sleep, mindful minutes and workouts, each in the zone it was lived in', async () => {
    const plan = await readApple(fileOf('apple_health_export/export.xml', APPLE_XML), ctx);
    // Steps: the watch counted more than the phone on 1 October, so that day keeps the watch's 2,000, never 3,200.
    expect(plan.items.activity.filter(a => a.steps).map(a => [a.date, a.steps])).toEqual([['2026-07-02', 900], ['2026-10-01', 2000]]);
    // Exported at −07:00 but lived in Brussels: 23:30 −07:00 is 08:30 on 2 July there.
    expect(plan.items.activity.find(a => a.minutes)).toMatchObject({date: '2026-10-03', name: 'Running', minutes: 31, steps: 0});
    expect(plan.items.weights.map(w => [w.date, w.grams])).toEqual([['2026-10-01', 70400], ['2026-10-02', 69989]]);
    expect(plan.items.vitals).toHaveLength(1);
    expect(plan.items.vitals[0]).toMatchObject({id: 'health_vital-apple-health-2026-10-01', restingHr: 58, hrMin: 62, hrAvg: 82, hrMax: 110, activeKcal: 550, restingKcal: 1600});
    expect(plan.items.meditation).toHaveLength(1);
    expect(plan.items.meditation[0]).toMatchObject({startedAt: at('2026-10-04T05:00:00Z'), seconds: 600, kind: 'import', source: 'apple-health'});
    const [old, night] = plan.items.sleep;
    expect(plan.items.sleep).toHaveLength(2);
    expect(night).toMatchObject({start: at('2026-10-05T20:30:00Z'), end: at('2026-10-06T04:30:00Z'), timeZone: 'Europe/Brussels', kind: 'night', latencyMin: 15, awakeMin: 30, stages: {deepMin: 60, remMin: 60, coreMin: 315}, source: 'apple-health'});
    expect(asleep(night!)).toEqual({minutes: 435, estimated: false});
    expect(nightDay(night!)).toBe('2026-10-06');
    // Before stages (the legacy "Asleep" value): the window, time to fall asleep and the rest awake, nothing invented.
    expect(old).toMatchObject({latencyMin: 30, awakeMin: 30});
    expect(old!.stages).toBeUndefined();
    expect(asleep(old!)).toEqual({minutes: 420, estimated: false});
    expect(plan.summarised.join(' ')).toMatch(/Heart rate: each day's lowest, average and highest \(1 days\)/);
    expect(plan.summarised.join(' ')).toMatch(/Sleep stages/);
    expect(plan.summarised.join(' ')).toMatch(/never the two added together/);
    expect(plan.warnings).toEqual(expect.arrayContaining([
      '1 skipped: energy in a unit ZIGoals does not know (kWh)', '1 skipped: a night another app in this export also recorded', '1 skipped: a night that ends in the future',
      expect.stringMatching(/^1 records of 1 other kinds are not kept \(for example BodyFatPercentage\)\.$/),
    ]));
  });
  test('workout names read as words; a file without HealthData is refused', async () => {
    expect(workoutName('HKWorkoutActivityTypeTraditionalStrengthTraining')).toBe('Traditional strength training');
    expect(workoutName('HKWorkoutActivityTypeHIIT')).toBe('Hiit');
    await expect(readApple(fileOf('x.xml', '<?xml version="1.0"?><Other/>'), ctx)).rejects.toThrow('not an Apple Health export');
  });
  test('from a ZIP as the iPhone shares it, found by its DOCTYPE whatever the file is called', async () => {
    const zip = buildStoredZip([{name: 'apple_health_export/eksport.xml', data: APPLE_XML, modified: new Date()}, {name: 'apple_health_export/export_cda.xml', data: '<ClinicalDocument/>', modified: new Date()}]);
    const outcome = await readFiles(await filesFrom([new File([zip as BlobPart], 'export.zip', {type: 'application/zip'})]), ctx);
    expect(outcome.kind).toBe('health');
    if (outcome.kind === 'health') expect(outcome.plan.items.sleep).toHaveLength(2);
  });
});

describe('Fitbit / Google Health (Takeout CSV)', () => {
  test('nights with their own offset and stages, one source of steps a day, resting and daily heart rate, weight', async () => {
    const plan = await readFitbit(filesOf(FITBIT), ctx);
    const [away, home] = plan.items.sleep;
    expect(home).toMatchObject({start: at('2026-10-04T20:30:00Z'), end: at('2026-10-05T04:30:00Z'), timeZone: 'Europe/Brussels', latencyMin: 12, awakeMin: 48, stages: {deepMin: 80, remMin: 90, coreMin: 250}});
    expect(asleep(home!)).toEqual({minutes: 420, estimated: false});
    // −04:00 that night, far from Brussels: a fixed zone keeps its wake date right (04:00 on 20 September there).
    expect(away).toMatchObject({timeZone: 'Etc/GMT+4', latencyMin: 10, awakeMin: 20});
    expect(nightDay(away!)).toBe('2026-09-20');
    expect(plan.items.activity.map(a => [a.date, a.steps])).toEqual([['2026-10-01', 800], ['2026-10-02', 200]]);
    expect(plan.items.weights).toEqual([expect.objectContaining({date: '2026-10-01', grams: 70500})]);
    expect(plan.items.vitals).toEqual([expect.objectContaining({date: '2026-10-01', restingHr: 57, hrMin: 60, hrAvg: 62, hrMax: 64})]);
    expect(plan.warnings).toEqual(expect.arrayContaining(['1 skipped: a heart rate outside 20–250 bpm', expect.stringMatching(/older JSON copies of the same data were not read/)]));
  });
  test('an archive with only the older JSON files is refused, plainly', async () => {
    const legacy = filesOf({'Fitbit/Global Export Data/sleep-2026-10-04.json': '[]'});
    await expect(readFitbit(legacy, ctx)).rejects.toThrow(FITBIT_LEGACY_ONLY);
    expect(await readFiles(legacy, ctx)).toEqual({kind: 'refused', format: null, message: FITBIT_LEGACY_ONLY});
  });
});

describe('Samsung Health', () => {
  test('the first line skipped, prefixed columns, UTC with offsets, SDK stage codes, all-sources steps only', async () => {
    const plan = await readSamsung(filesOf(SAMSUNG), ctx);
    expect(plan.items.activity.map(a => [a.date, a.steps])).toEqual([['2026-10-01', 8000], ['2026-10-02', 6500]]);
    expect(plan.items.sleep).toHaveLength(1);
    expect(plan.items.sleep[0]).toMatchObject({start: at('2026-10-04T20:45:00Z'), end: at('2026-10-05T04:45:00Z'), timeZone: 'Europe/Brussels', latencyMin: 10, stages: {coreMin: 200, deepMin: 90, remMin: 100}, awakeMin: 80});
    expect(asleep(plan.items.sleep[0]!)).toEqual({minutes: 390, estimated: false});
    expect(plan.items.weights).toEqual([expect.objectContaining({date: '2026-10-03', grams: 71200})]);
    expect(plan.items.vitals).toEqual([expect.objectContaining({date: '2026-10-03', hrMin: 65, hrAvg: 80, hrMax: 120})]);
  });
});

describe('Oura', () => {
  test('semicolon files with JSON cells: the main sleep, a late nap, no rest periods; resting heart rate and steps', async () => {
    const plan = await readOura(filesOf(OURA), ctx);
    expect(plan.items.sleep.map(n => n.kind)).toEqual(['night', 'nap']);
    expect(plan.items.sleep[0]).toMatchObject({start: at('2026-10-04T20:40:00Z'), latencyMin: 10, stages: {deepMin: 80, remMin: 90, coreMin: 250}});
    expect(asleep(plan.items.sleep[0]!)).toEqual({minutes: 420, estimated: false});
    expect(plan.items.vitals).toEqual([expect.objectContaining({date: '2026-10-05', restingHr: 52, activeKcal: 420})]);
    expect(plan.items.activity.map(a => [a.date, a.steps])).toEqual([['2026-10-05', 9000]]);
    expect(plan.warnings).toContain('1 skipped: a period Oura marked as rest or deleted');
  });
});

describe('Loop Habit Tracker', () => {
  test('habits with their schedules and targets, done and skipped days, amounts; an approximate schedule is named', async () => {
    const plan = await readLoop(filesOf(LOOP), ctx);
    const [meditate, run, water, old] = plan.habits;
    expect(meditate).toMatchObject({title: 'Meditate', startDate: '2026-10-02', description: 'Did you meditate today?', category: 'Loop Habit Tracker'});
    expect(meditate!.entries.map(e => [e.date, e.disposition, e.count, e.note])).toEqual([['2026-10-02', 'logged', 1, 'good'], ['2026-10-04', 'skipped', 0, 'travel'], ['2026-10-05', 'logged', 1, '']]);
    expect(run!.rules[0]).toMatchObject({schedule: {kind: 'frequency', times: 3, period: 'week'}, measurement: {kind: 'boolean'}});
    expect(run!.entries.map(e => e.date)).toEqual(['2026-10-04']);
    expect(water!.rules[0]).toMatchObject({type: 'build', measurement: {kind: 'quantity', unit: 'glasses'}, target: 8, targetPeriod: 'day'});
    expect(water!.entries.map(e => e.count)).toEqual([6.5, 8]);
    expect(old!.rules[0]).toMatchObject({state: 'archived', schedule: {kind: 'interval', every: 2}});
    expect(plan.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/Old habit: no Checkmarks\.csv/), expect.stringMatching(/1 habit has a schedule ZIGoals writes differently \(Old habit\)/)]));
    expect(uuidFrom('loop|001|Meditate')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(meditate!.id).toBe(uuidFrom('loop|001|Meditate'));
  });
  test('the same export twice adds nothing; a later export adds only new days; undo removes what the import made', async () => {
    const plan = await readLoop(filesOf(LOOP), ctx);
    const first = previewHabits(emptyHabitData(), plan.habits);
    expect(first.created).toHaveLength(4);
    const again = previewHabits(first.next, plan.habits);
    expect([again.created.length, again.entries.length, again.duplicates]).toEqual([0, 0, 6]);
    const later = await readLoop(filesOf({...LOOP, '001 Meditate/Checkmarks.csv': 'Date,Value,Notes\n2026-10-06,2,\n2026-10-05,2,\n'}), ctx);
    const more = previewHabits(first.next, later.habits);
    expect(more.entries).toEqual([[plan.habits[0]!.id, '2026-10-06']]);
    const batch = {id: crypto.randomUUID(), format: 'loop', label: 'Loop Habit Tracker', at: new Date(ctx.now).toISOString(), counts: {}, refs: {habits: {habitIds: first.created, entries: []}}} as ImportBatch;
    expect(undoHabitsPlan(first.next, batch)).toEqual({remove: 4, edited: []});
    expect(undoHabits(first.next, batch).habits).toEqual([]);
  });
  test('schedules: Loop\'s numerator over denominator', () => {
    expect(loopSchedule(1, 1, '2026-01-01')).toMatchObject({schedule: {kind: 'daily'}, exact: true});
    expect(loopSchedule(5, 7, '2026-01-01')).toMatchObject({schedule: {kind: 'frequency', times: 5, period: 'week'}, exact: true});
    expect(loopSchedule(10, 30, '2026-01-01')).toMatchObject({schedule: {kind: 'frequency', times: 10, period: 'month'}, exact: true});
    expect(loopSchedule(2, 10, '2026-01-01')).toMatchObject({schedule: {kind: 'frequency', times: 1, period: 'week'}, exact: false});
  });
});

describe('detection and the formats that are not read', () => {
  test('each export is recognised by its files; Garmin is recognised and refused with the reason; meals go to Import meals', async () => {
    expect((await readFiles(filesOf(SAMSUNG), ctx)).kind).toBe('health');
    expect((await readFiles(filesOf(OURA), ctx)).kind).toBe('health');
    expect((await readFiles(filesOf(FITBIT), ctx)).kind).toBe('health');
    expect((await readFiles(filesOf(LOOP), ctx)).kind).toBe('habits');
    expect(await readFiles(filesOf(GARMIN), ctx)).toMatchObject({kind: 'refused', format: 'garmin', message: expect.stringMatching(/Garmin does not publish the layout/)});
    expect(await readFiles(filesOf({'File-Export-2026/Nutrition-Summary-2026-01-01-to-2026-10-01.csv': 'Date,Meal,Calories\n'}), ctx)).toMatchObject({kind: 'refused', format: 'myfitnesspal', meals: true});
    expect(await readFiles(filesOf({'servings.csv': 'Day,Time,Group,Food Name,Amount,Energy (kcal)\n'}), ctx)).toMatchObject({kind: 'refused', format: 'cronometer', meals: true});
    expect(await readFiles(filesOf({'notes.txt': 'hello'}), ctx)).toEqual({kind: 'refused', format: null, message: NOT_RECOGNISED});
  });
  test('the Garmin reader itself (kept off): daily summary, a night with stages in the day\'s own offset, a nap, weight', async () => {
    const plan = await readGarmin(filesOf(GARMIN), ctx);
    expect(plan.items.activity.map(a => [a.date, a.steps])).toEqual([['2026-10-01', 9100]]);
    expect(plan.items.vitals[0]).toMatchObject({restingHr: 55, hrMin: 48, hrMax: 150, activeKcal: 510, restingKcal: 1650});
    expect(plan.items.sleep.map(n => [n.kind, n.timeZone])).toEqual([['night', 'Europe/Brussels'], ['nap', 'Europe/Brussels']]);
    expect(asleep(plan.items.sleep[0]!)).toEqual({minutes: 450, estimated: false});
    expect(plan.items.weights).toEqual([expect.objectContaining({date: '2026-10-01', grams: 72300})]);
  });
});

describe('preview, apply and undo', () => {
  test('a second import of the same file finds only duplicates; a day that has steps or a weight keeps its own', async () => {
    const plan = await readApple(fileOf('export.xml', APPLE_XML), ctx);
    const first = previewImport(createEmptyHealth(), plan.items);
    expect(first.preview).toMatchObject({sleep: {added: 2, duplicates: 0, kept: 0, full: 0}, meditation: {added: 1}, vitals: {added: 1}, activity: {added: 3}, weights: {added: 2}, range: {from: '2019-03-11', to: '2026-10-06'}});
    expect(healthGroupIn(first.next, 'sleep')!.nights).toHaveLength(2);
    expect(first.next.schemaVersion).toBe(4);
    const again = previewImport(first.next, plan.items);
    expect(again.preview).toMatchObject({sleep: {added: 0, duplicates: 2}, meditation: {added: 0, duplicates: 1}, vitals: {duplicates: 1}, activity: {duplicates: 3}, weights: {duplicates: 2}});
    // Another app's steps and weight on the same days stay out (one source per day); the workout is its own line.
    const fitbit = await readFitbit(filesOf(FITBIT), ctx);
    const mixed = previewImport(first.next, fitbit.items);
    expect(mixed.preview.activity).toMatchObject({added: 1, kept: 1});
    expect(mixed.preview.weights).toMatchObject({added: 0, kept: 1});
  });
  test('size: the module after the import against its limit, and the earliest day that still fits comfortably', async () => {
    const plan = await readApple(fileOf('export.xml', APPLE_XML), ctx), base = createEmptyHealth();
    const full = previewImport(base, plan.items).next, bytes = sizeCheck(full, 2_000_000).bytes;
    expect(sizeCheck(full, 2_000_000)).toMatchObject({fits: true, comfortable: true});
    const tight = Math.ceil(bytes / 0.75) - 200;
    expect(sizeCheck(full, tight).comfortable).toBe(false);
    const from = windowThatFits(base, plan.items, tight);
    expect(from).not.toBeNull();
    expect(from! > '2019-03-11').toBe(true);
    expect(windowThatFits(base, plan.items, 100)).toBeNull();
  });
  test('a list never goes past what the journal holds: the newest are kept, the older ones counted as full', () => {
    const night = (i: number) => buildNight('oura', {startMs: Date.parse('2000-01-01T22:00:00Z') + i * 86_400_000, endMs: Date.parse('2000-01-02T06:00:00Z') + i * 86_400_000, zone: 'UTC', now: ctx.now}) as SleepNight;
    const existing = Array.from({length: GROUP_LIMITS.sleep - 1}, (_, i) => night(i));
    const base = previewImport(createEmptyHealth(), {...emptyItems(), sleep: existing}).next;
    const incoming = [night(6000), night(6001), night(6002)];
    const {preview, addedIds} = previewImport(base, {...emptyItems(), sleep: incoming});
    expect(preview.sleep).toEqual({added: 1, duplicates: 0, kept: 0, full: 2});
    expect(addedIds.sleep).toEqual([incoming[2]!.id]);
  });
  test('undo removes exactly what the batch added, and names what was edited since', async () => {
    const plan = await readApple(fileOf('export.xml', APPLE_XML), ctx);
    const {next, addedIds} = previewImport(createEmptyHealth(), plan.items);
    const batch = batchFor(plan, addedIds, {id: crypto.randomUUID(), at: new Date()});
    expect(batch.counts).toEqual({sleep: 2, meditation: 1, vitals: 1, activity: 3, weights: 2});
    expect(undoPlan(next, batch)).toEqual({remove: 9, edited: []});
    const edited = {...next, weights: next.weights.map((w, i) => i === 0 ? {...w, grams: 71000, updatedAt: new Date(Date.now() + 60_000).toISOString()} : w)};
    expect(undoPlan(edited, batch).edited).toEqual(['a weight on 2026-10-01']);
    const undone = undoImport(next, batch);
    expect([undone.weights.length, undone.activity.length, healthGroupIn(undone, 'sleep')!.nights.length, healthGroupIn(undone, 'vitals')!.days.length]).toEqual([0, 0, 0, 0]);
  });
});
