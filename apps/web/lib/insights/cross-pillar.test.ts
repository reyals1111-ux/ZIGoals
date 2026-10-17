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
import {buildShowcase} from '../showcase-data';
import {habitDataSchema, HABITS_KEY} from '../habits';
import {healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {insightCards} from './engine';
import {EARLIER_FIRST, EARLIER_HABIT_ID, EARLIER_LAST} from './showcase';

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
  test('the Showcase (Part 8; Session AD item 13): three pairings pass 14 days a side from its earlier season, "Sleep and habits" among them; the 60-day insights and the last 30 days are unchanged', () => {
    process.env.TZ = UTC;
    const day = '2026-10-12', {records} = buildShowcase(day, UTC);
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
    const {ready, pending} = crossPillarInsights({habits, health, today: day});
    expect(ready.map(i => [i.id, i.withA.days, i.withoutA.days])).toEqual([['steps-sleep', 24, 31], ['water-sleep', 29, 27], ['sleep-habits', 19, 37]]);
    for (const i of ready.filter(i => i.id !== 'sleep-habits')) expect(i.sentence).toMatch(/^On days you (walked at least 8,000 steps|logged water), you slept \d+ h( \d+ min)? that night on average; on (other days|days without), \d+ h( \d+ min)?\.$/);
    // Sleep and habits (Session AD item 13): ready, each side at least 14 days, a modest difference said as a pairing.
    const sleepHabits = ready.find(i => i.id === 'sleep-habits')!;
    expect(sleepHabits.withA.days).toBeGreaterThanOrEqual(CROSS_MIN_PER_SIDE); expect(sleepHabits.withoutA.days).toBeGreaterThanOrEqual(CROSS_MIN_PER_SIDE);
    expect(sleepHabits.sentence).toBe('On days after a night of at least 8 h of sleep, you completed 95% of your scheduled habits; after shorter nights, 90%.');
    // Water and habits passes too (32 and 28 days, 91% and 93%), the weakest of four, so the card's three leave it out.
    expect(pending).toEqual([]);
    const all = crossPillarInsights({habits, health, today: day, max: 4}).ready.find(i => i.id === 'water-habits')!;
    expect([all.withA.days, all.withoutA.days, all.sentence]).toEqual([32, 28, 'On days you logged water, you completed 91% of your scheduled habits; on days without, 93%.']);
    // The season's one habit: 30 days within the season, archived since the day after it.
    const stretch = habits.habits.find(h => h.id === EARLIER_HABIT_ID)!;
    expect(stretch.entries.map(e => e.date)).toEqual(Array.from({length: 30}, (_, k) => addLocalDays(day, EARLIER_FIRST + k)));
    expect(stretch.rules.map(r => [r.from, r.state])).toEqual([[addLocalDays(day, EARLIER_FIRST), 'active'], [addLocalDays(day, EARLIER_LAST + 1), 'archived']]);
    // The earlier season ends 60 days back: nothing in the older insights' 60-day window comes from it.
    const earlier = [...health.activity.filter(a => a.id.includes('earlier')).map(a => a.date), ...(health.daily?.water ?? []).filter(w => w.id.includes('earlier')).map(w => w.date), ...(health.sleep?.nights ?? []).filter(n => n.id.includes('earlier')).map(n => n.end!.slice(0, 10))];
    expect(earlier.length).toBe(30 + 20 + 29);
    expect(earlier.every(d => d >= addLocalDays(day, EARLIER_FIRST) && d <= addLocalDays(day, EARLIER_LAST))).toBe(true);
    const without = {...health, activity: health.activity.filter(a => !a.id.includes('earlier')), daily: {...health.daily!, water: health.daily!.water.filter(w => !w.id.includes('earlier'))}, sleep: {...health.sleep!, nights: health.sleep!.nights.filter(n => !n.id.includes('earlier'))}};
    expect(insightCards({habits, health, today: day})).toEqual(insightCards({habits: {...habits, habits: habits.habits.filter(h => h.id !== EARLIER_HABIT_ID)}, health: without, today: day}));
  });
  test('water and sleep: the night after a day with water against the night after a day without', () => {
    process.env.TZ = UTC;
    const {habits, health} = records(40);
    const start = addLocalDays(TODAY, -39);
    health.daily = {version: 1, favorites: [], savedMeals: [], plans: [], waterOperations: [], copyOperations: [], groceryNotes: '', preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg'},
      water: Array.from({length: 40}, (_, i) => ({id: `health_water-${String(i).padStart(3, '0')}`, date: addLocalDays(start, i), amountMilli: 250_000, unit: 'ml' as const, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z'})).filter((_, i) => i % 2 === 1)};
    const insight = crossPillarInsights({habits, health, today: TODAY}).ready.find(i => i.id === 'water-sleep')!;
    // Water on odd days; the night after an odd day ends on an even day (8 h), the night after an even day is 6 h. Today's
    // night has not ended (19 days with water), and the day before the records has no water but its night is known (8 h).
    expect(insight).toMatchObject({withA: {days: 19, value: 480}, withoutA: {days: 21, value: (20 * 360 + 480) / 21}, unit: 'min'});
    expect(insight.sentence).toBe('On days you logged water, you slept 8 h that night on average; on days without, 6 h 6 min.');
  });
  test('hours read as people say them', () => {
    expect(hoursMinutes(420)).toBe('7 h');
    expect(hoursMinutes(437.4)).toBe('7 h 17 min');
    expect(hoursMinutes(45)).toBe('45 min');
  });
});
