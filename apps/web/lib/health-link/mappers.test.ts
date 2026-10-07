import {describe, expect, test} from 'vitest';
import {asleep} from '../sleep/engine';
import {createEmptyHealth} from '../health';
import {healthGroupIn} from '../vault/w-homes';
import {previewImport} from '../import/switch/apply';
import {addDays, LINK_REQUESTS, mapResponses, removeLinkedRecords, type LinkWindow} from './mappers';

// Session W Part 8: each linked service's answers, shaped exactly as its official reference describes them (read
// 2026-10-07; fictional values), become the journal's records under the import rules plus the link's own two: a day's
// totals only once the day has ended, and no value whose unit the reference leaves unstated.
const NOW = Date.parse('2026-10-07T08:00:00Z'), ctx = {zone: 'Europe/Brussels', now: NOW};
const epoch = (iso: string) => Date.parse(iso) / 1000;
const WINDOW: LinkWindow = {fromDay: '2026-09-07', toDay: '2026-10-07', fromEpoch: epoch('2026-09-07T08:00:00Z'), toEpoch: epoch('2026-10-07T08:00:00Z')};
function walk(provider: keyof typeof LINK_REQUESTS, name: string, answers: (params: Record<string, string> | undefined) => unknown = () => ({})) {
  const request = LINK_REQUESTS[provider].find(r => r.name === name)!, seen: (Record<string, string> | undefined)[] = [];
  let params = request.params?.(WINDOW);
  for (let page = 0; page < 10; page++) { seen.push(params); const next = request.next?.(answers(params), params, page, WINDOW); if (!next) break; params = next; }
  return seen;
}

describe('the requests', () => {
  test('Withings\' sleep summary goes in pieces of at most 7 days and Polar\'s daily activity in pieces of at most 28, oldest first', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(walk('withings', 'withings.sleep', () => ({status: 0, body: {series: [], more: true, offset: 10}}))).toEqual([
      {startdateymd: '2026-09-07', enddateymd: '2026-09-13'}, {startdateymd: '2026-09-14', enddateymd: '2026-09-20'}, {startdateymd: '2026-09-21', enddateymd: '2026-09-27'},
      {startdateymd: '2026-09-28', enddateymd: '2026-10-04'}, {startdateymd: '2026-10-05', enddateymd: '2026-10-07'},
    ]);
    expect(walk('polar', 'polar.activities')).toEqual([{from: '2026-09-07', to: '2026-10-04'}, {from: '2026-10-05', to: '2026-10-07'}]);
  });
  test('Withings\' measures page with "offset" after "more" (1 or true); Strava asks for a next page only after a full one of 30', () => {
    expect(walk('withings', 'withings.weight', params => ({status: 0, body: {measuregrps: [], more: params?.offset ? 0 : 1, offset: 40}}))).toEqual([
      {startdate: String(WINDOW.fromEpoch), enddate: String(WINDOW.toEpoch)}, {startdate: String(WINDOW.fromEpoch), enddate: String(WINDOW.toEpoch), offset: '40'},
    ]);
    expect(walk('withings', 'withings.activity', params => ({status: 0, body: {activities: [], more: !params?.offset, offset: 7}})).map(p => p?.offset ?? null)).toEqual([null, '7']);
    expect(walk('strava', 'strava.activities', params => Array.from({length: params?.page === '1' ? 30 : 12}, () => ({})))).toEqual([{after: String(WINDOW.fromEpoch), page: '1'}, {after: String(WINDOW.fromEpoch), page: '2'}]);
    expect(walk('strava', 'strava.activities', () => Array.from({length: 29}, () => ({})))).toHaveLength(1);
  });
});

