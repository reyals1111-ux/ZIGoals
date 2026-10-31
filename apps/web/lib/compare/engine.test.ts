import {afterEach, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {setDisplayLocale} from '../visual-format';
import {instantAt} from '../zone-time';
import {emptySleep, type Sleep} from '../sleep/schema';
import {saveNight} from '../sleep/engine';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {CROSS_MIN_PER_SIDE} from '../insights/cross-pillar';
import {compare, factorOptions, outcomeOptions, outcomeText, spendBasis, type CompareSources} from './engine';
import {COMPARE_PAIR, comparePairSchema} from './schema';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';

const TODAY = '2026-10-31', UTC = 'UTC', HABIT = '92000000-0000-4000-8000-000000000501';
afterEach(() => setDisplayLocale('en-US'));
const INPUT: HabitInput = {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const forbidden = (s: string) => FORBIDDEN_INSIGHT_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(s));

/** `n` days ending yesterday: "Walk" done on even days; mood 5 on even days, 2 on odd; energy the reverse the day after. */
function sources(n: number, opts: {moodNoise?: boolean} = {}): CompareSources {
  const start = addLocalDays(TODAY, -n);
  let habits: HabitData = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  const moods: Record<string, {mood: number; at: string}> = {}, energy: Record<string, {energy: number}> = {};
  let sleep: Sleep = emptySleep();
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(start, i), even = i % 2 === 0;
    if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
    moods[day] = {mood: opts.moodNoise ? (i % 4 < 2 ? 4 : 3) : even ? 5 : 2, at: `${day}T21:00:00.000Z`};
    energy[addLocalDays(day, 1)] = {energy: even ? 4 : 2};
    sleep = saveNight(sleep, {kind: 'night', start: instantAt(addLocalDays(day, -1), '23:00', UTC), end: instantAt(day, even ? '07:00' : '05:00', UTC), timeZone: UTC, ...(even ? {tags: ['late meal']} : {})}, new Date('2026-12-01T00:00:00Z'));
  }
  const health = {...createEmptyHealth(), schemaVersion: 4, sleep, moods: {version: 1, days: moods}} as unknown as HealthData;
  return {habits, health, energy: {days: energy}};
}

