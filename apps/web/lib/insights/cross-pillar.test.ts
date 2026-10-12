import {afterEach, describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {setDisplayLocale} from '../visual-format';
import {instantAt} from '../zone-time';
import {emptySleep, type Sleep} from '../sleep/schema';
import {saveNight} from '../sleep/engine';
import {FORBIDDEN_INSIGHT_WORDS} from './engine';
import {CROSS_MIN_PER_SIDE, crossPillarInsights, habitShare, hoursMinutes} from './cross-pillar';

const TODAY = '2026-10-31', UTC = 'UTC', HABIT = '92000000-0000-4000-8000-000000000401';
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; setDisplayLocale('en-US'); });
const INPUT: HabitInput = {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};

/** `n` days back from TODAY: a night ending each day (8 h on even days, 6 h on odd), "Read" done on even days only. */
function records(n: number): {habits: HabitData; health: HealthData} {
  const start = addLocalDays(TODAY, 1 - n);
  let habits = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  let sleep: Sleep = emptySleep();
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(start, i), even = i % 2 === 0;
    sleep = saveNight(sleep, {kind: 'night', start: even ? instantAt(addLocalDays(day, -1), '22:00', UTC) : instantAt(day, '00:00', UTC), end: instantAt(day, '06:00', UTC), timeZone: UTC}, new Date('2026-11-30T00:00:00Z'));
    if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
  }
  return {habits, health: {...createEmptyHealth(), sleep}};
}

describe('crossPillarInsights (Session AA-Cloud Part 5)', () => {
  test('sleep and habits: each side has at least 14 days, and the sentence says what happened together', () => {
    process.env.TZ = UTC;
    const {habits, health} = records(40);
    expect(habitShare(habits, TODAY, TODAY)).toBe(0);
    const {ready} = crossPillarInsights({habits, health, today: TODAY});
    const sleepHabits = ready.find(i => i.id === 'sleep-habits')!;
    expect(sleepHabits).toMatchObject({withA: {days: 20, value: 1}, withoutA: {days: 20, value: 0}, unit: '%'});
    expect(sleepHabits.sentence).toBe('On days after a night of at least 7 h of sleep, you completed 100% of your scheduled habits; after shorter nights, 0%.');
    for (const insight of ready) expect(FORBIDDEN_INSIGHT_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(insight.sentence))).toEqual([]);
  });
  test('below 14 days a side: not ready, with the days it has so far', () => {
    process.env.TZ = UTC;
    const {habits, health} = records(20);
    const {ready, pending} = crossPillarInsights({habits, health, today: TODAY});
    expect(ready.find(i => i.id === 'sleep-habits')).toBeUndefined();
    expect(pending.find(p => p.id === 'sleep-habits')).toEqual({id: 'sleep-habits', title: 'Sleep and habits', withA: 10, withoutA: 10, need: CROSS_MIN_PER_SIDE});
  });
  test('nothing recorded: nothing ready, never a zero dressed as a finding', () => {
    const {ready, pending} = crossPillarInsights({habits: emptyHabitData(), health: createEmptyHealth(), today: TODAY});
    expect(ready).toEqual([]);
    expect(pending.every(p => p.withA === 0 && p.withoutA === 0)).toBe(true);
  });
  test('hours read as people say them', () => {
    expect(hoursMinutes(420)).toBe('7 h');
    expect(hoursMinutes(437.4)).toBe('7 h 17 min');
    expect(hoursMinutes(45)).toBe('45 min');
  });
});