describe('Oura', () => {
  const items = mapResponses('oura', {
    'oura.sleep': [{data: [
      {id: 'n1', day: '2026-10-06', type: 'long_sleep', bedtime_start: '2026-10-05T23:10:00+02:00', bedtime_end: '2026-10-06T07:00:00+02:00', time_in_bed: 28200, total_sleep_duration: 25200, deep_sleep_duration: 5400, rem_sleep_duration: 6000, light_sleep_duration: 13800, latency: 600, lowest_heart_rate: 48},
      {id: 'n2', day: '2026-10-06', type: 'rest', bedtime_start: '2026-10-06T14:00:00+02:00', bedtime_end: '2026-10-06T14:30:00+02:00', time_in_bed: 1800},
      {id: 'n3', day: '2026-10-07', type: 'late_nap', bedtime_start: '2026-10-06T19:00:00+02:00', bedtime_end: '2026-10-06T19:40:00+02:00', time_in_bed: 2400, total_sleep_duration: 1800, deep_sleep_duration: null, rem_sleep_duration: null, light_sleep_duration: null},
      {id: 'n4', day: '2026-10-05', type: 'deleted', bedtime_start: '2026-10-04T23:00:00+02:00', bedtime_end: '2026-10-05T07:00:00+02:00', time_in_bed: 28800},
    ], next_token: null}],
    'oura.daily_activity': [{data: [{day: '2026-10-06', steps: 8123, active_calories: 410, total_calories: 2300}, {day: '2026-10-07', steps: 1200, active_calories: 40, total_calories: 600}], next_token: null}],
    'oura.session': [{data: [
      {id: 's1', day: '2026-10-06', type: 'meditation', start_datetime: '2026-10-06T07:30:00+02:00', end_datetime: '2026-10-06T07:40:00+02:00'},
      {id: 's2', day: '2026-10-06', type: 'relaxation', start_datetime: '2026-10-06T12:00:00+02:00', end_datetime: '2026-10-06T12:10:00+02:00'},
    ], next_token: null}],
    'oura.workout': [{data: [{id: 'w1', day: '2026-10-07', activity: 'cycling', intensity: 'moderate', source: 'manual', start_datetime: '2026-10-07T06:00:00+02:00', end_datetime: '2026-10-07T06:45:00+02:00'}], next_token: null}],
  }, ctx);
  test('nights keep Oura\'s own "asleep" and complete stages; rejected and deleted periods stay out; a late nap is a nap', () => {
    expect(items.sleep.map(n => [n.kind, n.start, n.end, asleep(n)?.minutes, n.latencyMin, n.stages ?? null, n.source])).toEqual([
      ['night', '2026-10-05T21:10:00.000Z', '2026-10-06T05:00:00.000Z', 420, 10, {deepMin: 90, remMin: 100, coreMin: 230}, 'oura-link'],
      ['nap', '2026-10-06T17:00:00.000Z', '2026-10-06T17:40:00.000Z', 30, undefined, null, 'oura-link'],
    ]);
  });
  test('a day\'s steps and active energy arrive once the day has ended; the lowest heart rate in sleep is not kept as a resting rate', () => {
    expect(items.activity.filter(a => a.steps > 0).map(a => [a.date, a.steps])).toEqual([['2026-10-06', 8123]]);
    expect(items.vitals).toEqual([expect.objectContaining({id: 'health_vital-oura-link-2026-10-06', activeKcal: 410})]);
    expect(items.vitals[0]).not.toHaveProperty('restingHr');
  });
  test('meditation and breathing sessions are kept, other moments are not; a workout that ended today is complete and kept', () => {
    expect(items.meditation.map(s => [s.startedAt, s.seconds, s.source])).toEqual([['2026-10-06T05:30:00.000Z', 600, 'oura-link']]);
    expect(items.activity.filter(a => a.minutes > 0).map(a => [a.date, a.name, a.minutes])).toEqual([['2026-10-07', 'Cycling · Oura', 45]]);
  });
});

