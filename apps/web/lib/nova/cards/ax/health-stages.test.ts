import {expect, test} from 'vitest';
import {healthSchema} from '../../../health';
import {emptyFasting} from '../../../fasting/schema';
import {buildShowcase} from '../../../showcase-data';
import {emptySleep, sleepSchema, type Sleep} from '../../../sleep/schema';
import {fastingWindows, sleepStages, sleepTimes} from './health-stages';

/** Session AS (ADR-042 Part 2, stage bars): nights and fasts as bars, from the Showcase's Health records of 17 November 2026. */
const DAY = '2026-11-17', health = healthSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:health:v1']!));
const sleep = health.sleep!, NOW = new Date(`${DAY}T19:00:00Z`);

test('sleep stages: the Showcase’s nights were logged by hand, so each is an unlit bar at its time asleep', () => {
  const view = sleepStages(sleep, undefined, DAY);
  expect(view.nights.map(n => n.date.slice(8))).toEqual(['11', '12', '14', '15', '16', '17']); // no night ended on 13 November
  expect(view.nights.map(n => n.asleep)).toEqual([382, 378, 401, 429, 397, 437]);
  expect(view.nights.every(n => !n.staged && n.deep === null && n.rem === null && n.core === null)).toBe(true);
  expect(view).toMatchObject({logged: 6, staged: 0, average: null, max: 437});
  expect(view.nights.map(n => n.label)).toEqual(['Wed', 'Thu', 'Sat', 'Sun', 'Mon', 'Tue']);
  expect(view.words).toMatchObject({figure: '0', unit: 'of 6 nights', label: 'with sleep stages · the last 7 days'});
  expect(view.words.rows.at(-1)).toEqual(['Tue, Nov 17', '7 h 17 min asleep; stages not recorded']);
});
test('sleep stages: a night that holds its stages is stacked, and the averages are over those nights only', () => {
  const staged: Sleep = sleepSchema.parse({...sleep, nights: sleep.nights.map(n => n.end === '2026-11-17T06:20:00.000Z' ? {...n, stages: {deepMin: 80, remMin: 100, coreMin: 250}} : n.end === '2026-11-16T05:46:00.000Z' ? {...n, stages: {deepMin: 60}} : n)});
  const view = sleepStages(staged, undefined, DAY);
  expect(view.nights.at(-1)).toMatchObject({staged: true, deep: 80, rem: 100, core: 250, asleep: 430, words: '7 h 10 min asleep; deep 1 h 20 min, REM 1 h 40 min, core 4 h 10 min'});
  expect(view.nights.at(-2)).toMatchObject({staged: true, deep: 60, rem: null, core: null}); // a stage the night does not hold stays unknown
  expect(view).toMatchObject({staged: 2, logged: 6, average: {deep: 70, rem: 100, core: 250}});
  expect(view.words).toMatchObject({figure: '2', note: 'A night on average: deep 1 h 10 min · REM 1 h 40 min · core 4 h 10 min'});
});
test('sleep times: bedtime and wake time on a noon-to-noon scale, with the bedtime window', () => {
  const view = sleepTimes(sleep, undefined, DAY);
  expect(view.nights).toHaveLength(6);
  // The night to 17 November in Brussels: to bed 23:20 (680 minutes after noon), up 07:20 (1160).
  expect(view.nights.at(-1)).toMatchObject({date: DAY, bed: 680, wake: 1160, bedText: '11:20 PM', wakeText: '7:20 AM'});
  expect(view.nights[1]).toMatchObject({bed: 724, bedText: '12:04 AM'}); // past midnight is still after the evening before
  expect(view.nights.every(n => n.wake > n.bed && n.wake <= 1440)).toBe(true);
  expect(view).toMatchObject({logged: 6, bedText: '11:35 PM', wakeText: '6:57 AM', window: {from: 630, to: 690, text: '10:30 PM to 11:30 PM'}});
  expect(view.words).toMatchObject({figure: '11:35', unit: 'PM', label: 'average bedtime · the last 7 days', note: 'Average wake time 6:57 AM · your bedtime window: 10:30 PM to 11:30 PM'});
});
test('fasting windows: the Showcase’s one fast of 16 hours against its 16 h target', () => {
  const view = fastingWindows(health.fasting!, NOW, DAY);
  expect(view.bars).toEqual([{id: 'fast_showcase-1', label: 'Nov 16', hours: 16, hoursText: '16 h', targetHours: 16, reached: true, words: '16 h of a 16 h target, target reached'}]);
  expect(view.max).toBe(16); expect(view.card.running).toBeNull();
  expect(view.words).toMatchObject({figure: '16', unit: 'h', label: 'last fast · started yesterday', note: 'Target 16 h, reached · no fast is running'});
  expect(view.words.rows).toEqual([['Now', 'No fast is running'], ['Fast started Nov 16', '16 h of a 16 h target, target reached']]);
  // A fast that is running: its hours so far, never a finished bar.
  const running = fastingWindows({version: 1, sessions: [{id: 'fast_now', startedAt: '2026-11-17T15:30:00.000Z', endedAt: null, targetHours: 14, timeZone: 'UTC'}]}, NOW, DAY);
  expect(running.bars).toEqual([]); expect(running.card.running).toMatchObject({targetHours: 14, share: .25});
  expect(running.words).toMatchObject({figure: '3:30', unit: 'so far', label: 'fasting now · target 14 h'});
});
test('nothing recorded: no night, no fast', () => {
  expect(sleepStages(emptySleep(), undefined, DAY)).toMatchObject({nights: [], logged: 0, staged: 0, average: null});
  expect(sleepTimes(emptySleep(), undefined, DAY)).toMatchObject({nights: [], logged: 0, bedText: null, wakeText: null, window: null});
  const fasts = fastingWindows(emptyFasting(), NOW, DAY);
  expect(fasts.card.state).toBe('empty'); expect(fasts.bars).toEqual([]); expect(fasts.words.figure).toBe('—');
});
