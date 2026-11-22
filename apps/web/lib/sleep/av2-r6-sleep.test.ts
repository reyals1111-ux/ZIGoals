import {describe, expect, test} from 'vitest';
import {tonight} from './tonight';
import {efficiency} from './night';
import {efficiencyOf} from './longer';
import {dailySeries} from './engine';
import {sleepSchema, type Sleep, type SleepNight} from './schema';
import {addDays} from '../zone-time';

/** Session AV lane 2, round 6 (r6-body; LEDGER #419, #423): tonight's bedtime, and time asleep of time in bed. Fictional nights. */
const TODAY = '2026-11-22', AT = '2026-11-22T09:00:00.000Z';
const night = (wakeDay: string, bed: string, wake: string, extra: Partial<SleepNight> = {}, i = 0): SleepNight => ({id: `health_sleep-r6-${wakeDay}-${i}`, kind: 'night', start: `${addDays(wakeDay, bed < '12:00' ? 0 : -1)}T${bed}:00.000Z`, end: `${wakeDay}T${wake}:00.000Z`, timeZone: 'UTC', source: 'manual', createdAt: AT, updatedAt: AT, ...extra});
const sleepOf = (nights: SleepNight[], goal?: Sleep['goal']): Sleep => sleepSchema.parse({version: 1, nights, ...(goal ? {goal} : {})});
const GOAL = {minutes: 450, updatedAt: AT};

describe('#419: tonight’s bedtime', () => {
  const week = (latency?: number) => Array.from({length: 6}, (_, i) => night(addDays(TODAY, -i), '23:00', i % 2 ? '06:40' : '06:50', latency === undefined ? {} : {latencyMin: latency}));
  test('from the goal, the usual wake time and the usual time to fall asleep', () => {
    expect(tonight(sleepOf(week(15), GOAL), TODAY)).toEqual({kind: 'bedtime', bed: '23:00', wake: '06:45', wakeFrom: 'usual', goal: 450, latency: 15, nights: 6});
  });
  test('without typed times to fall asleep they are left out; a wake time typed for tomorrow wins', () => {
    expect(tonight(sleepOf(week(), GOAL), TODAY)).toMatchObject({bed: '23:15', latency: null});
    expect(tonight(sleepOf(week(10), GOAL), TODAY, '05:30')).toMatchObject({bed: '21:50', wake: '05:30', wakeFrom: 'typed'});
  });
  test('the bedtime window the person typed wins; no goal or too few nights teach', () => {
    expect(tonight(sleepOf(week(15), {...GOAL, bedFrom: '22:30', bedTo: '23:00'}), TODAY)).toEqual({kind: 'window', from: '22:30', to: '23:00', goal: 450});
    expect(tonight(sleepOf(week(15)), TODAY)).toEqual({kind: 'no-goal'});
    expect(tonight(sleepOf(week(15).slice(0, 3), GOAL), TODAY)).toEqual({kind: 'needs-wake', goal: 450, wakes: 3});
    expect(tonight(sleepOf(week(15).slice(0, 3), GOAL), TODAY, '07:00')).toMatchObject({kind: 'bedtime', bed: '23:15'});
  });
});

describe('#423: time asleep out of time in bed', () => {
  test('a night: asleep of in bed, an estimate unless both times were typed', () => {
    expect(efficiency(night(TODAY, '23:00', '06:40', {latencyMin: 20, awakeMin: 30}))).toEqual({asleep: 410, inBed: 460, percent: 89, estimated: false});
    expect(efficiency(night(TODAY, '23:00', '06:40', {latencyMin: 20}))).toMatchObject({percent: 96, estimated: true});
    expect(efficiency({...night(TODAY, '23:00', '06:40'), end: null})).toBeNull();
  });
  test('the week, on average a night', () => {
    const s = sleepOf([night(TODAY, '23:00', '07:00', {latencyMin: 30, awakeMin: 30}), night(addDays(TODAY, -1), '23:00', '07:00', {latencyMin: 0, awakeMin: 0})]);
    expect(efficiencyOf(dailySeries(s, TODAY, 7))).toEqual({asleep: 450, inBed: 480, percent: 94, estimated: false, nights: 2});
    expect(efficiencyOf(dailySeries(sleepOf([]), TODAY, 7))).toBeNull();
  });
});