describe('Withings', () => {
  const items = mapResponses('withings', {
    'withings.sleep': [{status: 0, body: {series: [
      {startdate: epoch('2026-10-05T21:30:00Z'), enddate: epoch('2026-10-06T05:30:00Z'), timezone: 'Europe/Paris', date: '2026-10-06', data: {total_sleep_time: 25200, deepsleepduration: 6000, lightsleepduration: 13800, remsleepduration: 5400, sleep_latency: 900}},
      {startdate: epoch('2026-10-04T22:00:00Z'), enddate: epoch('2026-10-05T06:00:00Z'), timezone: 'Europe/Paris', date: '2026-10-05', data: {asleepduration: 24000, deepsleepduration: null, lightsleepduration: null, remsleepduration: null}},
    ], more: false, offset: 0}}],
    'withings.weight': [{status: 0, body: {timezone: 'Asia/Tokyo', more: 0, offset: 0, measuregrps: [
      {grpid: 1, date: epoch('2026-10-04T23:30:00Z'), category: 1, measures: [{value: 70250, type: 1, unit: -3}, {value: 182, type: 6, unit: -1}]},
      {grpid: 2, date: epoch('2026-10-06T22:00:00Z'), category: 1, measures: [{value: 7010, type: 1, unit: -2}]},
    ]}}],
    'withings.activity': [{status: 0, body: {more: false, offset: 0, activities: [{date: '2026-10-06', timezone: 'Europe/Paris', steps: 9001, calories: 380.5, totalcalories: 2100.5}, {date: '2026-10-07', timezone: 'Europe/Paris', steps: 300, calories: 12, totalcalories: 500}]}}],
    'withings.workouts': [{status: 0, body: {more: false, offset: 0, series: [
      {category: 1, startdate: epoch('2026-10-06T22:30:00Z'), enddate: epoch('2026-10-06T23:10:00Z'), timezone: 'America/New_York', date: '2026-10-06'},
      {category: 551, startdate: epoch('2026-10-06T06:00:00Z'), enddate: epoch('2026-10-06T06:15:00Z'), timezone: 'Europe/Paris', date: '2026-10-06'},
    ]}}],
  }, ctx);
  test('"asleep" is Withings\' total sleep time, or "asleepduration" for a night from another source (no stages then)', () => {
    expect(items.sleep.map(n => [n.start, asleep(n)?.minutes, n.latencyMin, n.stages ?? null, n.timeZone])).toEqual([
      ['2026-10-05T21:30:00.000Z', 420, 15, {deepMin: 100, remMin: 90, coreMin: 230}, 'Europe/Paris'],
      ['2026-10-04T22:00:00.000Z', 400, undefined, null, 'Europe/Paris'],
    ]);
  });
  test('a weight\'s day is in the time zone the answer gives; today\'s weight waits for the day to end', () => {
    expect(items.weights.map(w => [w.date, w.grams, w.id.startsWith('health_imw-withings-link-')])).toEqual([['2026-10-05', 70250, true]]);
  });
  test('resting energy is total minus active; a meditation session is not kept; a workout\'s day is in its own zone', () => {
    expect(items.vitals.map(v => [v.date, v.activeKcal, v.restingKcal])).toEqual([['2026-10-06', 381, 1720]]);
    expect(items.activity.map(a => [a.date, a.name, a.steps, a.minutes])).toEqual([['2026-10-06', 'Steps · Withings', 9001, 0], ['2026-10-06', 'Workout · Withings', 0, 40]]);
  });
});

