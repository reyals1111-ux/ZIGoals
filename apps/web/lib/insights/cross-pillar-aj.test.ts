import {afterEach, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {emptySleep, type Sleep} from '../sleep/schema';
import {saveNight} from '../sleep/engine';
import {FORBIDDEN_INSIGHT_WORDS} from './engine';
import {confidenceOf, crossPillarInsights, probabilityOfSuperiority, whyText} from './cross-pillar';

// Session AJ (item 10, D14; COMPANIONS.md P3): honest confidence and eight more pairings.
const TODAY = '2026-10-31', UTC = 'UTC', HABIT = '92000000-0000-4000-8000-000000000501';
const zone = process.env.TZ;
afterEach(() => { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; });
const INPUT: HabitInput = {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
/** `n` days: a night ending each day (8 h when `long(i)`, else 6 h); energy 4 after long nights and 2 after short ones. */
function records(n: number, long: (i: number) => boolean, energyAfter: (l: boolean) => number = l => (l ? 4 : 2)) {
  const start = addLocalDays(TODAY, 1 - n);
  let habits: HabitData = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT), sleep: Sleep = emptySleep();
  const energy: Record<string, {energy: number}> = {};
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(start, i), l = long(i);
    sleep = saveNight(sleep, {kind: 'night', start: l ? instantAt(addLocalDays(day, -1), '22:00', UTC) : instantAt(day, '00:00', UTC), end: instantAt(day, '06:00', UTC), timeZone: UTC}, new Date('2026-11-30T00:00:00Z'));
    energy[day] = {energy: energyAfter(l)};
    if (energyAfter(l) >= 4) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
  }
  return {habits, health: {...createEmptyHealth(), sleep} as HealthData, energy: {days: energy}};
}
describe('confidence', () => {
  test('the probability of superiority counts pairs, ties as half', () => {
    expect(probabilityOfSuperiority([3, 4], [1, 2])).toBe(1);
    expect(probabilityOfSuperiority([2], [2])).toBe(0.5);
    expect(probabilityOfSuperiority([1, 3], [2])).toBe(0.5);
    expect(probabilityOfSuperiority([], [1])).toBe(0.5);
  });
  test('below the gap or with a probability near ½: no label; 14 a side: early; 28 a side and both halves agree: consistent', () => {
    const mid = '2026-09-17', sample = (n: number, gapA: number) => Array.from({length: n}, (_, i) => ({date: addLocalDays('2026-08-03', i), a: i % 2 === 0, value: i % 2 === 0 ? 3 + gapA : 3}));
    expect(confidenceOf(sample(28, 0.3), 0.4, mid).label).toBeNull();
    expect(confidenceOf(sample(28, 0.5), 0.4, mid).label).toBe('early');
    expect(confidenceOf(sample(90, 0.5), 0.4, mid).label).toBe('consistent');
    // The same overall gap, but the second half goes the other way: never consistent.
    const flipped = sample(90, 0.5).map((s, i) => i >= 45 ? {...s, value: s.a ? 3 : 3.3} : {...s, value: s.a ? 4.2 : 3});
    expect(confidenceOf(flipped, 0.4, mid).label).toBe('early');
  });
});
describe('Session AJ pairings', () => {
  test('sleep and energy: consistent over 90 days, said as a pairing, with its Why', () => {
    process.env.TZ = UTC;
    const {habits, health, energy} = records(90, i => i % 2 === 0);
    const {ready} = crossPillarInsights({habits, health, today: TODAY, energy, max: 20});
    const i = ready.find(r => r.id === 'sleep-energy')!;
    expect(i).toMatchObject({label: 'consistent', withA: {days: 45, value: 4}, withoutA: {days: 45, value: 2}});
    expect(i.sentence).toBe('After nights of at least 7 h of sleep, your morning energy averaged 4.0 of 5; after shorter nights, 2.0.');
    expect(whyText(i)).toContain('Label: Consistent. Seen across at least 28 days on each side, and in both halves of the period.');
    expect(whyText(i)).toContain('a busy week can shorten nights and lower energy at the same time');
    const energyHabits = ready.find(r => r.id === 'energy-habits')!;
    expect(energyHabits.sentence).toBe('On days you started with energy of 4 or 5, you completed 100% of your scheduled habits; on other days, 0%.');
    for (const r of ready) for (const text of [r.sentence, whyText(r)]) expect(FORBIDDEN_INSIGHT_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(text))).toEqual([]);
    // Consistent ones come first.
    expect(ready.findIndex(r => r.label === 'early')).not.toBe(0);
  });
  test('a difference below the gap is "no clear difference so far", never on the ready list', () => {
    process.env.TZ = UTC;
    const {habits, health, energy} = records(90, i => i % 2 === 0, l => (l ? 3 : 3));
    const r = crossPillarInsights({habits, health, today: TODAY, energy, max: 20});
    expect(r.ready.map(i => i.id)).not.toContain('sleep-energy');
    expect(r.unclear.map(i => i.id)).toContain('sleep-energy');
  });
  test('workouts: that night\'s sleep and the next day\'s energy; no workouts kept, not listed at all', () => {
    process.env.TZ = UTC;
    const {habits, health, energy} = records(90, i => i % 2 === 0, l => (l ? 4 : 2));
    // A workout on each day before a long night (the night that ends the next day is long when i + 1 is even).
    const workouts = {workouts: Array.from({length: 90}, (_, i) => i).filter(i => (i + 1) % 2 === 0).map(i => ({startedAt: `${addLocalDays(addLocalDays(TODAY, -89), i)}T17:00:00.000Z`}))};
    const r = crossPillarInsights({habits, health, today: TODAY, energy, workouts, max: 20});
    expect(r.ready.find(i => i.id === 'workout-sleep')?.sentence).toBe('On days with a workout, you slept 8 h that night on average; on other days, 6 h.');
    expect(r.ready.find(i => i.id === 'workout-energy')?.sentence).toBe('The day after a workout, your energy averaged 4.0 of 5; after other days, 2.0.');
    const none = crossPillarInsights({habits, health, today: TODAY, energy, max: 20});
    expect([...none.ready, ...none.pending, ...none.unclear].map(i => i.id).filter(id => id.startsWith('workout-'))).toEqual([]);
  });
  test('no energy kept: the energy pairings are not listed, not even as collecting', () => {
    process.env.TZ = UTC;
    const {habits, health} = records(90, i => i % 2 === 0);
    const r = crossPillarInsights({habits, health, today: TODAY, max: 20});
    expect([...r.ready, ...r.pending, ...r.unclear].map(i => i.id).filter(id => /energy/.test(id))).toEqual([]);
  });
});