describe('compare: "Does one thing go with another?" (Session AK lane S, item 2)', () => {
  test('offers only the factors and outcomes the person keeps', () => {
    expect(factorOptions({}, TODAY)).toEqual([]);
    expect(outcomeOptions({})).toEqual([]);
    const src = sources(40);
    expect(factorOptions(src, TODAY).map(f => f.id)).toEqual([`habit:${HABIT}`, 'sleep-tag:late meal']);
    expect(outcomeOptions(src).map(o => o.id)).toEqual(['mood', 'energy', 'sleep', 'habits']);
  });
  test('a habit and the same-day mood: counts, label, a sentence without causal words', () => {
    const r = compare(sources(40), `habit:${HABIT}`, 'mood', 'same', TODAY)!;
    expect(r).toMatchObject({state: 'ready', withDays: 20, withoutDays: 20, withValue: 5, withoutValue: 2, label: 'early', counts: '20 days with, 20 without'});
    expect(r.sentence).toBe('On days you completed “Walk”, your mood that day averaged 5.0 of 5; on other days, 2.0 of 5.');
    expect(forbidden(r.sentence!)).toEqual([]);
    expect(forbidden(r.why)).toEqual([]);
    expect(r.why).toContain('not proof that one brings the other');
    expect(r.why).toContain(r.confounder);
  });
  test('next-day lag pairs each day with the day after it', () => {
    const r = compare(sources(40), `habit:${HABIT}`, 'energy', 'next', TODAY)!;
    expect(r).toMatchObject({state: 'ready', withValue: 4, withoutValue: 2});
    expect(r.sentence).toContain('your energy the next day averaged 4.0 of 5');
    expect(r.why).toContain('each day with the day after it');
  });
  test('28 days a side and both halves agree: consistent', () => {
    const r = compare(sources(89), `habit:${HABIT}`, 'mood', 'same', TODAY)!;
    expect(r.withDays).toBeGreaterThanOrEqual(28);
    expect(r.label).toBe('consistent');
  });
  test('below 14 days a side: pending, and no averages are shown', () => {
    const r = compare(sources(20), `habit:${HABIT}`, 'mood', 'same', TODAY)!;
    expect(r).toMatchObject({state: 'pending', withDays: 10, withoutDays: 10, need: CROSS_MIN_PER_SIDE, withValue: null, withoutValue: null, sentence: null});
  });
  test('a small difference is "unclear", never a finding', () => {
    const r = compare(sources(40, {moodNoise: true}), `habit:${HABIT}`, 'mood', 'same', TODAY)!;
    expect(r.state).toBe('unclear');
    expect(r.sentence).toBeNull();
  });
  test('a sleep tag and that night\'s sleep; days without a logged night are left out, not counted as without', () => {
    const src = sources(40), r = compare(src, 'sleep-tag:late meal', 'sleep', 'same', TODAY)!;
    // The night after each day: tagged nights end even days, so the following night (odd) is 6 h.
    expect(r.state).toBe('ready');
    expect(r.withValue).toBe(360);
    expect(r.withoutValue).toBe(480);
    expect(r.sentence).toBe('On days after a night you tagged “late meal”, you slept 6 h that night on average; on other days, 8 h.');
  });
  test('an unknown or removed factor gives null', () => {
    expect(compare(sources(40), 'habit:gone', 'mood', 'same', TODAY)).toBeNull();
    expect(compare(sources(40), 'workout', 'mood', 'same', TODAY)).toBeNull();
  });
  test('spending: only days with something in the money log count; the amount defaults to the usual day', () => {
    const base = sources(40), start = addLocalDays(TODAY, -40);
    const entries = Array.from({length: 40}, (_, i) => ({kind: 'expense', amount: i % 2 === 0 ? '50.00' : '5.00', currency: 'EUR', date: addLocalDays(start, i)}));
    const src = {...base, money: {entries: [...entries, {kind: 'expense', amount: '1.00', currency: 'USD', date: TODAY}]}};
    expect(spendBasis(src, TODAY)).toEqual({currency: 'EUR', usual: 5});
    const r = compare(src, 'spend', 'mood', 'same', TODAY)!;
    expect(r).toMatchObject({withDays: 20, withoutDays: 20, withValue: 5, withoutValue: 2});
    expect(r.sentence).toContain('On days you spent above 5 EUR');
    const high = compare(src, 'spend', 'mood', 'same', TODAY, 100)!;
    expect(high.withDays).toBe(0);
    expect(high.state).toBe('pending');
  });
  test('workouts, fasting and journal tags become factors from their own records', () => {
    const base = sources(40), start = addLocalDays(TODAY, -40);
    const src: CompareSources = {...base,
      workouts: {workouts: [{startedAt: `${start}T08:00:00.000Z`}]},
      fasting: {sessions: [{id: 'f1', endedAt: `${start}T12:00:00.000Z`, timeZone: UTC}, {id: 'f2', endedAt: null, timeZone: UTC}]},
      journal: {entries: [{date: start, tags: ['work']}, {date: addLocalDays(start, 1)}]},
      localTime: iso => ({date: iso.slice(0, 10), hour: Number(iso.slice(11, 13))})};
    expect(factorOptions(src, TODAY).map(f => f.id)).toEqual([`habit:${HABIT}`, 'sleep-tag:late meal', 'journal-tag:work', 'workout', 'fasting']);
    expect(compare(src, 'journal-tag:work', 'mood', 'same', TODAY)).toMatchObject({withDays: 1, withoutDays: 1, state: 'pending'});
    // Days before the first workout are unknown; from then on every day with a mood counts.
    expect(compare(src, 'workout', 'mood', 'same', TODAY)).toMatchObject({withDays: 1, withoutDays: 39});
  });
  test('outcome values in their own words', () => {
    expect(outcomeText('mood', 3.84)).toBe('3.8 of 5');
    expect(outcomeText('sleep', 445)).toBe('7 h 25 min');
    expect(outcomeText('habits', 0.637)).toBe('64%');
    expect(outcomeText('steps', 8210.4)).toBe('8,210');
  });
});

describe('the last chosen pair (zigoals:compare-pair:v1)', () => {
  const store = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)}; };
  test('reads empty, keeps a choice, refuses nonsense without rewriting it', () => {
    const s = store();
    expect(readDeviceRecord(s, COMPARE_PAIR)).toEqual({data: {version: 1}, unreadable: false});
    updateDeviceRecord(s, COMPARE_PAIR, c => ({...c, factor: 'workout', outcome: 'mood', lag: 'next' as const}));
    expect(readDeviceRecord(s, COMPARE_PAIR).data).toEqual({version: 1, factor: 'workout', outcome: 'mood', lag: 'next'});
    expect(comparePairSchema.safeParse({version: 1, lag: 'later'}).success).toBe(false);
    expect(comparePairSchema.safeParse({version: 1, factor: 'x'.repeat(121)}).success).toBe(false);
    expect(comparePairSchema.safeParse({version: 1, future: true}).success).toBe(true);
  });
});
