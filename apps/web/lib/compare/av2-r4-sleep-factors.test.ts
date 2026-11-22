import {describe, expect, test} from 'vitest';
import {createEmptyHealth, saveActivity, type HealthData} from '../health';
import {addWater} from '../health-daily';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {emptySleep, type Sleep} from '../sleep/schema';
import {saveNight} from '../sleep/engine';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {compare, daySample, dayFactorBasis, factorOptions, type CompareSources} from './engine';

/**
 * Session AV lane 2, round 4 (health; Pillow's trends beside caffeine and steps, LEDGER #332): three factors for the
 * night — caffeine that day above an amount, caffeine after a time, steps above an amount — under Compare's own rules
 * (90 days, 14 days a side, never a cause; unknown is never zero).
 */
const TODAY = '2026-11-20', UTC = 'UTC';
const local = (iso: string) => ({date: iso.slice(0, 10), hour: Number(iso.slice(11, 13))});
/** 40 days ending yesterday: on even days a 160 mg coffee at 16:00 and 11,000 steps, and a 6 h night; on odd days a 60 mg tea at 09:00, 4,000 steps and an 8 h night. */
function sources(n = 40): CompareSources {
  let health: HealthData = createEmptyHealth(), sleep: Sleep = emptySleep();
  const drinks: Record<string, {type: string; caffeineMg?: number}> = {};
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(TODAY, -n + i), even = i % 2 === 0, id = `health_drink-${String(i).padStart(4, '0')}`;
    health = addWater(health, {id, date: day, amountMilli: 250_000, unit: 'ml'}, `${day}T${even ? '16' : '09'}:05:00.000Z`);
    drinks[id] = even ? {type: 'coffee', caffeineMg: 160} : {type: 'tea', caffeineMg: 60};
    health = saveActivity(health, {id: `health_walk-${String(i).padStart(4, '0')}`, date: day, name: 'Walk', steps: even ? 11_000 : 4000, minutes: 30}, `${day}T20:00:00.000Z`);
    sleep = saveNight(sleep, {kind: 'night', start: instantAt(day, even ? '23:30' : '22:30', UTC), end: instantAt(addLocalDays(day, 1), even ? '05:30' : '06:30', UTC), timeZone: UTC}, new Date('2026-12-31T00:00:00Z'));
  }
  return {health: {...health, schemaVersion: 4, sleep} as unknown as HealthData, drinks, localTime: local};
}
const forbidden = (s: string) => FORBIDDEN_INSIGHT_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(s));