describe('Polar', () => {
  const items = mapResponses('polar', {
    'polar.sleep': [{nights: [
      {date: '2026-10-06', sleep_start_time: '2026-10-06T00:10:00+03:00', sleep_end_time: '2026-10-06T07:40:00+03:00', light_sleep: 14400, deep_sleep: 5400, rem_sleep: 4800, unrecognized_sleep_stage: 600, total_interruption_duration: 1800},
      {date: '2026-10-05', sleep_start_time: '2026-10-05T00:00:00+03:00', sleep_end_time: '2026-10-05T07:30:00+03:00', light_sleep: 14400, deep_sleep: 6000, rem_sleep: 4800, unrecognized_sleep_stage: 0, total_interruption_duration: 1800},
    ]}],
    'polar.activities': [[
      {start_time: '2026-10-05T22:00:00', end_time: '2026-10-06T21:59:59', calories: 2400, active_calories: 600, steps: 10432, samples: {date: '2026-10-06', steps: []}},
      {start_time: '2026-10-04T22:00:00', end_time: '2026-10-05T21:59:59', calories: 2300, active_calories: 500, steps: 7000},
    ]],
    'polar.exercises': [[{id: 'abc', start_time: '2026-10-06T18:40:02', start_time_utc_offset: 180, duration: 'PT1H2M30S', sport: 'RUNNING', calories: 640}]],
  }, ctx);
  test('sleep the watch could not place in a stage counts as asleep but leaves the stages out; complete stages are kept', () => {
    expect(items.sleep.map(n => [n.start, asleep(n)?.minutes, n.stages ?? null, n.timeZone])).toEqual([
      ['2026-10-05T21:10:00.000Z', 420, null, 'Etc/GMT-3'],
      ['2026-10-04T21:00:00.000Z', 420, {deepMin: 100, remMin: 80, coreMin: 240}, 'Etc/GMT-3'],
    ]);
  });
  test('a day\'s steps take their day from "samples.date" (the start time is in UTC); no daily calories are kept', () => {
    expect(items.activity.filter(a => a.steps > 0).map(a => [a.date, a.steps])).toEqual([['2026-10-06', 10432]]);
    expect(items.vitals).toEqual([]);
  });
  test('an exercise\'s local start and stated offset give its instant (its id) and its local day', () => {
    const run = items.activity.find(a => a.minutes > 0)!;
    expect([run.date, run.name, run.minutes]).toEqual(['2026-10-06', 'Running · Polar', 63]);
    expect(mapResponses('polar', {'polar.exercises': [[{start_time: '2026-10-06T15:40:02Z', duration: 'PT1H2M30S', sport: 'RUNNING'}]]}, ctx).activity[0]!.id).toBe(run.id);
  });
});

describe('Strava', () => {
  test('a workout\'s day comes from its named zone, else from "start_date_local"; elapsed time in minutes', () => {
    const items = mapResponses('strava', {'strava.activities': [[
      {id: 101, start_date: '2026-10-06T03:30:00Z', start_date_local: '2026-10-05T20:30:00Z', timezone: '(GMT-08:00) America/Los_Angeles', elapsed_time: 3000, sport_type: 'TrailRun'},
      {id: 102, start_date: '2026-10-06T23:30:00Z', start_date_local: '2026-10-07T08:30:00Z', timezone: '(GMT+09:00) Not/AZone', elapsed_time: 1800, sport_type: 'Ride'},
      {id: 103, start_date: '2026-10-06T10:00:00Z', elapsed_time: 30, sport_type: 'Walk'},
    ]]}, ctx);
    expect(items.activity.map(a => [a.date, a.name, a.minutes])).toEqual([['2026-10-05', 'Trail run · Strava', 50], ['2026-10-07', 'Ride · Strava', 30]]);
  });
});

test('the records go in by the import\'s rules, and Disconnect can remove exactly what one service brought', () => {
  const oura = mapResponses('oura', {'oura.daily_activity': [{data: [{day: '2026-10-06', steps: 8123, active_calories: 410}]}], 'oura.sleep': [{data: [{type: 'long_sleep', bedtime_start: '2026-10-05T23:10:00+02:00', bedtime_end: '2026-10-06T07:00:00+02:00', total_sleep_duration: 25200}]}]}, ctx);
  const strava = mapResponses('strava', {'strava.activities': [[{id: 7, start_date: '2026-10-06T16:00:00Z', timezone: '(GMT+01:00) Europe/Brussels', elapsed_time: 2400, sport_type: 'Run'}]]}, ctx);
  let health = previewImport(createEmptyHealth(), oura).next;
  health = previewImport(health, strava).next;
  const again = previewImport(health, oura);
  expect([again.preview.activity.duplicates, again.preview.sleep.duplicates, again.preview.vitals.duplicates]).toEqual([1, 1, 1]);
  const after = removeLinkedRecords(health, 'oura');
  expect(after.activity.map(a => a.name)).toEqual(['Run · Strava']);
  expect(healthGroupIn(after, 'sleep')?.nights ?? []).toEqual([]);
  expect(healthGroupIn(after, 'vitals')?.days ?? []).toEqual([]);
});
