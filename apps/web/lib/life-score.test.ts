import {expect, test} from 'vitest';
import {buildShowcase} from './showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue} from './habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from './health';
import {PLATFORM_KEY, emptyPlatform, platformSchema} from './positions';
import {addLocalDays} from './local-date';
import {lifeScore, lifeScoreWords} from './life-score';
import type {UniverseInput} from './universe/model';

// Session AJ (item 29, D10): the Life Score, from the person's own last two weeks; missing pillars are left out.
const TODAY = '2026-10-19', ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
const at = (day: string, clock = '09:00') => new Date(`${day}T${clock}:00.000Z`);
const input = (over: Partial<UniverseInput> = {}): UniverseInput => ({habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), fasting: null, averages: [], today: TODAY, ...over});

test('nothing recorded: no score at all (never a zero)', () => expect(lifeScore(input())).toBeNull());
test('one daily habit done on 10 of the last 14 ended days: Habits 71, the only pillar; the others are left out', () => {
  let h = createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning'} as never, at(addLocalDays(TODAY, -30)), ID);
  for (let back = 1; back <= 10; back++) h = logHabitValue(h, ID, addLocalDays(TODAY, -back), 1, {}, at(TODAY, '20:00'));
  const s = lifeScore(input({habits: h}))!;
  expect(s.pillars.map(p => p.pillar)).toEqual(['habits']);
  expect(s.left).toEqual(['health', 'goals', 'wealth']);
  expect(s.pillars[0]!.score).toBe(71);
  expect(s.pillars[0]!.why).toBe('10 habit days done and 4 missed in the last 14 days.');
  expect(s.score).toBe(71);
  expect(s.words).toBe('A steady rhythm. Keep going at your own pace.');
});
test('the Showcase: a score from every pillar it keeps, each with its Why?, in kind words', () => {
  const {records} = buildShowcase(TODAY);
  const s = lifeScore(input({habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform: platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!))}))!;
  expect(s.score).toBeGreaterThanOrEqual(0); expect(s.score).toBeLessThanOrEqual(100);
  expect(s.pillars.length).toBeGreaterThanOrEqual(3);
  for (const p of s.pillars) { expect(p.why.length).toBeGreaterThan(10); expect(p.score).toBeGreaterThanOrEqual(0); expect(p.score).toBeLessThanOrEqual(100); }
  expect(s.score).toBe(Math.round(s.pillars.reduce((t, p) => t + p.score, 0) / s.pillars.length));
});
test('the words are kind at every level and never compare', () => {
  for (const n of [0, 10, 30, 60, 90, 100]) expect(lifeScoreWords(n)).not.toMatch(/\b(bad|poor|fail|worse|than others|average person)\b/i);
});