describe('caffeine and steps as factors for the night (LEDGER #332)', () => {
  test('offered only when the records hold caffeine or steps', () => {
    expect(factorOptions({}, TODAY).map(f => f.id)).toEqual([]);
    expect(factorOptions(sources(), TODAY).map(f => f.id)).toEqual(expect.arrayContaining(['caffeine', 'caffeine-late', 'steps']));
    const plain = sources(); plain.drinks = {};
    expect(factorOptions(plain, TODAY).map(f => f.id)).not.toContain('caffeine');
  });
  test('the usual amounts: the middle day, rounded; 14:00 for the hour', () => {
    expect(dayFactorBasis(sources(), TODAY)).toEqual({caffeineMg: 60, steps: 4000, hour: 14});
  });
  test('caffeine above 100 mg and the following night: counts, a sentence, never a cause', () => {
    const r = compare(sources(), 'caffeine', 'sleep', 'same', TODAY, 100)!;
    expect(r).toMatchObject({state: 'ready', withDays: 20, withoutDays: 20, withValue: 360, withoutValue: 480});
    expect(r.sentence).toBe('On days with over 100 mg of caffeine logged, you slept 6 h that night on average; on other days, 8 h.');
    expect(forbidden(r.sentence!)).toEqual([]);
    expect(r.why).toContain('not proof that one brings the other');
    expect(r.confounder).toContain('busy or tiring days');
  });
  test('caffeine after 14:00 uses the hour each drink was logged', () => {
    const r = compare(sources(), 'caffeine-late', 'sleep', 'same', TODAY, 14)!;
    expect(r).toMatchObject({withDays: 20, withoutDays: 20, withValue: 360, withoutValue: 480});
    expect(r.sentence).toContain('On days with caffeine logged after 14:00');
    // After 17:00 nothing qualifies: every day is "without".
    expect(compare(sources(), 'caffeine-late', 'sleep', 'same', TODAY, 17)).toMatchObject({withDays: 0, withoutDays: 40, state: 'pending'});
  });
  test('steps above 8,000 and the night after', () => {
    const r = compare(sources(), 'steps', 'sleep', 'same', TODAY, 8000)!;
    expect(r).toMatchObject({withDays: 20, withoutDays: 20, withValue: 360, withoutValue: 480});
    expect(r.sentence).toContain('On days you walked over 8,000 steps');
    expect(r.confounder).toContain('weekends');
  });
  test('unknown is never zero: a coffee without an amount, a drink logged later, a day with nothing logged', () => {
    const s = sources(), first = addLocalDays(TODAY, -40);
    const ids = Object.keys(s.drinks!);
    s.drinks = {...s.drinks, [ids[0]!]: {type: 'coffee'}}; // day 0: coffee, amount unknown
    const day = (id: string) => daySample(s, id, 'sleep', 'same', TODAY, first, first, id === 'caffeine' ? 100 : 14)!.days[0]!.a;
    expect(day('caffeine')).toBeNull();
    expect(day('caffeine-late')).toBeNull();
    // A tea logged on the next day for day 1 has no known hour: the hour test leaves that day out, the amount test still reads it.
    const later = sources(); later.localTime = iso => ({date: addLocalDays(iso.slice(0, 10), 1), hour: 9});
    const d1 = addLocalDays(first, 1);
    expect(daySample(later, 'caffeine-late', 'sleep', 'same', TODAY, d1, d1, 14)!.days[0]!.a).toBeNull();
    expect(daySample(later, 'caffeine', 'sleep', 'same', TODAY, d1, d1, 100)!.days[0]!.a).toBe(false);
    // Today is still open for steps; a day before the log began has nothing logged.
    expect(daySample(s, 'steps', 'sleep', 'same', TODAY, TODAY, TODAY, 8000)!.days[0]!.a).toBeNull();
    expect(daySample(s, 'caffeine', 'sleep', 'same', TODAY, addLocalDays(first, -1), addLocalDays(first, -1), 100)!.days[0]!.a).toBeNull();
  });
  test('plain water only: caffeine "without", never unknown', () => {
    const s = sources(), first = addLocalDays(TODAY, -40), id = Object.keys(s.drinks!)[0]!;
    s.drinks = {...s.drinks, [id]: {type: 'water'}};
    expect(daySample(s, 'caffeine-late', 'sleep', 'same', TODAY, first, first, 14)!.days[0]!.a).toBe(false);
    const none = {...s.drinks}; delete none[id]; s.drinks = none;
    expect(daySample(s, 'caffeine', 'sleep', 'same', TODAY, first, first, 100)!.days[0]!.a).toBe(false);
  });
  // Session AV lane 2 (review B4E-14): a day with only minutes logged has no step count: unknown, never 0 steps.
  test('a minutes-only activity day is unknown for steps', () => {
    const s = sources(), day = addLocalDays(TODAY, -45);
    s.health = {...s.health!, activity: [...s.health!.activity, {id: 'health_yoga-00000001', date: day, name: 'Yoga', steps: 0, minutes: 30, createdAt: `${day}T08:00:00.000Z`, updatedAt: `${day}T08:00:00.000Z`}]} as HealthData;
    expect(daySample(s, 'steps', 'sleep', 'same', TODAY, day, day, 8000)!.days[0]!.a).toBeNull();
    expect(daySample(s, 'steps', 'sleep', 'same', TODAY, addLocalDays(TODAY, -40), addLocalDays(TODAY, -40), 8000)!.days[0]!.a).toBe(true);
  });
});

