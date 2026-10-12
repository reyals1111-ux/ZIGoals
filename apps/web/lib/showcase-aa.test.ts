import {expect, test} from 'vitest';
import {buildShowcase} from './showcase-data';
import {migratePlatform} from './positions';
import {habitDataSchema} from './habits';
import {healthSchema} from './health';
import {gameSchema} from './game/schema';
import {xpSummary} from './game/xp';
import {coachCheckIn} from './health-aa/coach';
import {healthCoachSchema} from './health-aa/coach-schema';
import {habitExtrasSchema} from './habits-extras/schema';
import {GAME_KEY, HABIT_EXTRAS_KEY, HEALTH_COACH_KEY, MACRO_MODE_KEY, MEASUREMENTS_CUSTOM_KEY, MICRO_TARGETS_KEY, REMINDERS_PLAN_KEY} from './aa-device-keys';
import {FASTING_KEY} from './fasting/schema';
import {runningSession} from './fasting/engine';
import {fastingSchema} from './fasting/schema';

/** Session AA-Local Part 7: every feature of this session has believable fictional data in the Showcase (ADR-022). */
const DAY = '2026-09-20';
test('the Showcase fills Habits, Health, the game layer and the device records of Session AA-Local', () => {
  const {records} = buildShowcase(DAY, 'UTC');
  const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)), health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!));
  // Habits: sections, a month of history, a skip with a reason, a mood, the quit habit with slips, the routine stack, a running timer on Read.
  expect(new Set(habits.habits.map(h => h.timeOfDay))).toEqual(new Set(['morning', 'afternoon', 'evening', 'anytime']));
  const read = habits.habits.find(h => h.title === 'Read')!;
  expect(read.entries.length).toBeGreaterThanOrEqual(30); expect(read.timer?.state).toBe('paused');
  expect(habits.habits.find(h => h.title === 'Meditate')!.entries.some(e => e.mood === 'calm')).toBe(true);
  const quit = habits.habits.find(h => h.title === 'Late-night snacks (Showcase)')!;
  expect(quit.rules[0]!.type).toBe('quit'); expect(quit.entries).toHaveLength(30); expect(quit.entries.filter(e => e.disposition === 'skipped')).toHaveLength(4); expect(quit.entries.filter(e => e.disposition === 'failed')).toHaveLength(4);
  expect(quit.entries.some(e => e.disposition === 'skipped' && e.note === 'Skipped · travelling')).toBe(true);
  expect(JSON.stringify(buildShowcase(DAY, 'UTC').records)).toBe(JSON.stringify(records)); // deterministic
  const extras = habitExtrasSchema.parse(JSON.parse(records[HABIT_EXTRAS_KEY]!));
  expect(extras.quitCost?.[quit.id]).toEqual({perDay: 3, currency: 'EUR'}); expect(extras.areas?.[read.id]).toBe('learning');
  // Health: six weeks of weights, micronutrients, the recipes, a planned week with a grocery list, waist readings, no fast running.
  expect(health.weights.length).toBeGreaterThanOrEqual(6); // the Showcase's own eight readings feed the trend and the energy estimate
  expect(health.foods.find(f => f.id === 'health_food-0000')!.nutrients.fiberMg).toBe(7000);
  expect(health.recipes.map(r => r.name)).toEqual(expect.arrayContaining(['Showcase pea soup', 'Showcase hummus (imported from pasted text)']));
  expect(health.foods.find(f => f.id === 'health_food-aa-imp-tahini')!.nutrients.kcal).toBeNull();
  expect(health.daily!.plans.filter(p => !p.loggedAt)).toHaveLength(5);
  expect((health.measurements ?? []).filter(m => m.kind === 'waist').length).toBeGreaterThanOrEqual(6);
  expect(runningSession(fastingSchema.parse(JSON.parse(records[FASTING_KEY] ?? JSON.stringify({version: 1, sessions: []}))))).toBeUndefined();
  // The game layer: on, level 7 or above from the records alone, nothing pending on load (B42).
  const game = gameSchema.parse(JSON.parse(records[GAME_KEY]!));
  // Since the merge (ADR-022 B53) the platform record counts too (AA-Cloud's Showcase has more goal history), exactly as the Showcase's own game record is derived.
  const xp = xpSummary({habits, health, platform: migratePlatform(JSON.parse(records['zigoals:platform:v1']!))}, DAY);
  expect(game.enabled).toBe(true); expect(xp.level.level).toBeGreaterThanOrEqual(7); expect(game.levelSeen).toBe(xp.level.level);
  // The coach is due this week; the other device records parse and carry their values.
  expect(coachCheckIn(health, healthCoachSchema.parse(JSON.parse(records[HEALTH_COACH_KEY]!)), DAY).answered).toBeNull();
  for (const k of [HEALTH_COACH_KEY, MICRO_TARGETS_KEY, MACRO_MODE_KEY, MEASUREMENTS_CUSTOM_KEY, REMINDERS_PLAN_KEY]) expect(JSON.parse(records[k]!).version).toBe(1);
  expect(JSON.parse(records[MICRO_TARGETS_KEY]!).targets.ironMg).toBe(14);
  expect(JSON.parse(records[REMINDERS_PLAN_KEY]!).items.bedtime).toEqual({on: true, time: '22:30'});
});
